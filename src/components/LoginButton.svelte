<script lang="ts">
  import { isGoogleAuthConfigured, loginWithGoogle } from "../lib/google";
  import type { TokenResult } from "../types/token-result";

  type SetAuthStatus = (value: string) => void;

  let isAuthorizing = $state(false);

  let { setAuthErrorStatus, handleAuthResult }: {
    setAuthErrorStatus: SetAuthStatus,
    handleAuthResult: (r: TokenResult) => void,
  } = $props();

  async function authorizeWithGoogle() {
    isAuthorizing = true;
    setAuthErrorStatus(`Opening Google login popup...`);

    const google_state = `rpg-web-nexus-${crypto.randomUUID()}`;
    sessionStorage.setItem("gas", google_state);

    try {
      const result = await loginWithGoogle(google_state);
      handleAuthResult(result);
    } catch (error) {
      setAuthErrorStatus(error instanceof Error ? error.message : "Google OAuth request failed.");
    } finally {
      isAuthorizing = false;
    }
  }
</script>

<div class="button-slot">
  <button
    class="google-button"
    type="button"
    disabled={!isGoogleAuthConfigured() || isAuthorizing}
    onclick={authorizeWithGoogle}
  >
    {isAuthorizing ? "Waiting for Google..." : "Continue with Google"}
  </button>
</div>
