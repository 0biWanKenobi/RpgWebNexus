import type { TokenResult } from '../types/token-result'

type GooglePopupResponse = {
  source: string
  code?: string
  state?: string
  error?: string
  error_description?: string
  error_uri?: string
}

type Uint8ArrayBase64Encoder = Uint8Array & {
  toBase64: (options?: {
    alphabet?: 'base64' | 'base64url'
    omitPadding?: boolean
  }) => string
}

const GOOGLE_POPUP_MESSAGE_SOURCE = 'rpg-web-nexus-google-oauth'
const GOOGLE_PKCE_STORAGE_PREFIX = 'rpg-web-nexus-google-pkce-'
const GOOGLE_POPUP_WIDTH = 520
const GOOGLE_POPUP_HEIGHT = 720
const GOOGLE_POPUP_POLL_INTERVAL_MS = 500
const GOOGLE_POPUP_TIMEOUT_MS = 5 * 60 * 1000

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
  const { clientId, scope, redirectUri } = getGoogleAuthConfig()
  const hasClientId = clientId.length > 0
  const hasScope = scope.length > 0
  const hasRedirectUri = redirectUri.length > 0

  return hasClientId && hasScope && hasRedirectUri
}

function createGoogleErrorResult(
  state: string,
  error: string,
  description: string,
  errorUri?: string
): TokenResult {
  return {
    google_error: error,
    google_error_description: description,
    google_error_uri: errorUri,
    google_state: state,
  }
}

function base64UrlEncode(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input
  const encoder = bytes as Uint8ArrayBase64Encoder

  return encoder.toBase64({
    alphabet: 'base64url',
    omitPadding: true,
  })
}

function createCodeVerifier(): string {
  const randomBytes = new Uint8Array(32)
  crypto.getRandomValues(randomBytes)
  return base64UrlEncode(randomBytes)
}

async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const codeVerifierBytes = new TextEncoder().encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', codeVerifierBytes)
  const codeChallenge = base64UrlEncode(digest)

  return codeChallenge
}

function consumeCodeVerifier(storageKey: string): string | undefined {
  const codeVerifier = sessionStorage.getItem(storageKey) ?? undefined
  sessionStorage.removeItem(storageKey)
  return codeVerifier
}

function buildGoogleAuthorizeUrl(state: string, codeChallenge: string): string {
  const config = getGoogleAuthConfig()

  if (!config.clientId) {
    throw new Error('Google OAuth is missing VITE_GOOGLE_CLIENT_ID.')
  }

  if (!config.redirectUri) {
    throw new Error('Google OAuth is missing VITE_GOOGLE_REDIRECT_URI.')
  }

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', config.scope)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('prompt', 'select_account')

  return url.toString()
}

