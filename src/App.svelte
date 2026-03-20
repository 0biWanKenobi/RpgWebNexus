<svelte:head>
  <title>RPG Web Nexus</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte'
  import {
    getGoogleAuthConfig,
    isGoogleAuthConfigured,
    redirectToGoogleAuthCode,
  } from './lib/google'
  import { getParseConfig, initializeParse, isParseConfigured } from './lib/parse'

  let authStatus = 'Waiting for Google Identity Services...'
  let parseStatus = 'Checking Parse configuration...'
  let parseConfig = getParseConfig()
  let googleConfig = getGoogleAuthConfig()
  let isAuthorizing = false
  let tokenResult: Record<string, string> | null = null
  let revealedKeys = new Set<string>()

  function isSensitiveTokenField(key: string) {
    return key.includes('token')
  }

  function maskValue(value: string) {
    if (value.length <= 12) {
      return '••••••••'
    }

    return `${value.slice(0, 6)}••••••${value.slice(-4)}`
  }

  function toggleReveal(key: string) {
    const next = new Set(revealedKeys)

    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }

    revealedKeys = next
  }

  function readTokenResultFromUrl() {
    const url = new URL(window.location.href)
    const searchParams = url.searchParams
    const keys = [
      'google_access_token',
      'google_expires_in',
      'google_id_token',
      'google_refresh_token',
      'google_scope',
      'google_state',
      'google_token_error',
      'google_token_error_description',
      'google_token_error_uri',
      'google_token_type',
      'google_error',
      'google_error_description',
      'google_error_uri',
    ]

    const entries = keys
      .map((key) => [key, searchParams.get(key)] as const)
      .filter((entry): entry is [string, string] => entry[1] !== null)

    return entries.length > 0 ? Object.fromEntries(entries) : null
  }

  onMount(() => {
    parseConfig = getParseConfig()
    googleConfig = getGoogleAuthConfig()
    tokenResult = readTokenResultFromUrl()
    revealedKeys = new Set()
    parseStatus = isParseConfigured()
      ? `Parse ready for ${parseConfig.serverUrl}`
      : 'Set VITE_PARSE_APP_ID and VITE_PARSE_SERVER_URL to initialize Parse.'

    if (isParseConfigured()) {
      initializeParse()
    }
    authStatus = isGoogleAuthConfigured()
      ? `Ready to redirect Google OAuth to ${googleConfig.redirectUri}`
      : 'Set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_REDIRECT_URI to enable the Google auth code flow.'

    if (tokenResult?.google_refresh_token || tokenResult?.google_access_token) {
      authStatus = 'Google tokens returned from the local callback endpoint.'
    } else if (tokenResult?.google_token_error || tokenResult?.google_error) {
      authStatus = 'Google OAuth returned an error. Review the details below.'
    }
  })

  function authorizeWithGoogle() {
    isAuthorizing = true
    authStatus = `Redirecting to Google, then back to ${googleConfig.redirectUri}...`

    try {
      redirectToGoogleAuthCode('rpg-web-nexus-drive-poc')
    } catch (error) {
      authStatus = error instanceof Error ? error.message : 'Google OAuth request failed.'
      isAuthorizing = false
    }
  }
</script>

<main class="page-shell">
  <section class="card">
    <p class="eyebrow">RPG Web Nexus</p>
    <h1>Request Google auth code</h1>
    <p class="description">
      This POC uses the Google OAuth redirect flow and sends the authorization code to
      your local Hono callback endpoint first.
    </p>
    <p class="parse-status">{parseStatus}</p>
    <p class="google-scope">Scope: {googleConfig.scope}</p>
    <p class="google-scope">Redirect URI: {googleConfig.redirectUri}</p>

    <div class="button-slot">
      <button
        class="google-button"
        type="button"
        disabled={!isGoogleAuthConfigured() || isAuthorizing}
        on:click={authorizeWithGoogle}
      >
        {isAuthorizing ? 'Waiting for Google...' : 'Continue with Google'}
      </button>
    </div>
    <p class="status">{authStatus}</p>

    {#if tokenResult}
      <div class="response-panel">
        <p class="response-title">OAuth result</p>
        {#each Object.entries(tokenResult) as [key, value]}
          <div class="token-row">
            <p class="token-key">{key}</p>
            <div class="token-value-row">
              <pre>{isSensitiveTokenField(key) && !revealedKeys.has(key) ? maskValue(value) : value}</pre>
              {#if isSensitiveTokenField(key)}
                <button class="toggle-button" type="button" on:click={() => toggleReveal(key)}>
                  {revealedKeys.has(key) ? 'Hide' : 'Reveal'}
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</main>
