import type { ParsedRequestBody } from "./oauthTypes"

export async function parseRequestBody(request: Request): Promise<ParsedRequestBody> {
    const formData = await request.formData()

    return {
        code: readFormString(formData, 'code'),
        codeVerifier: readFormString(formData, 'code_verifier'),
        error: readFormString(formData, 'error'),
        errorDescription: readFormString(formData, 'error_description'),
        errorUri: readFormString(formData, 'error_uri'),
        state: readFormString(formData, 'state'),
        setupId: readFormString(formData, 'setup_id'),
        setupPassword: readFormString(formData, 'setup_password'),
    }
}

function readFormString(formData: FormData, key: string): string | undefined {
    const value = formData.get(key)
    return typeof value === 'string' ? value : undefined
}