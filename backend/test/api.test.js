const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const jwt = require('jsonwebtoken')

// Each run gets its own throwaway SQLite file, seeded by the server on load.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'commercesuite-'))
process.env.DB_PATH = path.join(tmpDir, 'test.db')
process.env.JWT_SECRET = 'test-secret'

const app = require('../src/server')
const { db } = require('../src/db')

let server
let baseUrl

test.before(async () => {
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

test.after(async () => {
  await new Promise((resolve) => server.close(resolve))
  db.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

const request = async (method, url, { token, body } = {}) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(baseUrl + url, { method, headers, body: body && JSON.stringify(body) })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, body: json }
}

const login = async (email) => {
  const res = await request('POST', '/api/auth/login', { body: { email, password: 'demo123' } })
  assert.equal(res.status, 200, `login ${email}`)
  return res.body.token
}
// Login is rate limited (20/min per client), so each role signs in once per run.
const tokens = {}
const cachedLogin = async (email) => (tokens[email] ??= await login(email))
const adminToken = () => cachedLogin('admin@commercesuite.dev')
const buyerToken = () => cachedLogin('buyer@commercesuite.dev')

const shipping = { name: 'Receiving Dock', address: '100 Example Ave', city: 'Springfield', country: 'US' }
const productById = (id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id)
const firstProduct = () => db.prepare("SELECT * FROM products WHERE status = 'active' AND inventory > 5 ORDER BY id LIMIT 1").get()

test('health check responds without auth', async () => {
  const res = await request('GET', '/api/health')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { status: 'ok' })
})

test('catalog is public and only lists active products', async () => {
  const res = await request('GET', '/api/products')
  assert.equal(res.status, 200)
  assert.ok(res.body.length > 0)
  assert.ok(res.body.every((p) => p.status === 'active'))
})

test('admin routes reject buyers and anonymous callers', async () => {
  const buyer = await buyerToken()
  assert.equal((await request('GET', '/api/orders')).status, 401)
  assert.equal((await request('GET', '/api/orders', { token: buyer })).status, 403)
  assert.equal((await request('PATCH', '/api/orders/1', { token: buyer, body: { status: 'fulfilled' } })).status, 403)
  assert.equal((await request('POST', '/api/products', { token: buyer, body: {} })).status, 403)
})

test('order totals come from server prices, not from the client', async () => {
  const buyer = await buyerToken()
  const product = firstProduct()
  const res = await request('POST', '/api/orders', {
    token: buyer,
    body: { items: [{ product_id: product.id, quantity: 2, price_cents: 1 }], shipping },
  })
  assert.equal(res.status, 201)
  assert.equal(res.body.total_cents, product.price_cents * 2)
  assert.equal(productById(product.id).inventory, product.inventory - 2)
})

test('ordering more than the stock is refused and nothing is written', async () => {
  const buyer = await buyerToken()
  const product = firstProduct()
  const ordersBefore = db.prepare('SELECT COUNT(*) AS n FROM orders').get().n
  const res = await request('POST', '/api/orders', {
    token: buyer,
    body: { items: [{ product_id: product.id, quantity: product.inventory + 1 }], shipping },
  })
  assert.equal(res.status, 409)
  assert.match(res.body.error, /Insufficient inventory/)
  assert.equal(productById(product.id).inventory, product.inventory)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, ordersBefore)
})

test('unknown products are a 400, not a server error', async () => {
  const buyer = await buyerToken()
  const res = await request('POST', '/api/orders', { token: buyer, body: { items: [{ product_id: 999999, quantity: 1 }], shipping } })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /Invalid product/)
})

test('quantities must be whole numbers between 1 and 999', async () => {
  const buyer = await buyerToken()
  const product = firstProduct()
  for (const quantity of ['abc', 0, -3, 1.5, 1000, null]) {
    const res = await request('POST', '/api/orders', { token: buyer, body: { items: [{ product_id: product.id, quantity }], shipping } })
    assert.equal(res.status, 400, `quantity ${JSON.stringify(quantity)}`)
  }
  assert.equal(productById(product.id).inventory, product.inventory, 'inventory untouched')
})

test('shipping details and payment method are validated', async () => {
  const buyer = await buyerToken()
  const product = firstProduct()
  const items = [{ product_id: product.id, quantity: 1 }]
  assert.equal((await request('POST', '/api/orders', { token: buyer, body: { items, shipping: { ...shipping, city: '' } } })).status, 400)
  assert.equal((await request('POST', '/api/orders', { token: buyer, body: { items, shipping, payment_method: 'crypto' } })).status, 400)
  assert.equal((await request('POST', '/api/orders', { token: buyer, body: { items: [], shipping } })).status, 400)
})

