// localStorage can be missing or blocked (private mode), so every call is guarded.
function store() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  } catch (e) {
    // blocked
  }
  return null
}

export function loadJSON(key, fallback, storage = store()) {
  try {
    if (!storage) return fallback
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (e) {
    return fallback
  }
}

export function saveJSON(key, value, storage = store()) {
  try {
    if (!storage) return false
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    return false
  }
}

export function removeKey(key, storage = store()) {
  try {
    if (storage) storage.removeItem(key)
  } catch (e) {
    // ignore
  }
}
