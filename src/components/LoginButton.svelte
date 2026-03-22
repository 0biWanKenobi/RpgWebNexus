<script lang="ts">
  import {
    getGoogleAuthConfig,
    isGoogleAuthConfigured,
    loginWithGoogle,
  } from "../lib/google";
    import type { TokenResult } from "../types/token-result";

  type SetAuthStatus = (value: string) => void;

  let isAuthorizing = $state(false);

  const googleConfig = getGoogleAuthConfig();

  let { setAuthErrorStatus, handleAuthResult }: {
     setAuthErrorStatus: SetAuthStatus,
     handleAuthResult: (r: TokenResult) => void,
  } = $props();

  function authorizeWithGoogle() {
    isAuthorizing = true;
    setAuthErrorStatus(`Redirecting to Google via ${googleConfig.redirectUri}...`);

    const google_state = `rpg-web-nexus-${crypto.randomUUID()}`;
    sessionStorage.setItem("gas", google_state);
    try {
      loginWithGoogle(google_state, handleAuthResult);
    } catch (error) {
      setAuthErrorStatus(error instanceof Error ? error.message : "Google OAuth request failed.");
    }
    finally {
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
