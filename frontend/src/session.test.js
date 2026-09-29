import { afterEach, describe, expect, it } from 'vitest'
import { clearStoredSession, readStoredSession, storeSession } from './session'

const memoryStorage = () => {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  }
}

afterEach(() => {
  delete globalThis.localStorage
})

describe('stored session', () => {
  it('round-trips a token and user', () => {
    globalThis.localStorage = memoryStorage()
    storeSession('abc', { id: 1, name: 'Store Admin', role: 'admin' })
    expect(readStoredSession()).toEqual({ token: 'abc', user: { id: 1, name: 'Store Admin', role: 'admin' } })
    clearStoredSession()
    expect(readStoredSession()).toEqual({ token: null, user: null })
  })

  it('treats corrupt user JSON as signed out', () => {
    globalThis.localStorage = memoryStorage()
    localStorage.setItem('commerce-token', 'abc')
    localStorage.setItem('commerce-user', '{not json')
    expect(readStoredSession()).toEqual({ token: null, user: null })
  })

  it('survives localStorage throwing', () => {
    globalThis.localStorage = { getItem: () => { throw new Error('denied') } }
    expect(readStoredSession()).toEqual({ token: null, user: null })
  })
})
