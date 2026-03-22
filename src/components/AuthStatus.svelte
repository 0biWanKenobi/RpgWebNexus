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
            return "Google tokens returned from the configured callback endpoint.";
        }

        if (tokenResult?.google_token_error || tokenResult?.google_error) {
            return "Google OAuth returned an error. Review the details below.";
        }

        if(loginStatus!= ""){
            return loginStatus
        }

        return isGoogleAuthConfigured()
            ? `Click the button above to login with Google.`
            : "Something is wrong, contact the developer.";
    });
</script>

<p class="status">{authStatus}</p>
