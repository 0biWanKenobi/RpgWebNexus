import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

const host = process.env.TEST_API_HOST ?? '127.0.0.1'
const port = Number(process.env.TEST_API_PORT ?? 3000)
const frontendReturnUrl = process.env.TEST_APP_RETURN_URL ?? 'http://127.0.0.1:5173/'
const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID ?? ''
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''
const googleRedirectUri =
  process.env.VITE_GOOGLE_REDIRECT_URI ?? `http://${host}:${port}/oauth/google/callback`

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

function buildRedirectUrl(params: Record<string, string | undefined>) {
  const url = new URL(frontendReturnUrl)

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })

  return url.toString()
}

app.get('/health', (c) => {
  return c.json({
    ok: true,
    service: 'test-api',
  })
})

app.get('/oauth/google/callback', async (c) => {
  const query = c.req.query()
  const code = query.code
  const state = query.state

  if (query.error) {
    return c.redirect(
      buildRedirectUrl({
        google_error: query.error,
        google_error_description: query.error_description,
        google_error_uri: query.error_uri,
        google_state: state,
      })
    )
  }

  if (!code) {
    return c.redirect(
      buildRedirectUrl({
        google_error: 'missing_code',
        google_error_description: 'Google callback did not include an authorization code.',
      })
    )
  }

  if (!googleClientId || !googleClientSecret) {
    return c.redirect(
      buildRedirectUrl({
        google_error: 'missing_server_oauth_config',
        google_error_description:
          'Set VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the test API environment.',
      })
    )
  }

  const body = new URLSearchParams({
    client_id: googleClientId,
    client_secret: googleClientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: googleRedirectUri,
  })

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const tokens = (await tokenResponse.json()) as GoogleTokenResponse

  return c.redirect(
    buildRedirectUrl({
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
    })
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
