// Small, pure helpers for environment-driven settings so they can be unit tested.

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

// Requests without an Origin header (curl, server-to-server) are not subject to CORS.
// Localhost origins are only accepted outside production.
const isAllowedOrigin = (origin, { allowed = [], production = false } = {}) => {
  if (!origin) return true
  if (allowed.includes(origin)) return true
  return !production && LOCAL_ORIGIN.test(origin)
}

// Value for Express's `trust proxy` setting. Render and similar hosts put one proxy
// in front of the app, so production defaults to trusting a single hop; locally the
// client IP is used as-is. TRUST_PROXY accepts a hop count, true/false, or an
// Express subnet list such as "loopback".
const parseTrustProxy = (value, production) => {
  if (value === undefined || value === '') return production ? 1 : false
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^\d+$/.test(value)) return Number(value)
  return value
}

module.exports = { parseOrigins, isAllowedOrigin, parseTrustProxy }
