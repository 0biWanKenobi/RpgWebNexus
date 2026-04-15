import type { ParsedCallbackQuery } from "./oauthTypes"


const googlePopupMessageSource = 'rpg-web-nexus-google-oauth'

function serializeForInlineScript(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029')
}

export function buildPopupCallbackHtml(body: ParsedCallbackQuery, origin: string): string {
    const payload = {
        source: googlePopupMessageSource,
        code: body.code,
        state: body.state,
        error: body.error,
        error_description: body.errorDescription,
        error_uri: body.errorUri,
    }

    const serializedPayload = serializeForInlineScript(payload)
    const serializedOrigin = serializeForInlineScript(origin)

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Google login</title>
  </head>
  <body>
    <p>Completing Google login...</p>
    <script>
      const payload = ${serializedPayload};
      const targetOrigin = ${serializedOrigin};

      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(payload, targetOrigin);
      }

      window.close();
    </script>
  </body>
</html>`
}