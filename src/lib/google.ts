export type GoogleCodeResponse = {
  code?: string
  scope?: string
  state?: string
  error?: string
  error_description?: string
  error_uri?: string
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

export function redirectToGoogleAuthCode(state?: string): void {
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
    redirect_uri: config.redirectUri,
    include_granted_scopes: true,
    ux_mode: 'redirect',
    select_account: true,
    state,
    callback: () => {
      // Redirect mode sends the authorization code to the redirect URI.
    },
  })

  codeClient.requestCode()
}
