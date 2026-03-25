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

type JsonResponseBody = Record<string, string | undefined | boolean>
type ParsedRequestBody = {
  code?: string
  codeVerifier?: string
  error?: string
  errorDescription?: string
  errorUri?: string
  state?: string
}
type ParsedCallbackQuery = {
  code?: string
  error?: string
  errorDescription?: string
  errorUri?: string
  state?: string
}
type CheckResponse = { error: true; status: number; body: JsonResponseBody } | { error: false }
type CheckOriginResponse = CheckResponse & { origin: string }

type CloudFunctionRequest = import('@google-cloud/functions-framework').Request
type CloudFunctionResponse = import('@google-cloud/functions-framework').Response

const { http } = require('@google-cloud/functions-framework') as {
  http: (
    name: string,
    handler: (req: CloudFunctionRequest, res: CloudFunctionResponse) => Promise<void> | void
  ) => void
}

const frontendReturnUrl = process.env.FRONTEND_RETURN_URL
const frontendEnvOrigin = frontendReturnUrl ? new URL(frontendReturnUrl).origin : undefined
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? ''
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''
const googlePopupMessageSource = 'rpg-web-nexus-google-oauth'
const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? ''

function buildJsonHeaders(origin = frontendEnvOrigin ?? '*') {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'content-type,x-requested-with',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-credentials': 'false',
    'content-type': 'application/json',
    vary: 'Origin',
  }
}

function sendJson(
  res: CloudFunctionResponse,
  status: number,
  body: JsonResponseBody,
  origin?: string
) {
  res.set(buildJsonHeaders(origin))
  res.status(status).json(body)
}

function sendPopupHtml(res: CloudFunctionResponse, status: number, html: string) {
  res.set({
    'cache-control': 'no-store',
    'content-type': 'text/html; charset=utf-8',
  })
  res.status(status).send(html)
}

function readFirstString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    const [firstValue] = value
    return typeof firstValue === 'string' ? firstValue : undefined
  }

  return undefined
}

function parseRequestBody(req: CloudFunctionRequest): ParsedRequestBody {
  const body =
    typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : {}

  return {
    code: typeof body.code === 'string' ? body.code : undefined,
    codeVerifier: typeof body.code_verifier === 'string' ? body.code_verifier : undefined,
    error: typeof body.error === 'string' ? body.error : undefined,
    errorDescription: typeof body.error_description === 'string' ? body.error_description : undefined,
    errorUri: typeof body.error_uri === 'string' ? body.error_uri : undefined,
    state: typeof body.state === 'string' ? body.state : undefined,
  }
}

