<script lang="ts">
  import { onMount } from "svelte";
  import TokenPanel from "./components/TokenPanel.svelte";
  import LoginButton from "./components/LoginButton.svelte";
  import AuthStatus from "./components/AuthStatus.svelte";

  let loginStatus = $state("");
  let tokenResult: Record<string, string> | null = $state(null);

  function readTokenResultFromUrl() {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    const keys = [
      "google_access_token",
      "google_expires_in",
      "google_id_token",
      "google_refresh_token",
      "google_scope",
      "google_state",
      "google_token_error",
      "google_token_error_description",
      "google_token_error_uri",
      "google_token_type",
      "google_error",
      "google_error_description",
      "google_error_uri",
    ];

    const entries = keys
      .map((key) => [key, searchParams.get(key)] as const)
      .filter((entry): entry is [string, string] => entry[1] !== null);

    return entries.length > 0 ? Object.fromEntries(entries) : null;
  }

  onMount(() => {
    tokenResult = readTokenResultFromUrl();
  });
</script>

<svelte:head>
  <title>RPG Web Nexus</title>
</svelte:head>

<main class="page-shell">
  <section class="card">
    <p class="eyebrow">RPG Web Nexus</p>
    <h1>Request Google auth code</h1>
    <p class="description">
      This POC uses the Google OAuth redirect flow and sends the authorization
      code to your configured Cloud Run callback endpoint first.
    </p>

    <LoginButton setAuthStatus={(v) => (loginStatus = v)} />
    <AuthStatus {loginStatus} {tokenResult} />

    {#if tokenResult}
      <TokenPanel {tokenResult} />
    {/if}
  </section>
</main>
