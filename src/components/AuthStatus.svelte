<script lang="ts">
    import { getGoogleAuthConfig, isGoogleAuthConfigured } from "../lib/google";

    let { loginStatus, tokenResult }: {
        loginStatus: string,
        tokenResult: Record<string, string> | null,
    } =
        $props();

    const googleConfig = getGoogleAuthConfig();

    const authStatus = $derived.by(() => {
        if (
            tokenResult?.google_refresh_token ||
            tokenResult?.google_access_token
        ) {
            return "Google tokens returned from the local callback endpoint.";
        }

        if (tokenResult?.google_token_error || tokenResult?.google_error) {
            return "Google OAuth returned an error. Review the details below.";
        }

        if(loginStatus!= ""){
            return loginStatus
        }

        return isGoogleAuthConfigured()
            ? `Ready to redirect Google OAuth to ${googleConfig.redirectUri}`
            : "Set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_REDIRECT_URI to enable the Google auth code flow.";
    });
</script>

<p class="status">{authStatus}</p>
