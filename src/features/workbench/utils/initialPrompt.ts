const INITIAL_APP_PROMPT_STORAGE_PREFIX = 'zhida.initial-app-prompt'

function getInitialAppPromptStorageKey(appId: string) {
  return `${INITIAL_APP_PROMPT_STORAGE_PREFIX}:${appId}`
}

export function saveInitialAppPrompt(appId: string, prompt: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(getInitialAppPromptStorageKey(appId), prompt)
}

export function readInitialAppPrompt(appId: string) {
  if (typeof window === 'undefined') {
    return undefined
  }

  return window.sessionStorage.getItem(getInitialAppPromptStorageKey(appId))?.trim() || undefined
}

export function clearInitialAppPrompt(appId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(getInitialAppPromptStorageKey(appId))
}
