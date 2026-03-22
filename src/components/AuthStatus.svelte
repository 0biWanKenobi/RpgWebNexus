<script lang="ts">
    import { isGoogleAuthConfigured } from "../lib/google";

    let { loginError, tokenResult }: {
        loginError: string,
        tokenResult: Record<string, string> | null,
    } =
        $props();

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

        if(loginError!= ""){
            return loginError
        }

        return isGoogleAuthConfigured()
            ? `Click the button above to login with Google.`
            : "Something is wrong, contact the developer.";
    });
</script>

<p class="status">{authStatus}</p>
