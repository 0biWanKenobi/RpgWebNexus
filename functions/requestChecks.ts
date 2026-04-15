import type { CheckOriginResponse, CheckResponse, CheckResponseEx, ParsedRequestBody } from "./oauthTypes"

function toJsonable<T extends CheckResponse & { error: true }>(r: T) {
    const { body, status } = r;
    (r as CheckResponseEx<T>).toJson = (headers: HeadersInit) => {
        return Response.json(body, { status, headers })
    }
    return r as CheckResponseEx<T>;
}

export function checkMethod(requestMethod: string): CheckResponseEx {
    if (requestMethod === 'POST') {
        return { error: false } as CheckResponseEx
    }

    return toJsonable({
        error: true,
        status: 405,
        body: {
            google_error: 'method_not_allowed',
            google_error_description: `Method ${requestMethod} not allowed.`,
        },
    });
}

export function checkEnvFrontendOrigin(frontendOrigin?: string): CheckResponseEx<CheckOriginResponse> {
    if (frontendOrigin) {
        return { error: false, origin: frontendOrigin } as CheckResponseEx<CheckOriginResponse>
    }

    return toJsonable({
        error: true,
        status: 500,
        origin: '',
        body: {
            google_error: 'missing_frontend_return_url',
            google_error_description: 'Missing FRONTEND_RETURN_URL.',
        },
    })
}

export function checkOrigin(request: Request, frontendOrigin?: string): CheckResponseEx {
    const requestOrigin = request.headers.get('origin') ?? undefined

    if (frontendOrigin && requestOrigin === frontendOrigin) {
        return { error: false } as CheckResponseEx
    }

    return toJsonable({
        error: true,
        status: 403,
        body: {
            google_error: 'invalid_origin',
            google_error_description: `Origin ${requestOrigin ?? 'none'} not allowed.`,
        },
    })
}

export function checkHeader(request: Request): CheckResponseEx {
    if (request.headers.get('x-requested-with') === 'XmlHttpRequest') {
        return { error: false } as CheckResponseEx
    }

    return toJsonable({
        error: true,
        status: 400,
        body: {
            google_error: 'missing_csrf_header',
            google_error_description: 'Missing expected X-Requested-With header.',
        },
    })
}

export function checkError(body: ParsedRequestBody): CheckResponseEx {
    if (!body.error) {
        return { error: false } as CheckResponseEx
    }

    return toJsonable({
        error: true,
        status: 200,
        body: {
            google_error: body.error,
            google_error_description: body.errorDescription,
            google_error_uri: body.errorUri,
            google_state: body.state,
        },
    })
}

export function checkState(body: ParsedRequestBody): CheckResponseEx {
    if (body.state) {
        return { error: false } as CheckResponseEx
    }

    return toJsonable({
        error: true,
        status: 400,
        body: {
            google_error: 'missing_state',
            google_error_description: 'Google callback did not include an OAuth state value.',
        },
    })
}

export function checkCode(body: ParsedRequestBody): CheckResponseEx {
    if (body.code) {
        return { error: false } as CheckResponseEx
    }

    return toJsonable({
        error: true,
        status: 400,
        body: {
            google_error: 'missing_code',
            google_error_description: 'Google callback did not include an authorization code.',
            google_state: body.state,
        },
    })
}

export function checkCodeVerifier(body: ParsedRequestBody): CheckResponseEx {
    if (body.codeVerifier) {
        return { error: false } as CheckResponseEx
    }

    return toJsonable({
        error: true,
        status: 400,
        body: {
            google_error: 'missing_code_verifier',
            google_error_description: 'Google OAuth exchange did not include a PKCE code verifier.',
            google_state: body.state,
        },
    })
}

export function checkClientIdAndSecret(env: Env, state?: string): CheckResponseEx {
    if (env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim()) {
        return { error: false } as CheckResponseEx
    }

    return toJsonable({
        error: true,
        status: 500,
        body: {
            google_error: 'missing_server_oauth_config',
            google_error_description:
                'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in the Cloudflare environment.',
            google_state: state,
        },
    })
}