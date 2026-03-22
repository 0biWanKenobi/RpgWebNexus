<script lang="ts">
  import { onMount } from "svelte";
  import TokenPanel from "./components/TokenPanel.svelte";
  import LoginButton from "./components/LoginButton.svelte";
  import AuthStatus from "./components/AuthStatus.svelte";

  let loginStatus = $state("");
  


  type TokenResult = {
    google_access_token?: string | undefined;
    google_expires_in?: string | undefined;
    google_refresh_token?: string | undefined;
    google_state: string;
    google_token_error?: string | undefined;
    google_token_error_description?: string | undefined;
    google_token_error_uri?: string | undefined;
    google_error?: string | undefined;
    google_error_description?: string | undefined;
    google_error_uri?: string | undefined;
}

type TokenDisplay = {tokenResult: TokenResult, verified: true } | {tokenResult: null, verified: false}

  let tokenResult: TokenResult | null = $state(null);
  let tokenResultVerified = $state(false);
  let tokenDisplay  = $derived.by(() =>  ({tokenResult, verified: tokenResultVerified} as TokenDisplay))

  function readTokenResultFromUrl(): TokenResult | null {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    if (searchParams.size == 0) return  null;

    return {
      google_access_token: searchParams.get('google_access_token') || undefined,
      google_expires_in: searchParams.get('google_expires_in') || undefined,
      google_refresh_token:  searchParams.get('google_refresh_token') || undefined,
      google_state:  searchParams.get('google_state') as string,
      google_token_error:  searchParams.get('google_token_error') || undefined,
      google_token_error_description:  searchParams.get('google_token_error_description') || undefined,
      google_token_error_uri:  searchParams.get('google_token_error_uri') || undefined,
      google_error:  searchParams.get('google_error') || undefined,
      google_error_description:  searchParams.get('google_error_description') || undefined,
      google_error_uri:  searchParams.get('google_error_uri') || undefined,
    } as TokenResult

  }

  onMount(() => {
    tokenResult = readTokenResultFromUrl();
    if (!!tokenResult) {
        tokenResultVerified = sessionStorage.getItem('gas') == tokenResult.google_state;
    }
  });
</script>

<svelte:head>
  <title>RPG Web Nexus</title>
</svelte:head>

<main class="page-shell">
  <section class="card">
    <p class="eyebrow">RPG Web Nexus</p>
    <h1>Welcome, adventurer!</h1>
    <p class="description">
      The RPG Nexus is part of th <b>RPG Player</b> and <b>RPG Master</b> Obsidian
      plugins.
    </p>
    <p class="description">
      We do not collect any data, and request only the minimal access needed.
    </p>
    <p class="description">
      After logging in, you will be able to sync your game data with RPG Player
      and RPG Master.
    </p>

    <LoginButton setAuthStatus={(v) => (loginStatus = v)} />
    <AuthStatus {loginStatus} {tokenResult} />

    {#if tokenDisplay.verified}
      <TokenPanel tokenResult={tokenDisplay.tokenResult} />
    {:else}
      <p>WARNING: received response may have been hijacked!</p>
    {/if}
  </section>
</main>
