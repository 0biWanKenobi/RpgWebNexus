<script lang="ts">
  import { onMount } from "svelte";
  import TokenPanel from "./components/TokenPanel.svelte";
  import LoginButton from "./components/LoginButton.svelte";
  import AuthStatus from "./components/AuthStatus.svelte";
  import type { TokenResult } from "./types/token-result";

  let loginError = $state("");

type TokenDisplay = {tokenResult: TokenResult, verified: true } | {tokenResult: null, verified: false|null}

  let tokenResult: TokenResult | null = $state(null);
  let tokenResultVerified = $state(null as boolean|null);
  let tokenDisplay  = $derived.by(() =>  ({tokenResult, verified: tokenResultVerified} as TokenDisplay))


  function handleAuthResult(result?: TokenResult) {
    if (!!result) {
        tokenResultVerified = sessionStorage.getItem('gas') == result.google_state;
        tokenResult = result;
    }
  }

  onMount(() => {
    // do anything needed at page load
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

    <LoginButton setAuthErrorStatus={(v) => (loginError = v)} {handleAuthResult} />
    <AuthStatus loginError={loginError} {tokenResult} />

    {#if tokenDisplay.verified}
      <TokenPanel tokenResult={tokenDisplay.tokenResult} />
    {:else if tokenDisplay.verified === false}
      <p>WARNING: received response may have been hijacked!</p>
    {/if}
  </section>
</main>
