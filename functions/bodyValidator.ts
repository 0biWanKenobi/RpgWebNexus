import { env } from "cloudflare:workers";
import { ParsedRequestBody } from "./oauthTypes";
import {
    checkError,
    checkState,
    checkCode,
    checkCodeVerifier,
    checkClientIdAndSecret,
    checkSetupEncryption,
} from "./requestChecks";

export function validateRequestBody(body: ParsedRequestBody, headers: HeadersInit): Response | undefined {
    const errorState = checkError(body)
    if (errorState.error) {
        return errorState.toJson(headers)
    }

    const stateState = checkState(body)
    if (stateState.error) {
        return stateState.toJson(headers)
    }

    const codeState = checkCode(body)
    if (codeState.error) {
        return codeState.toJson(headers)
    }

    const codeVerifierState = checkCodeVerifier(body)
    if (codeVerifierState.error) {
        return codeVerifierState.toJson(headers)
    }

    const setupEncryptionState = checkSetupEncryption(body)
    if (setupEncryptionState.error) {
        return setupEncryptionState.toJson(headers)
    }

    const clientIdAndSecretState = checkClientIdAndSecret(env, body.state)
    if (clientIdAndSecretState.error) {
        return clientIdAndSecretState.toJson(headers)
    }
}