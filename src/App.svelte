<svelte:head>
  <title>RPG Web Nexus</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte'
  import { getParseConfig, initializeParse, isParseConfigured } from './lib/parse'

  const googleClientId = 'YOUR_GOOGLE_CLIENT_ID'
  let buttonContainer: HTMLDivElement | null = null
  let status = 'Waiting for Google Identity Services...'
  let parseStatus = 'Checking Parse configuration...'
  let parseConfig = getParseConfig()

  onMount(() => {
    parseConfig = getParseConfig()
    parseStatus = isParseConfigured()
      ? `Parse ready for ${parseConfig.serverUrl}`
      : 'Set VITE_PARSE_APP_ID and VITE_PARSE_SERVER_URL to initialize Parse.'

    if (isParseConfigured()) {
      initializeParse()
    }

    const tryRenderButton = () => {
      if (!buttonContainer) {
        return false
      }

      const googleIdentity = window.google?.accounts?.id
      if (!googleIdentity) {
        return false
      }

      if (googleClientId === 'YOUR_GOOGLE_CLIENT_ID') {
        status = 'Add your Google client ID in src/App.svelte to enable sign-in.'
        return true
      }

      googleIdentity.initialize({
        client_id: googleClientId,
        callback: (response: unknown) => {
          console.log('Google sign-in response', response)
          status = 'Sign-in response received. Check the console for details.'
        },
      })

      buttonContainer.innerHTML = ''
      googleIdentity.renderButton(buttonContainer, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: 280,
      })

      status = 'Ready to test Google sign-in on localhost.'
      return true
    }

    if (tryRenderButton()) {
      return
    }

    const interval = window.setInterval(() => {
      if (tryRenderButton()) {
        window.clearInterval(interval)
      }
    }, 150)

    return () => window.clearInterval(interval)
  })
</script>

<main class="page-shell">
  <section class="card">
    <p class="eyebrow">RPG Web Nexus</p>
    <h1>Sign in with Google</h1>
    <p class="description">
      This starter page keeps the flow simple so we can verify the Google button on
      localhost first.
    </p>
    <p class="parse-status">{parseStatus}</p>

    <div class="button-slot" bind:this={buttonContainer}></div>
    <p class="status">{status}</p>
  </section>
</main>
