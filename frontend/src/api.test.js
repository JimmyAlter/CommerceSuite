import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, fetchJson } from './api'

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchJson', () => {
  it('keeps Content-Type when the caller also sends Authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { id: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchJson('/api/orders', {
      method: 'POST',
      headers: { Authorization: 'Bearer abc' },
      body: JSON.stringify({ items: [] }),
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/orders$/)
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"items":[]}')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc',
    })
  })

  it('sends Content-Type when no headers are passed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []))
    vi.stubGlobal('fetch', fetchMock)

    await fetchJson('/api/products')

    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('surfaces the server error message and status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(409, { error: 'Insufficient inventory for Forge SSD 2TB' })))

    const err = await fetchJson('/api/orders', { method: 'POST' }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(409)
    expect(err.message).toBe('Insufficient inventory for Forge SSD 2TB')
  })

  it('falls back to a generic message for non-JSON errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 })))

    const err = await fetchJson('/api/products').catch((e) => e)
    expect(err.message).toBe('Request failed (502)')
  })
})
