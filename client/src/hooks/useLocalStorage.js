import { useCallback, useState } from 'react';

/** localStorage keys for tool workspaces (Translate, Summarize). */
export const WORKSPACE_STORAGE_KEYS = {
  translate: 'pait_workspace_translate',
  summarize: 'pait_workspace_summarize',
};

export function readStoredJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStoredJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function removeStoredKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Session handoff between routes (Translate/Summarize); must not survive logout. */
export const RESTORE_SESSION_KEY = 'restoreSession';

/** User-owned persisted UI state only — not theme/language/accessibility. */
export function clearUserWorkspaceStorage() {
  Object.values(WORKSPACE_STORAGE_KEYS).forEach(removeStoredKey);
  removeStoredKey(RESTORE_SESSION_KEY);
}

function mergeRecord(stored, defaultValue) {
  if (
    stored !== null &&
    typeof stored === 'object' &&
    !Array.isArray(stored) &&
    typeof defaultValue === 'object' &&
    defaultValue !== null &&
    !Array.isArray(defaultValue)
  ) {
    return { ...defaultValue, ...stored };
  }
  return stored ?? defaultValue;
}

/**
 * State mirrored to localStorage on every update. Initial value merges persisted JSON with defaults.
 */
export function useLocalStorage(key, defaultValue) {
  const [state, setState] = useState(() => {
    const stored = readStoredJSON(key, null);
    return mergeRecord(stored, defaultValue);
  });

  const setStoredState = useCallback(
    (update) => {
      setState((prev) => {
        const next = typeof update === 'function' ? update(prev) : update;
        writeStoredJSON(key, next);
        return next;
      });
    },
    [key]
  );

  return [state, setStoredState];
}
