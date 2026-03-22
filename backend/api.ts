type RedirectParamValue = string | number | null | undefined

type RedirectParams = Record<string, RedirectParamValue>

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

type CloudFunctionRequest = import('@google-cloud/functions-framework').Request
type CloudFunctionResponse = import('@google-cloud/functions-framework').Response

const { http } = require('@google-cloud/functions-framework') as {
  http: (
    name: string,
    handler: (req: CloudFunctionRequest, res: CloudFunctionResponse) => Promise<void> | void
  ) => void
}

function buildRedirectUrl(baseUrl: string, params: RedirectParams): string {
  const url = new URL(baseUrl)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

http('googleOAuthCallback', async (req: CloudFunctionRequest, res: CloudFunctionResponse) => {
  const frontendReturnUrl = process.env.FRONTEND_RETURN_URL
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
  const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!frontendReturnUrl) {
    res.status(500).send('Missing FRONTEND_RETURN_URL')
    return
  }

  if (!googleClientId || !googleClientSecret || !googleRedirectUri) {
    res.redirect(
      buildRedirectUrl(frontendReturnUrl, {
        google_error: 'missing_server_oauth_config',
        google_error_description:
          'Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI.',
      })
    )
    return
  }

  const code = req.query.code as string | undefined
  const state = req.query.state as string | undefined
  const error = req.query.error as string | undefined
  const errorDescription = req.query.error_description as string | undefined
  const errorUri = req.query.error_uri as string | undefined

  if (error) {
    res.redirect(
      buildRedirectUrl(frontendReturnUrl, {
        google_error: error,
        google_error_description: errorDescription,
        google_error_uri: errorUri,
        google_state: state,
      })
    )
    return
  }

  if (!code) {
    res.redirect(
      buildRedirectUrl(frontendReturnUrl, {
        google_error: 'missing_code',
        google_error_description: 'Google callback did not include an authorization code.',
      })
    )
    return
  }

  try {
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

    res.redirect(
      buildRedirectUrl(frontendReturnUrl, {
        google_access_token: tokens.access_token,
        google_expires_in: tokens.expires_in,
        google_refresh_token: tokens.refresh_token,
        google_state: state,
        google_token_error: tokens.error,
        google_token_error_description: tokens.error_description,
        google_token_error_uri: tokens.error_uri,
      })
    )
  } catch (err) {
    res.redirect(
      buildRedirectUrl(frontendReturnUrl, {
        google_error: 'token_exchange_failed',
        google_error_description:
          err instanceof Error ? err.message : 'Unexpected token exchange failure.',
        google_state: state,
      })
    )
  }
})
