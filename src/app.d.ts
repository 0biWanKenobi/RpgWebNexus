declare global {
  interface ImportMetaEnv {
    readonly VITE_GOOGLE_CLIENT_ID?: string
    readonly VITE_GOOGLE_DRIVE_SCOPE?: string
    readonly VITE_GOOGLE_REDIRECT_URI?: string
    readonly VITE_PARSE_APP_ID?: string
    readonly VITE_PARSE_JS_KEY?: string
    readonly VITE_PARSE_SERVER_URL?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

  interface Window {
    Parse?: typeof import('parse').default
    google?: {
      accounts?: {
        oauth2?: {
          initCodeClient: (config: {
            client_id: string
            scope: string
            redirect_uri?: string
            include_granted_scopes?: boolean
            ux_mode?: 'popup' | 'redirect'
            select_account?: boolean
            state?: string
            callback: (response: {
              code?: string
              scope?: string
              state?: string
              error?: string
              error_description?: string
              error_uri?: string
            }) => void
            error_callback?: (error: {
              type: 'popup_failed_to_open' | 'popup_closed' | 'unknown'
            }) => void
          }) => {
            requestCode: () => void
          }
        }
      }
    }
  }
}

export {}
