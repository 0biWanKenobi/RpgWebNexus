import 'parse/dist/parse.min.js'

type ParseConfig = {
  appId: string
  javascriptKey: string
  serverUrl: string
}

let initialized = false

function getParseGlobal(): typeof import('parse').default {
  const parse = window.Parse

  if (!parse) {
    throw new Error('Parse browser bundle did not load correctly.')
  }

  return parse
}

export function getParseConfig(): ParseConfig {
  return {
    appId: import.meta.env.VITE_PARSE_APP_ID?.trim() ?? '',
    javascriptKey: import.meta.env.VITE_PARSE_JS_KEY?.trim() ?? '',
    serverUrl: import.meta.env.VITE_PARSE_SERVER_URL?.trim() ?? '',
  }
}

export function isParseConfigured(): boolean {
  const config = getParseConfig()
  return Boolean(config.appId && config.serverUrl)
}

export function initializeParse(): typeof import('parse').default {
  const Parse = getParseGlobal()

  if (initialized) {
    return Parse
  }

  const config = getParseConfig()
  if (!config.appId || !config.serverUrl) {
    throw new Error('Parse is missing VITE_PARSE_APP_ID or VITE_PARSE_SERVER_URL.')
  }

  Parse.initialize(config.appId, config.javascriptKey)
  Parse.serverURL = config.serverUrl

  initialized = true
  return Parse
}

export function getParse(): typeof import('parse').default {
  return getParseGlobal()
}
