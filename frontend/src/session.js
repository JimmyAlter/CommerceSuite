const TOKEN_KEY = 'commerce-token'
const USER_KEY = 'commerce-user'

// localStorage can be unavailable (private mode) or hold stale/corrupt data;
// in either case start signed out instead of crashing on load.
const safeGet = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const readStoredSession = () => {
  const token = safeGet(TOKEN_KEY)
  const raw = safeGet(USER_KEY)
  if (!token || !raw) return { token: null, user: null }
  try {
    const user = JSON.parse(raw)
    if (user && typeof user.name === 'string' && typeof user.role === 'string') return { token, user }
  } catch {
    // fall through
  }
  return { token: null, user: null }
}

export const storeSession = (token, user) => {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // The session still works for this page load.
  }
}

export const clearStoredSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    // nothing to clear
  }
}
