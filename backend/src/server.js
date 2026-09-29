require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { db, init, seed } = require('./db')
const { parseOrigins, isAllowedOrigin, parseTrustProxy } = require('./config')

const app = express()
const port = process.env.PORT || 4100
const isProduction = process.env.NODE_ENV === 'production'

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_secret_change_me')) {
  console.error('CRITICAL ERROR: JWT_SECRET environment variable is missing or insecure in production mode!')
  process.exit(1)
}

const jwtSecret = process.env.JWT_SECRET || 'dev_secret_change_me'
const JWT_ALGORITHM = 'HS256'
// Compared against when the email is unknown, so both failure paths cost one bcrypt check.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10)

const MAX_ORDER_LINES = 50
const MAX_QUANTITY = 999
const MAX_TEXT_LENGTH = 200
const PRODUCT_STATUSES = ['active', 'inactive']
const ORDER_STATUSES = ['processing', 'fulfilled', 'cancelled']
// Allowed order status transitions. fulfilled and cancelled are final.
const ORDER_TRANSITIONS = {
  processing: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: [],
}

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0
const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0
const isShortText = (value) => typeof value === 'string' && value.trim() !== '' && value.length <= MAX_TEXT_LENGTH

// Business-rule failures raised inside a transaction; mapped to 4xx responses.
class OrderError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

init()
seed()

// Needed so express-rate-limit sees the real client IP instead of the proxy's.
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY, isProduction))

app.use(helmet())

const corsOptions = { allowed: parseOrigins(process.env.CORS_ORIGIN), production: isProduction }
app.use((req, res, next) => {
  if (isAllowedOrigin(req.headers.origin, corsOptions)) return next()
  return res.status(403).json({ error: 'Origin not allowed' })
})
app.use(cors({ origin: true }))
app.use(express.json({ limit: '200kb' }))

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || ''
  const [scheme, token, ...extra] = header.split(' ')
  if (scheme !== 'Bearer' || !token || extra.length > 0) {
    return res.status(401).json({ error: 'Missing token' })
  }
  let claims
  try {
    claims = jwt.verify(token, jwtSecret, { algorithms: [JWT_ALGORITHM] })
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
  // The token only identifies the user. Name and role are read from the database on
  // every request, so a deleted or demoted user loses access immediately.
  const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(claims.sub)
  if (!user) return res.status(401).json({ error: 'Invalid token' })
  req.user = { sub: user.id, name: user.name, role: user.role }
  return next()
}

const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  return next()
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, password } = req.body || {}
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'Missing credentials' })
  }
  if (email.length > MAX_TEXT_LENGTH || password.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: 'Invalid credentials format' })
  }

  const user = db
    .prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = ? COLLATE NOCASE')
    .get(email)

  const passwordOk = bcrypt.compareSync(password, user ? user.password_hash : DUMMY_PASSWORD_HASH)
  if (!user || !passwordOk) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = jwt.sign(
    { sub: user.id, name: user.name, role: user.role },
    jwtSecret,
    { algorithm: JWT_ALGORITHM, expiresIn: '8h' }
  )

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
})

app.get('/api/products', (req, res) => {
  const products = db
    .prepare("SELECT * FROM products WHERE status = 'active' ORDER BY name ASC")
    .all()
  res.json(products)
})