const placeOrder = async (quantity = 1) => {
  const product = firstProduct()
  const res = await request('POST', '/api/orders', {
    token: await buyerToken(),
    body: { items: [{ product_id: product.id, quantity }], shipping },
  })
  assert.equal(res.status, 201)
  return { order: res.body, product }
}
const setStatus = async (id, status) =>
  request('PATCH', `/api/orders/${id}`, { token: await adminToken(), body: { status } })

test('processing orders can be fulfilled, and fulfilled is final', async () => {
  const { order } = await placeOrder()
  const ok = await setStatus(order.id, 'fulfilled')
  assert.equal(ok.status, 200)
  assert.equal(ok.body.status, 'fulfilled')
  for (const next of ['processing', 'cancelled', 'fulfilled']) {
    const res = await setStatus(order.id, next)
    assert.equal(res.status, 409, `fulfilled -> ${next}`)
    assert.match(res.body.error, /Cannot change an order from fulfilled/)
  }
})

test('cancelling an order puts its stock back, and cancelled is final', async () => {
  const { order, product } = await placeOrder(3)
  assert.equal(productById(product.id).inventory, product.inventory - 3)

  const res = await setStatus(order.id, 'cancelled')
  assert.equal(res.status, 200)
  assert.equal(res.body.status, 'cancelled')
  assert.equal(productById(product.id).inventory, product.inventory, 'stock restored')

  for (const next of ['processing', 'fulfilled', 'cancelled']) {
    assert.equal((await setStatus(order.id, next)).status, 409, `cancelled -> ${next}`)
  }
  assert.equal(productById(product.id).inventory, product.inventory, 'stock not restored twice')
})

test('status changes validate the value and the order id', async () => {
  const { order } = await placeOrder()
  assert.equal((await setStatus(order.id, 'refunded')).status, 400)
  assert.equal((await setStatus(order.id, 'processing')).status, 409, 'processing -> processing')
  assert.equal((await setStatus(999999, 'fulfilled')).status, 404)
  assert.equal((await setStatus('abc', 'fulfilled')).status, 404)
})

test('product creation validates prices, stock and duplicate SKUs', async () => {
  const admin = await adminToken()
  const valid = { name: 'USB-C Dock', description: 'Dual display dock', price_cents: 18900, sku: 'DOCK-TEST-1', inventory: 10, category: 'Accessories' }

  const created = await request('POST', '/api/products', { token: admin, body: valid })
  assert.equal(created.status, 201)
  assert.equal(created.body.sku, 'DOCK-TEST-1')

  assert.equal((await request('POST', '/api/products', { token: admin, body: valid })).status, 409)
  for (const bad of [{ price_cents: -5 }, { price_cents: 12.5 }, { price_cents: 'free' }, { inventory: -1 }, { status: 'deleted' }]) {
    const res = await request('POST', '/api/products', { token: admin, body: { ...valid, sku: `SKU-${Math.random()}`, ...bad } })
    assert.equal(res.status, 400, JSON.stringify(bad))
  }
})

test('login rejects non-string credentials with a JSON 400', async () => {
  for (const body of [{ email: { a: 1 }, password: 'demo123' }, { email: 'buyer@commercesuite.dev', password: 123 }, { email: ['x'], password: ['y'] }, { email: 'a'.repeat(201), password: 'demo123' }, {}]) {
    const res = await request('POST', '/api/auth/login', { body })
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.equal(typeof res.body.error, 'string')
  }
})

test('malformed JSON is a 400 with a JSON body, not a stack trace', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"email": ',
  })
  assert.equal(res.status, 400)
  assert.match(res.headers.get('content-type'), /application\/json/)
  assert.deepEqual(await res.json(), { error: 'Malformed JSON body' })
})

test('unknown routes return a JSON 404', async () => {
  const res = await request('GET', '/api/does-not-exist')
  assert.equal(res.status, 404)
  assert.deepEqual(res.body, { error: 'Not found' })
})

test('requests from unknown origins get a JSON 403 instead of a 500', async () => {
  const res = await fetch(`${baseUrl}/api/products`, { headers: { Origin: 'https://evil.example' } })
  assert.equal(res.status, 403)
  assert.deepEqual(await res.json(), { error: 'Origin not allowed' })

  const preflight = await fetch(`${baseUrl}/api/orders`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' },
  })
  assert.equal(preflight.status, 403)
})

test('local dev origins are allowed outside production and echoed back', async () => {
  const res = await fetch(`${baseUrl}/api/products`, { headers: { Origin: 'http://localhost:5173' } })
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173')
})

