import { serve } from '@hono/node-server'
import { Context, Hono, HonoRequest } from 'hono'

const app = new Hono()

const host = process.env.TEST_API_HOST ?? '127.0.0.1'
const port = Number(process.env.TEST_API_PORT ?? 3000)
const frontendReturnUrl = process.env.TEST_APP_RETURN_URL ?? 'http://127.0.0.1:5173/'
const frontendOrigin = new URL(frontendReturnUrl).origin
const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID ?? ''
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''
const googlePopupMessageSource = 'rpg-web-nexus-google-oauth'

type GoogleTokenResponse = {
  access_token?: string
  expires_in?: number
  id_token?: string
  refresh_token?: string
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
  error_uri?: string
}

function buildJsonHeaders(origin = frontendOrigin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'content-type,x-requested-with',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-credentials': 'false',
    'content-type': 'application/json',
    vary: 'Origin',
  }
}

type JsonHeaders = ReturnType<typeof buildJsonHeaders>

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function buildPopupCallbackHtml(
  body: {
    code?: string
    error?: string
    errorDescription?: string
    errorUri?: string
    state?: string
  },
  origin: string
) {
  const payload = {
    source: googlePopupMessageSource,
    code: body.code,
    state: body.state,
    error: body.error,
    error_description: body.errorDescription,
    error_uri: body.errorUri,
  }

  const serializedPayload = serializeForInlineScript(payload)
  const serializedOrigin = serializeForInlineScript(origin)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Google login</title>
  </head>
  <body>
    <p>Completing Google login...</p>
    <script>
      const payload = ${serializedPayload};
      const targetOrigin = ${serializedOrigin};

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(payload, targetOrigin);
      }

      window.close();
    </script>
  </body>
