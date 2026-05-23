import { GoogleTokenResponse } from "./oauthTypes"

async function exchangeGoogleCode(
    env: Env,
    refreshToken: string,
): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
    })

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
        },
        body,
    })

    return (await tokenResponse.json()) as GoogleTokenResponse
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {


    const params: Record<string, string> = await request.json()
    if (!("refresh_token" in params)) {
        return Response.json({
            success: false,
            error: "Missing refresh token"
        })
    }

    var tokens = await exchangeGoogleCode(env, params.refresh_token);
    const expiresAt = Date.now() + ((tokens.expires_in ?? 0) * 1000);

    return Response.json({
        success: !tokens.error,
        error: tokens.error,
        accessToken: tokens.access_token,
        expiresAt
    })
}