function parseCallbackQuery(req: CloudFunctionRequest): ParsedCallbackQuery {
  const query = typeof req.query === 'object' && req.query !== null ? req.query : {}

  return {
    code: readFirstString(query.code),
    error: readFirstString(query.error),
    errorDescription: readFirstString(query.error_description),
    errorUri: readFirstString(query.error_uri),
    state: readFirstString(query.state),
  }
}

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function buildPopupCallbackHtml(body: ParsedCallbackQuery, origin: string): string {
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

function checkMethod(req: CloudFunctionRequest): CheckResponse {
  const requestMethod = req.method ?? 'GET'

  if (requestMethod === 'POST') {
    return { error: false }
  }

  return {
    error: true,
    status: 405,
    body: {
      google_error: 'method_not_allowed',
      google_error_description: `Method ${requestMethod} not allowed.`,
    },
  }
}

function checkEnvFrontendOrigin(): CheckOriginResponse {
  if (frontendEnvOrigin) {
    return { error: false, origin: frontendEnvOrigin }
  }

  return {
    error: true,
    status: 500,
    origin: '',
    body: {
      google_error: 'missing_frontend_return_url',
      google_error_description: 'Missing FRONTEND_RETURN_URL.',
    },
  }
}

function checkOrigin(req: CloudFunctionRequest): CheckResponse {
  const requestOrigin = readFirstString(req.headers.origin)

  if (frontendEnvOrigin && requestOrigin === frontendEnvOrigin) {
    return { error: false }
  }

  return {
    error: true,
    status: 403,
    body: {
      google_error: 'invalid_origin',
      google_error_description: `Origin ${requestOrigin ?? 'none'} not allowed.`,
    },
  }
}

function checkHeader(req: CloudFunctionRequest): CheckResponse {
  if (readFirstString(req.headers['x-requested-with']) === 'XmlHttpRequest') {
    return { error: false }
  }

  return {
    error: true,
    status: 400,
    body: {
      google_error: 'missing_csrf_header',
      google_error_description: 'Missing expected X-Requested-With header.',
    },
  }
}

function checkError(body: ParsedRequestBody): CheckResponse {
  if (!body.error) {
    return { error: false }
  }

  return {
    error: true,
    status: 200,
    body: {
      google_error: body.error,
      google_error_description: body.errorDescription,
      google_error_uri: body.errorUri,
      google_state: body.state,
    },
  }
}

function checkState(body: ParsedRequestBody): CheckResponse {
  if (body.state) {
    return { error: false }
  }

  return {
    error: true,
    status: 400,
    body: {
      google_error: 'missing_state',
      google_error_description: 'Google callback did not include an OAuth state value.',
    },
  }
}

function checkCode(body: ParsedRequestBody): CheckResponse {
  if (body.code) {
    return { error: false }
  }

  return {
    error: true,
    status: 400,
    body: {
      google_error: 'missing_code',
      google_error_description: 'Google callback did not include an authorization code.',
      google_state: body.state,
    },
  }
}

function checkCodeVerifier(body: ParsedRequestBody): CheckResponse {
  if (body.codeVerifier) {
    return { error: false }
  }

  return {
    error: true,
    status: 400,
    body: {
      google_error: 'missing_code_verifier',
      google_error_description: 'Google OAuth exchange did not include a PKCE code verifier.',
      google_state: body.state,
    },
  }
}

function checkClientIdAndSecret(state?: string): CheckResponse {
  if (googleClientId && googleClientSecret) {
    return { error: false }
  }

  return {
    error: true,
    status: 500,
    body: {
      google_error: 'missing_server_oauth_config',
      google_error_description:
        'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in the Cloud Run environment.',
      google_state: state,
    },
  }
}

async function exchangeGoogleCode(
  code: string,
  codeVerifier: string
): Promise<GoogleTokenResponse> {
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

http('googleOAuthCallback', async (req: CloudFunctionRequest, res: CloudFunctionResponse) => {
  const requestMethod = req.method ?? 'GET'
  const requestOriginHeader = readFirstString(req.headers.origin)

  if (requestMethod === 'OPTIONS') {
    res.set(buildJsonHeaders(requestOriginHeader))
    res.status(204).send('')
    return
  }

  const frontendOriginState = checkEnvFrontendOrigin()
  if (frontendOriginState.error) {
    sendJson(res, frontendOriginState.status, frontendOriginState.body, requestOriginHeader)
    return
  }

  if (requestMethod === 'GET') {
    const popupQuery = parseCallbackQuery(req)
    sendPopupHtml(res, 200, buildPopupCallbackHtml(popupQuery, frontendOriginState.origin))
    return
  }

  const methodState = checkMethod(req)
  if (methodState.error) {
    sendJson(res, methodState.status, methodState.body, requestOriginHeader)
    return
  }

  const originState = checkOrigin(req)
  if (originState.error) {
    sendJson(res, originState.status, originState.body)
    return
  }

  const headerState = checkHeader(req)
  if (headerState.error) {
    sendJson(res, headerState.status, headerState.body)
    return
  }

  const body = parseRequestBody(req)

  const errorState = checkError(body)
  if (errorState.error) {
    sendJson(res, errorState.status, errorState.body, requestOriginHeader)
    return
  }

  const stateState = checkState(body)
  if (stateState.error) {
    sendJson(res, stateState.status, stateState.body, requestOriginHeader)
    return
  }

  const codeState = checkCode(body)
  if (codeState.error) {
    sendJson(res, codeState.status, codeState.body, requestOriginHeader)
    return
  }

  const codeVerifierState = checkCodeVerifier(body)
  if (codeVerifierState.error) {
    sendJson(res, codeVerifierState.status, codeVerifierState.body, requestOriginHeader)
    return
  }

  const clientIdAndSecretState = checkClientIdAndSecret(body.state)
  if (clientIdAndSecretState.error) {
    sendJson(res, clientIdAndSecretState.status, clientIdAndSecretState.body, requestOriginHeader)
    return
  }

  try {
    const tokens = await exchangeGoogleCode(
      body.code as string,
      body.codeVerifier as string
    )

    sendJson(
      res,
      200,
      {
        google_access_token: tokens.access_token,
        google_expires_in: tokens.expires_in?.toString(),
        google_id_token: tokens.id_token,
        google_refresh_token: tokens.refresh_token,
        google_scope: tokens.scope,
        google_state: body.state,
        google_token_error: tokens.error,
        google_token_error_description: tokens.error_description,
        google_token_error_uri: tokens.error_uri,
        google_token_type: tokens.token_type,
      },
      requestOriginHeader
    )
  } catch (error) {
    sendJson(
      res,
      500,
      {
        google_error: 'token_exchange_failed',
        google_error_description:
          error instanceof Error ? error.message : 'Unexpected token exchange failure.',
        google_state: body.state,
      },
      requestOriginHeader
    )
  }
})
