export type GoogleCodeResponse = {
  code?: string
  scope?: string
  state?: string
  error?: string
  error_description?: string
  error_uri?: string
}

type GoogleExchangeResponse = {
  google_access_token?: string
  google_expires_in?: string
  google_id_token?: string
  google_refresh_token?: string
  google_scope?: string
  google_state?: string
  google_token_error?: string
  google_token_error_description?: string
  google_token_error_uri?: string
  google_token_type?: string
  google_error?: string
  google_error_description?: string
  google_error_uri?: string
}

export function getGoogleAuthConfig() {
  return {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '',
    scope:
      import.meta.env.VITE_GOOGLE_DRIVE_SCOPE?.trim() ??
      'https://www.googleapis.com/auth/drive.file',
    redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI?.trim() ?? '',
  }
}

export function isGoogleAuthConfigured(): boolean {
  const config = getGoogleAuthConfig()
  return Boolean(config.clientId && config.scope && config.redirectUri)
}

export function loginWithGoogle(state: string, authCallback: (result: any) => void): void {
  const config = getGoogleAuthConfig()

  if (!config.clientId) {
    throw new Error('Google OAuth is missing VITE_GOOGLE_CLIENT_ID.')
  }

  if (!config.redirectUri) {
    throw new Error('Google OAuth is missing VITE_GOOGLE_REDIRECT_URI.')
  }

  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) {
    throw new Error('Google Identity Services OAuth client is not available yet.')
  }

  const codeClient = oauth2.initCodeClient({
    client_id: config.clientId,
    scope: config.scope,
    include_granted_scopes: true,
    ux_mode: 'popup',
    select_account: true,
    state,
    callback: async (response: GoogleCodeResponse) => {
      try {
        const payload = new URLSearchParams()

        response.code && payload.set('code', response.code)
        response.scope && payload.set('scope', response.scope)
        response.state && payload.set('state', response.state)
        response.error && payload.set('error', response.error)
        response.error_description && payload.set('error_description', response.error_description)
        response.error_uri && payload.set('error_uri', response.error_uri)

        const exchangeResponse = await fetch(config.redirectUri, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'x-requested-with': 'XmlHttpRequest',
          },
          body: payload,
        })

        let result: GoogleExchangeResponse

        try {
          result = (await exchangeResponse.json()) as GoogleExchangeResponse
        } catch {
          authCallback({
            google_error: 'invalid_exchange_response',
            google_error_description: 'Google OAuth exchange returned an invalid response.',
            google_state: response.state,
          })
          return
        }

        if (!exchangeResponse.ok && !result.google_error) {
          result.google_error = 'google_oauth_exchange_failed'
          result.google_error_description ??= 'Google OAuth exchange failed.'
        }
        
        authCallback(result);
      } catch (error) {
        authCallback({
          google_error: 'google_oauth_exchange_failed',
          google_error_description:
            error instanceof Error ? error.message : 'Google OAuth exchange failed.',
          google_state: response.state,
        })
      }
    },
    error_callback: (error) => {
      authCallback({
        google_error: error.type,
        google_error_description: `Google OAuth popup failed: ${error.type}.`,
        google_state: state,
      })
    },
  })

  codeClient.requestCode()
}