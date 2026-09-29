const currencyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export const formatCurrency = (cents) => currencyFormat.format(cents / 100)

// SQLite's datetime('now') is UTC without a zone ("2026-09-28 19:45:16").
// Parse it as UTC and show it in the viewer's local time zone (English labels, like the rest of the UI).
export const parseSqliteDate = (value) => {
  if (typeof value !== 'string') return null
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDateTime = (value, options = { dateStyle: 'medium', timeStyle: 'short' }) => {
  const date = parseSqliteDate(value)
  return date ? new Intl.DateTimeFormat('en-US', options).format(date) : value
}

export const summarizeItems = (items = []) =>
  items.map((item) => `${item.quantity} × ${item.product_name}`).join(', ')
