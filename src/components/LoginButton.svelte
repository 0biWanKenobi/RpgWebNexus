<script lang="ts">
  import {
    getGoogleAuthConfig,
    isGoogleAuthConfigured,
    redirectToGoogleAuthCode,
  } from "../lib/google";

  type SetAuthStatus = (value: string) => void;

  let isAuthorizing = $state(false);

  const googleConfig = getGoogleAuthConfig();

  let { setAuthStatus }: { setAuthStatus: SetAuthStatus } = $props();


  function authorizeWithGoogle() {
    isAuthorizing = true;
    setAuthStatus(`Redirecting to Google via ${googleConfig.redirectUri}...`);

    try {
      redirectToGoogleAuthCode("rpg-web-nexus-drive-poc");
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Google OAuth request failed.");
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