app.post('/api/products', authenticate, requireRole('admin'), (req, res) => {
  const { name, description, price_cents, sku, inventory = 0, status = 'active', category } = req.body || {}
  if (![name, sku, category].every(isShortText) || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (!isPositiveInteger(price_cents)) {
    return res.status(400).json({ error: 'price_cents must be a positive integer' })
  }
  if (!isNonNegativeInteger(inventory)) {
    return res.status(400).json({ error: 'inventory must be a non-negative integer' })
  }
  if (!PRODUCT_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${PRODUCT_STATUSES.join(', ')}` })
  }
  if (db.prepare('SELECT 1 FROM products WHERE sku = ?').get(sku)) {
    return res.status(409).json({ error: 'A product with this SKU already exists' })
  }

  const stmt = db.prepare(
    `INSERT INTO products (name, description, price_cents, sku, inventory, status, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  const info = stmt.run(name, description, price_cents, sku, inventory, status, category)

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json(product)
})

app.post('/api/orders', authenticate, (req, res) => {
  const { items, shipping, payment_method } = req.body || {}
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items are required' })
  }
  if (items.length > MAX_ORDER_LINES) {
    return res.status(400).json({ error: `An order can have at most ${MAX_ORDER_LINES} lines` })
  }
  for (const item of items) {
    if (!isPositiveInteger(item?.product_id)) {
      return res.status(400).json({ error: 'Invalid product' })
    }
    if (!isPositiveInteger(item.quantity) || item.quantity > MAX_QUANTITY) {
      return res.status(400).json({ error: `Quantity must be a whole number between 1 and ${MAX_QUANTITY}` })
    }
  }
  if (![shipping?.name, shipping?.address, shipping?.city, shipping?.country].every(isShortText)) {
    return res.status(400).json({ error: 'Shipping details are required' })
  }
  const allowedMethods = ['card', 'invoice', 'wire']
  if (payment_method && !allowedMethods.includes(payment_method)) {
    return res.status(400).json({ error: 'Invalid payment method' })
  }

  const orderNumber = `ORD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
  let totalCents = 0

  const insertOrder = db.prepare(
    `INSERT INTO orders (order_number, user_id, status, total_cents, payment_method, shipping_name, shipping_address, shipping_city, shipping_country)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price_cents)
     VALUES (?, ?, ?, ?, ?)`
  )

  const getProduct = db.prepare('SELECT id, name, price_cents, inventory, status FROM products WHERE id = ?')

  const placeOrder = db.transaction(() => {
    const info = insertOrder.run(
      orderNumber,
      req.user.sub,
      'processing',
      0,
      payment_method || 'card',
      shipping.name,
      shipping.address,
      shipping.city,
      shipping.country
    )
    const orderId = info.lastInsertRowid

    items.forEach(({ product_id, quantity }) => {
      const product = getProduct.get(product_id)
      if (!product) throw new OrderError(400, 'Invalid product')
      if (product.status !== 'active') throw new OrderError(409, `Product is not available: ${product.name}`)
      if (product.inventory < quantity) throw new OrderError(409, `Insufficient inventory for ${product.name}`)
      totalCents += product.price_cents * quantity
      insertItem.run(orderId, product.id, product.name, quantity, product.price_cents)
      db.prepare('UPDATE products SET inventory = inventory - ? WHERE id = ?').run(quantity, product.id)
    })

    db.prepare('UPDATE orders SET total_cents = ? WHERE id = ?').run(totalCents, orderId)
    return orderId
  })

  let orderId
  try {
    orderId = placeOrder()
  } catch (err) {
    if (err instanceof OrderError) return res.status(err.status).json({ error: err.message })
    throw err
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
  res.status(201).json(order)
})

app.get('/api/orders', authenticate, requireRole('admin'), (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()
  res.json(orders)
})

// Any signed-in user can list their own orders, with line items.
app.get('/api/orders/mine', authenticate, (req, res) => {
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC')
    .all(req.user.sub)
  const getItems = db.prepare(
    'SELECT product_id, product_name, quantity, unit_price_cents FROM order_items WHERE order_id = ? ORDER BY id'
  )
  res.json(orders.map((order) => ({ ...order, items: getItems.all(order.id) })))
})

app.patch('/api/orders/:id', authenticate, requireRole('admin'), (req, res) => {
  const { status } = req.body || {}
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  const orderId = Number(req.params.id)
  if (!isPositiveInteger(orderId)) return res.status(404).json({ error: 'Order not found' })

  const changeStatus = db.transaction(() => {
    const order = db.prepare('SELECT id, status FROM orders WHERE id = ?').get(orderId)
    if (!order) throw new OrderError(404, 'Order not found')
    if (!ORDER_TRANSITIONS[order.status].includes(status)) {
      throw new OrderError(409, `Cannot change an order from ${order.status} to ${status}`)
    }
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, orderId)
    if (status === 'cancelled') {
      // Put the reserved stock back, in the same transaction as the status change.
      db.prepare(
        `UPDATE products SET inventory = inventory + (
           SELECT COALESCE(SUM(quantity), 0) FROM order_items
           WHERE order_items.order_id = ? AND order_items.product_id = products.id
         )
         WHERE id IN (SELECT product_id FROM order_items WHERE order_id = ?)`
      ).run(orderId, orderId)
    }
  })

  try {
    changeStatus()
  } catch (err) {
    if (err instanceof OrderError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId))
})

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Final error handler: always answer with JSON and never leak stack traces.
// Express recognises it as an error handler because it takes four arguments.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' })
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' })
  }
  console.error(err)
  return res.status(500).json({ error: 'Internal server error' })
})

if (require.main === module) {
  app.listen(port, () => {
    console.log(`CommerceSuite API running on http://localhost:${port}`)
  })
}

module.exports = app
