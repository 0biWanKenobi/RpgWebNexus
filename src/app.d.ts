declare global {
  interface ImportMetaEnv {
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
        id?: {
          initialize: (config: {
            client_id: string
            callback: (response: unknown) => void
          }) => void
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number>
          ) => void
        }
      }
    }
  }
}

export {}
