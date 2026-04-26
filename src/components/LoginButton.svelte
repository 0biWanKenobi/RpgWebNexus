<script lang="ts">
  import { isGoogleAuthConfigured, loginWithGoogle } from "../lib/google";
  import type { GoogleDriveSetupContext } from "rpg_shared/sync/googleDriveTokenCrypto";
  import type { TokenResult } from "../types/token-result";
  import ActionButton from "./ActionButton.svelte";

  type SetAuthStatus = (value: string) => void;

  let isAuthorizing = $state(false);

  let { setAuthErrorStatus, handleAuthResult, encryptionContext }: {
    setAuthErrorStatus: SetAuthStatus,
    handleAuthResult: (r: TokenResult) => void,
    encryptionContext: GoogleDriveSetupContext | null,
  } = $props();

  async function authorizeWithGoogle() {
    isAuthorizing = true;
    setAuthErrorStatus(`Opening Google login popup...`);

    const google_state = `rpg-web-nexus-${crypto.randomUUID()}`;
    sessionStorage.setItem("gas", google_state);

    try {
      const result = await loginWithGoogle(google_state, encryptionContext);
      handleAuthResult(result);
    } catch (error) {
      setAuthErrorStatus(error instanceof Error ? error.message : "Google OAuth request failed.");
    } finally {
      isAuthorizing = false;
    }
  }
</script>

<ActionButton
    disabled={!isGoogleAuthConfigured() || isAuthorizing}
    onclick={authorizeWithGoogle}
  >
    {isAuthorizing ? "Waiting for Google..." : "Continue with Google"}
</ActionButton>
