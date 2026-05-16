import { parseRequestBody } from './bodyParser'
import { validateRequestBody } from './bodyValidator'
import { buildJsonHeaders } from './headersBuilder'
import type { GoogleTokenResponse } from './oauthTypes'
import { encryptObjectToBase64 } from 'rpg_shared/sync'
import { validateRequest } from './requestValidator'

async function exchangeGoogleCode(
    env: Env,
    code: string,
    codeVerifier: string
): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: env.GOOGLE_REDIRECT_URI,
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

    const responseToInvalidRequest = validateRequest(request, env);
    if (responseToInvalidRequest) return responseToInvalidRequest;

    const requestOriginHeader = request.headers.get('origin') ?? '*'
    const headers = buildJsonHeaders(requestOriginHeader);
    const body = await parseRequestBody(request)

    const responseToInvalidBody = validateRequestBody(body, headers);
    if (responseToInvalidBody) return responseToInvalidBody;

    const code = body.code as string
    const codeVerifier = body.codeVerifier as string

    try {
        const tokens = await exchangeGoogleCode(env, code, codeVerifier)
        const expiresAt = Date.now() + ((tokens.expires_in ?? 0) * 1000)

        const baseResponse = {
            google_expires_in: tokens.expires_in?.toString(),
            google_scope: tokens.scope,
            google_state: body.state,
            google_token_error: tokens.error,
            google_token_error_description: tokens.error_description,
            google_token_error_uri: tokens.error_uri,
            google_token_type: tokens.token_type,
        }

        if (
            body.setupId &&
            body.setupPassword &&
            tokens.access_token &&
            !tokens.error
        ) {
            const encryptedPayload = await encryptObjectToBase64(
                body.setupPassword,
                {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    tokenType: tokens.token_type ?? '',
                    scope: tokens.scope ?? '',
                    expiresAt,
                },
            )

            return Response.json(
                {
                    ...baseResponse,
                    google_encrypted_payload: encryptedPayload,
                    google_setup_id: body.setupId,
                },
                {
                    status: 200,
                    headers,
                }
            )
        }

        return Response.json(
            {
                ...baseResponse,
                google_access_token: tokens.access_token,
                google_refresh_token: tokens.refresh_token,
            },
            {
                status: 200,
                headers,
            }
        )
    } catch (error) {
        return Response.json(
            {
                google_error: 'token_exchange_failed',
                google_error_description:
                    error instanceof Error ? error.message : 'Unexpected token exchange failure.',
                google_state: body.state,
            },
            {
                status: 500,
                headers: buildJsonHeaders(requestOriginHeader),
            }
        )
    }
}