</html>`
}

async function exchangeGoogleCode(code: string, redirectUri: string, codeVerifier: string) {
  const body = new URLSearchParams({
    client_id: googleClientId,
    client_secret: googleClientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  return (await tokenResponse.json()) as GoogleTokenResponse
}

app.get('/health', (c) => {
  return c.json({
    ok: true,
    service: 'test-api',
  })
})

app.options('/oauth/google/callback', (c) => {
  const requestOrigin = c.req.header('origin') ?? frontendOrigin
  return c.body(null, 204, buildJsonHeaders(requestOrigin))
})

app.get('/oauth/google/callback', (c) => {
  return c.html(
    buildPopupCallbackHtml(
      {
        code: c.req.query('code'),
        error: c.req.query('error'),
        errorDescription: c.req.query('error_description'),
        errorUri: c.req.query('error_uri'),
        state: c.req.query('state'),
      },
      frontendOrigin
    ),
    200,
    {
      'cache-control': 'no-store',
    }
  )
})

type CheckResponse = { error: true; response: Response } | { error: false; response: undefined }
type CheckOriginResponse = CheckResponse

function checkOrigin(c: Context): CheckOriginResponse {
  const requestOrigin = c.req.header('origin')
  const headers = buildJsonHeaders(requestOrigin ?? frontendOrigin)

  if (requestOrigin === frontendOrigin) {
    return { error: false, response: undefined }
  }

  const response = c.json(
    {
      google_error: 'invalid_origin',
      google_error_description: `Origin ${requestOrigin ?? 'none'} not allowed.`,
    },
    403,
    headers
  )

  return { error: true, response }
}

type CheckErrorResponse = CheckResponse & {
  body: Awaited<ReturnType<HonoRequest['parseBody']>>
}

async function checkErrorAsync(c: Context, headers: JsonHeaders): Promise<CheckErrorResponse> {
  const body = await c.req.parseBody()
  const state = typeof body.state === 'string' ? body.state : undefined
  const error = typeof body.error === 'string' ? body.error : undefined

  if (!error) {
    return {
      error: false,
      body,
      response: undefined,
    }
  }

  const errorDescription =
    typeof body.error_description === 'string' ? body.error_description : undefined
  const errorUri = typeof body.error_uri === 'string' ? body.error_uri : undefined
  const response = c.json(
    {
      google_error: error,
      google_error_description: errorDescription,
      google_error_uri: errorUri,
      google_state: state,
    },
    200,
    headers
  )

  return { error: true, body, response }
}

function checkHeader(c: Context, headers: JsonHeaders): CheckResponse {
  if (c.req.header('x-requested-with') === 'XmlHttpRequest') {
    return { error: false, response: undefined }
  }

  return {
    error: true,
    response: c.json(
      {
        google_error: 'missing_csrf_header',
        google_error_description: 'Missing expected X-Requested-With header.',
      },
      400,
      headers
    ),
  }
}

type CheckStateResponse = CheckResponse & {
  state: string
}

function checkState(
  c: Context,
  state: string | File | undefined,
  headers: JsonHeaders
): CheckStateResponse {
  if (typeof state === 'string') {
    return {
      error: false,
      state,
      response: undefined,
    }
  }

  return {
    error: true,
    state: '',
    response: c.json(
      {
        google_error: 'missing_state',
        google_error_description: 'Google callback did not include an OAuth state value.',
      },
      400,
      headers
    ),
  }
}

type CheckCodeResponse = CheckResponse & {
  code: string
}

function checkSecurityCode(
  c: Context,
  code: string | File | undefined,
  state: string,
  headers: JsonHeaders
): CheckCodeResponse {
  if (typeof code === 'string') {
    return {
      error: false,
      code,
      response: undefined,
    }
  }

  return {
    error: true,
    code: '',
    response: c.json(
      {
        google_error: 'missing_code',
        google_error_description: 'Google callback did not include an authorization code.',
        google_state: state,
      },
      400,
      headers
    ),
  }
}

type CheckCodeVerifierResponse = CheckResponse & {
  codeVerifier: string
}

function checkCodeVerifier(
  c: Context,
  codeVerifier: string | File | undefined,
  state: string,
  headers: JsonHeaders
): CheckCodeVerifierResponse {
  if (typeof codeVerifier === 'string') {
    return {
      error: false,
      codeVerifier,
      response: undefined,
    }
  }

  return {
    error: true,
    codeVerifier: '',
    response: c.json(
      {
        google_error: 'missing_code_verifier',
        google_error_description: 'Google OAuth exchange did not include a PKCE code verifier.',
        google_state: state,
      },
      400,
      headers
    ),
  }
}

function checkClientIdAndSecret(c: Context, state: string, headers: JsonHeaders): CheckResponse {
  if (googleClientId && googleClientSecret) {
    return {
      error: false,
      response: undefined,
    }
  }

  const response = c.json(
    {
      google_error: 'missing_server_oauth_config',
      google_error_description:
        'Set VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the test API environment.',
      google_state: state,
    },
    500,
    headers
  )

  return {
    error: true,
    response,
  }
}

app.post('/oauth/google/callback', async (c) => {
  const requestOrigin = c.req.header('origin')
  const headers = buildJsonHeaders(requestOrigin ?? frontendOrigin)

  const originState = checkOrigin(c)
  if (originState.error) {
    return originState.response
  }

  const requestWithState = checkHeader(c, headers)
  if (requestWithState.error) {
    return requestWithState.response
  }

  const bodyState = await checkErrorAsync(c, headers)
  if (bodyState.error) {
    return bodyState.response
  }

  const stateCheck = checkState(c, bodyState.body.state, headers)
  if (stateCheck.error) {
    return stateCheck.response
  }

  const state = stateCheck.state
  const codeState = checkSecurityCode(c, bodyState.body.code, state, headers)
  if (codeState.error) {
    return codeState.response
  }

  const codeVerifierState = checkCodeVerifier(c, bodyState.body.code_verifier, state, headers)
  if (codeVerifierState.error) {
    return codeVerifierState.response
  }

  const idAndSecretState = checkClientIdAndSecret(c, state, headers)
  if (idAndSecretState.error) {
    return idAndSecretState.response
  }

  const redirectUrl = new URL(c.req.url)
  redirectUrl.search = ''
  const tokens = await exchangeGoogleCode(
    codeState.code,
    redirectUrl.toString(),
    codeVerifierState.codeVerifier
  )

  return c.json(
    {
      google_access_token: tokens.access_token,
      google_expires_in: tokens.expires_in?.toString(),
      google_id_token: tokens.id_token,
      google_refresh_token: tokens.refresh_token,
      google_scope: tokens.scope,
      google_state: state,
      google_token_error: tokens.error,
      google_token_error_description: tokens.error_description,
      google_token_error_uri: tokens.error_uri,
      google_token_type: tokens.token_type,
    },
    200,
    headers
  )
})

app.notFound((c) => {
  return c.json(
    {
      ok: false,
      error: 'Not found',
      path: c.req.path,
    },
    404
  )
})

console.log(`Test API listening at http://${host}:${port}`)
console.log(`Health: http://${host}:${port}/health`)
console.log(`OAuth callback: http://${host}:${port}/oauth/google/callback`)

serve({
  fetch: app.fetch,
  hostname: host,
  port,
})