const rawGet = async (url, authorization) => {
  const res = await fetch(baseUrl + url, { headers: { Authorization: authorization } })
  return { status: res.status, body: await res.json() }
}

test('invalid, expired, unsigned and non-Bearer tokens are all 401', async () => {
  const admin = await adminToken()
  const claims = { sub: 1, name: 'Store Admin', role: 'admin' }
  const expired = jwt.sign({ ...claims, exp: Math.floor(Date.now() / 1000) - 60 }, 'test-secret')
  const wrongSecret = jwt.sign(claims, 'not-the-secret')
  const unsigned = jwt.sign(claims, null, { algorithm: 'none' })
  const hs512 = jwt.sign(claims, 'test-secret', { algorithm: 'HS512' })

  const cases = {
    garbage: 'Bearer not-a-jwt',
    expired: `Bearer ${expired}`,
    wrongSecret: `Bearer ${wrongSecret}`,
    algNone: `Bearer ${unsigned}`,
    otherAlgorithm: `Bearer ${hs512}`,
    basicScheme: `Basic ${admin}`,
    noScheme: admin,
    extraParts: `Bearer ${admin} extra`,
  }
  for (const [name, authorization] of Object.entries(cases)) {
    const res = await rawGet('/api/orders', authorization)
    assert.equal(res.status, 401, name)
    assert.equal(typeof res.body.error, 'string', name)
  }
  assert.equal((await rawGet('/api/orders', `Bearer ${admin}`)).status, 200, 'valid token still works')
})

test('unknown emails and wrong passwords get the same 401', async () => {
  const unknown = await request('POST', '/api/auth/login', { body: { email: 'nobody@commercesuite.dev', password: 'demo123' } })
  const wrong = await request('POST', '/api/auth/login', { body: { email: 'buyer@commercesuite.dev', password: 'nope' } })
  assert.equal(unknown.status, 401)
  assert.deepEqual(unknown.body, wrong.body)
})

test('orders are limited to 50 lines', async () => {
  const buyer = await buyerToken()
  const product = firstProduct()
  const items = Array.from({ length: 51 }, () => ({ product_id: product.id, quantity: 1 }))
  const res = await request('POST', '/api/orders', { token: buyer, body: { items, shipping } })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /at most 50 lines/)
  assert.equal(productById(product.id).inventory, product.inventory)
})

test('order and product payloads with the wrong types are 400s', async () => {
  const buyer = await buyerToken()
  const admin = await adminToken()
  const product = firstProduct()
  const orderBodies = [
    { items: 'all of them', shipping },
    { items: [null], shipping },
    { items: [{ product_id: '1', quantity: 1 }], shipping },
    { items: [{ product_id: product.id, quantity: 1 }], shipping: 'dock 4' },
    { items: [{ product_id: product.id, quantity: 1 }], shipping: { ...shipping, name: { first: 'a' } } },
    { items: [{ product_id: product.id, quantity: 1 }], shipping: { ...shipping, city: 'x'.repeat(201) } },
    { items: [{ product_id: product.id, quantity: 1 }], shipping, payment_method: ['card'] },
  ]
  for (const body of orderBodies) {
    assert.equal((await request('POST', '/api/orders', { token: buyer, body })).status, 400, JSON.stringify(body))
  }
  const valid = { name: 'Cable', description: 'USB-C cable', price_cents: 900, sku: 'CBL-1', category: 'Accessories' }
  for (const bad of [{ name: 42 }, { description: ['x'] }, { sku: null }, { category: { a: 1 } }, { inventory: '10' }]) {
    assert.equal((await request('POST', '/api/products', { token: admin, body: { ...valid, ...bad } })).status, 400, JSON.stringify(bad))
  }
})

test('buyers can list their own orders with line items, and only their own', async () => {
  const { order, product } = await placeOrder(2)
  const buyerId = db.prepare('SELECT id FROM users WHERE email = ?').get('buyer@commercesuite.dev').id
  const adminId = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@commercesuite.dev').id

  const mine = await request('GET', '/api/orders/mine', { token: await buyerToken() })
  assert.equal(mine.status, 200)
  assert.ok(mine.body.length > 0)
  assert.ok(mine.body.every((o) => o.user_id === buyerId))
  const listed = mine.body.find((o) => o.id === order.id)
  assert.deepEqual(listed.items, [
    { product_id: product.id, product_name: product.name, quantity: 2, unit_price_cents: product.price_cents },
  ])

  const adminMine = await request('GET', '/api/orders/mine', { token: await adminToken() })
  assert.equal(adminMine.status, 200)
  assert.ok(adminMine.body.every((o) => o.user_id === adminId))
  assert.equal((await request('GET', '/api/orders/mine')).status, 401)
})
