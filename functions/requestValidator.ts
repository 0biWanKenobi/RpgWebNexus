import { buildJsonHeaders } from "./headersBuilder";
import { ParsedCallbackQuery } from "./oauthTypes";
import { buildPopupCallbackHtml } from "./popupBuilder";
import { checkEnvFrontendOrigin, checkMethod, checkOrigin, checkHeader } from "./requestChecks";


function parseCallbackQuery(request: Request): ParsedCallbackQuery {
    const url = new URL(request.url)

    return {
        code: url.searchParams.get('code') ?? undefined,
        error: url.searchParams.get('error') ?? undefined,
        errorDescription: url.searchParams.get('error_description') ?? undefined,
        errorUri: url.searchParams.get('error_uri') ?? undefined,
        state: url.searchParams.get('state') ?? undefined,
    }
}

function sendPopupHtml(status: number, html: string): Response {
    return new Response(html, {
        status,
        headers: {
            'cache-control': 'no-store',
            'content-type': 'text/html; charset=utf-8',
        },
    })
}

export function validateRequest(request: Request, env: Env): Response | undefined {
    const requestMethod = request.method
    const requestOriginHeader = request.headers.get('origin') ?? '*'
    const frontendOrigin = new URL(env.FRONTEND_RETURN_URL.trim()).origin;
    const headers = buildJsonHeaders(requestOriginHeader);

    if (requestMethod === 'OPTIONS') {
        return new Response(null, { status: 204, headers })
    }

    const feOriginStatus = checkEnvFrontendOrigin(frontendOrigin)
    if (feOriginStatus.error) {
        return feOriginStatus.toJson(headers);
    }

    if (requestMethod === 'GET') {
        const popupQuery = parseCallbackQuery(request)
        return sendPopupHtml(200, buildPopupCallbackHtml(popupQuery, feOriginStatus.origin))
    }

    const methodStatus = checkMethod(requestMethod)
    if (methodStatus.error) {
        return methodStatus.toJson(headers)
    }

    const originStatus = checkOrigin(request, frontendOrigin)
    if (originStatus.error) {
        return originStatus.toJson(headers)
    }

    const headerStatus = checkHeader(request)
    if (headerStatus.error) {
        return headerStatus.toJson(headers)
    }

    return undefined;
}