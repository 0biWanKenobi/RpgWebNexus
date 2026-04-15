export function buildJsonHeaders(origin: string): HeadersInit {
    return {
        'access-control-allow-origin': origin,
        'access-control-allow-headers': 'content-type,x-requested-with',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-credentials': 'false',
        'content-type': 'application/json',
        vary: 'Origin',
    }
}