function openGooglePopup(url: string): Window {

const left = Math.max(window.screenX + (window.outerWidth - GOOGLE_POPUP_WIDTH) / 2, 0)
  const top = Math.max(window.screenY + (window.outerHeight - GOOGLE_POPUP_HEIGHT) / 2, 0)

  const popupFeatures = [
    'popup=yes',
    `width=${GOOGLE_POPUP_WIDTH}`,
    `height=${GOOGLE_POPUP_HEIGHT}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
  ].join(',')

  const popup = window.open(url, 'rpg-web-nexus-google-login', popupFeatures)

  if (!popup) {
    throw new Error('Google OAuth popup was blocked by the browser.')
  }

  popup.focus()
  return popup
}

function isGooglePopupResponse(value: unknown): value is GooglePopupResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const popupResponse = value as Record<string, unknown>
  const popupSource = popupResponse.source

  return popupSource === GOOGLE_POPUP_MESSAGE_SOURCE
}

function waitForGooglePopupMessage(expectedOrigin: string, popup: Window): Promise<GooglePopupResponse> {
  return new Promise((resolve, reject) => {
    let settled = false

    const cleanup = () => {
      if (settled) {
        return
      }

      settled = true
      window.removeEventListener('message', onMessage)
      window.clearInterval(closePollId)
      window.clearTimeout(timeoutId)
    }

    const rejectWithError = (message: string) => {
      cleanup()
      reject(new Error(message))
    }

    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== expectedOrigin || !isGooglePopupResponse(event.data)) {
        return
      }

      cleanup()
      resolve(event.data)
    }

    const closePollId = window.setInterval(() => {
      if (popup.closed) {
        rejectWithError('Google OAuth popup was closed before the login completed.')
      }
    }, GOOGLE_POPUP_POLL_INTERVAL_MS)

    const timeoutId = window.setTimeout(() => {
      rejectWithError('Google OAuth popup timed out before the login completed.')
    }, GOOGLE_POPUP_TIMEOUT_MS)

    window.addEventListener('message', onMessage)
  })
}

async function exchangeGoogleCode(
  state: string,
  popupResponse: GooglePopupResponse,
  codeVerifier: string
): Promise<TokenResult> {
  const config = getGoogleAuthConfig()

  try {
    const payload = new URLSearchParams()

    popupResponse.code && payload.set('code', popupResponse.code)
    popupResponse.state && payload.set('state', popupResponse.state)
    popupResponse.error && payload.set('error', popupResponse.error)
    popupResponse.error_description &&
      payload.set('error_description', popupResponse.error_description)
    popupResponse.error_uri && payload.set('error_uri', popupResponse.error_uri)
    payload.set('code_verifier', codeVerifier)

    const exchangeResponse = await fetch(config.redirectUri, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-requested-with': 'XmlHttpRequest',
      },
      body: payload,
    })

    let result: TokenResult

    try {
      result = (await exchangeResponse.json()) as TokenResult
    } catch {
      return createGoogleErrorResult(
        state,
        'invalid_exchange_response',
        'Google OAuth exchange returned an invalid response.'
      )
    }

    if (!exchangeResponse.ok && !result.google_error) {
      result.google_error = 'google_oauth_exchange_failed'
      result.google_error_description ??= 'Google OAuth exchange failed.'
    }

    result.google_state ||= state
    return result
  } catch (error) {
    return createGoogleErrorResult(
      state,
      'google_oauth_exchange_failed',
      error instanceof Error ? error.message : 'Google OAuth exchange failed.'
    )
  }
}

export async function loginWithGoogle(state: string): Promise<TokenResult> {
  const config = getGoogleAuthConfig()

  if (!config.clientId) {
    throw new Error('Google OAuth is missing VITE_GOOGLE_CLIENT_ID.')
  }

  if (!config.redirectUri) {
    throw new Error('Google OAuth is missing VITE_GOOGLE_REDIRECT_URI.')
  }

  const codeVerifier = createCodeVerifier()
  const pkceStorageKey = `${GOOGLE_PKCE_STORAGE_PREFIX}${state}`
  sessionStorage.setItem(pkceStorageKey, codeVerifier)

  try {
    const codeChallenge = await createCodeChallenge(codeVerifier)
    const popup = openGooglePopup(buildGoogleAuthorizeUrl(state, codeChallenge))
    const popupResponse = await waitForGooglePopupMessage(new URL(config.redirectUri).origin, popup)

    if (popupResponse.state !== state) {
      sessionStorage.removeItem(pkceStorageKey)
      return createGoogleErrorResult(
        state,
        'invalid_state',
        'Google OAuth returned a mismatched state value.'
      )
    }

    const storedCodeVerifier = consumeCodeVerifier(pkceStorageKey)

    if (popupResponse.error) {
      return createGoogleErrorResult(
        state,
        popupResponse.error,
        popupResponse.error_description ?? 'Google OAuth returned an error.',
        popupResponse.error_uri
      )
    }

    if (!storedCodeVerifier) {
      return createGoogleErrorResult(
        state,
        'missing_code_verifier',
        'The PKCE code verifier was missing from session storage.'
      )
    }

    return await exchangeGoogleCode(state, popupResponse, storedCodeVerifier)
  } catch (error) {
    sessionStorage.removeItem(pkceStorageKey)
    throw error
  }
}
