const test = require('node:test')
const assert = require('node:assert/strict')
const { parseOrigins, isAllowedOrigin, parseTrustProxy } = require('../src/config')

test('CORS_ORIGIN accepts a comma-separated list', () => {
  assert.deepEqual(parseOrigins('https://a.example, https://b.example,'), ['https://a.example', 'https://b.example'])
  assert.deepEqual(parseOrigins(undefined), [])
})

test('configured origins are allowed in every environment', () => {
  const allowed = ['https://commercesuite-demo.vercel.app']
  assert.equal(isAllowedOrigin('https://commercesuite-demo.vercel.app', { allowed, production: true }), true)
  assert.equal(isAllowedOrigin('https://evil.example', { allowed, production: true }), false)
  assert.equal(isAllowedOrigin(undefined, { allowed, production: true }), true, 'no Origin header')
})

test('localhost origins are only allowed outside production', () => {
  for (const origin of ['http://localhost:5173', 'http://127.0.0.1:4173', 'http://localhost']) {
    assert.equal(isAllowedOrigin(origin, { production: false }), true, origin)
    assert.equal(isAllowedOrigin(origin, { production: true }), false, origin)
  }
  assert.equal(isAllowedOrigin('http://localhost.evil.example', { production: false }), false)
})

test('trust proxy defaults to one hop in production and off elsewhere', () => {
  assert.equal(parseTrustProxy(undefined, true), 1)
  assert.equal(parseTrustProxy(undefined, false), false)
  assert.equal(parseTrustProxy('2', false), 2)
  assert.equal(parseTrustProxy('false', true), false)
  assert.equal(parseTrustProxy('true', false), true)
  assert.equal(parseTrustProxy('loopback', true), 'loopback')
})
