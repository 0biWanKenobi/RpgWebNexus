/// <reference types="google.accounts" />

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

}

export {}
