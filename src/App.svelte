<script lang="ts">
  import { onMount } from "svelte";
  import {
    buildObsidianGoogleConnectUrl,
    consumeGoogleDriveSetupContextFromUrl,
    removeGoogleDriveSetupContextFromUrl,
  } from "rpg_shared/sync/googleDriveTokenCrypto";
  import type { GoogleDriveSetupContext } from "rpg_shared/sync/googleDriveTokenCrypto";
  import LoginButton from "./components/LoginButton.svelte";
  import ConnectButton from "./components/ConnectButton.svelte";
  import AuthStatus from "./components/AuthStatus.svelte";
  import type { TokenResult } from "./types/token-result";

  let loginError = $state("");

  type TokenDisplay =
    | { tokenResult: TokenResult; verified: true }
    | { tokenResult: null; verified: false | null };

  let tokenResult: TokenResult | null = $state(null);
  let tokenResultVerified = $state(null as boolean | null);
  let encryptionContext = $state<GoogleDriveSetupContext | null>(null);
  const tokenDisplay = $derived.by(
    () => ({ tokenResult, verified: tokenResultVerified }) as TokenDisplay,
  );
  const obsidianConnectUrl = $derived.by(() =>
    tokenDisplay.verified &&
    tokenDisplay.tokenResult.google_setup_id &&
    tokenDisplay.tokenResult.google_encrypted_payload
      ? buildObsidianGoogleConnectUrl(
          tokenDisplay.tokenResult.google_setup_id,
          tokenDisplay.tokenResult.google_encrypted_payload,
        )
      : null,
  );

  function handleAuthResult(result?: TokenResult) {
    if (result) {
      tokenResultVerified = sessionStorage.getItem("gas") == result.google_state;
      tokenResult = result;
    }
  }

  onMount(() => {
    encryptionContext = consumeGoogleDriveSetupContextFromUrl(window.location.href);

    if (encryptionContext) {
      window.history.replaceState(
        {},
        document.title,
        removeGoogleDriveSetupContextFromUrl(window.location.href),
      );
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

    {#if tokenDisplay.verified === null}
      <LoginButton
        {encryptionContext}
        setAuthErrorStatus={(v) => (loginError = v)}
        {handleAuthResult}
      />
      <AuthStatus {loginError} {tokenResult} />
    {:else if tokenDisplay.verified}
      <ConnectButton obsidianUrl={obsidianConnectUrl}>        
      </ConnectButton>
    {:else if tokenDisplay.verified === false}
      <p>WARNING: received response may have been hijacked!</p>
    {/if}
  </section>
</main>
