export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4100'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Reads the `{ error }` body the API sends on 4xx/5xx, falling back to the status line.
const readError = async (response) => {
  try {
    const body = await response.json()
    if (body && typeof body.error === 'string') return body.error
  } catch {
    // Non-JSON error body (e.g. a proxy error page).
  }
  return `Request failed (${response.status})`
}

export const fetchJson = async (path, options = {}) => {
  // Pull headers out first so the rest of the options can't overwrite the merged object.
  const { headers, ...rest } = options
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status)
  }
  return response.json()
}

export const authHeaders = (token) => ({ Authorization: `Bearer ${token}` })
