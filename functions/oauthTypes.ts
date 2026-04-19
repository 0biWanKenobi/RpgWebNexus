export type GoogleTokenResponse = {
    access_token?: string
    expires_in?: number
    id_token?: string
    refresh_token?: string
    scope?: string
    token_type?: string
    error?: string
    error_description?: string
    error_uri?: string
}

export type JsonResponseBody = Record<string, string | undefined | boolean>
export type ParsedRequestBody = {
    code?: string
    codeVerifier?: string
    error?: string
    errorDescription?: string
    errorUri?: string
    state?: string
    setupId?: string
    setupPassword?: string
}
export type ParsedCallbackQuery = {
    code?: string
    error?: string
    errorDescription?: string
    errorUri?: string
    state?: string
}
export type CheckResponse = { error: true; status: number; body: JsonResponseBody }
    | { error: false, status?: number, body?: JsonResponseBody }


export type CheckResponseEx<T = CheckResponse> = T extends CheckResponse ? T & {
    toJson: (headers: HeadersInit) => Response
} : never;

export type CheckOriginResponse = CheckResponse & { origin: string }
