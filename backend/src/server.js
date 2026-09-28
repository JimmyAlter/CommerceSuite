require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { db, init, seed } = require('./db')

const app = express()
const port = process.env.PORT || 4100

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_secret_change_me')) {
  console.error('CRITICAL ERROR: JWT_SECRET environment variable is missing or insecure in production mode!')
  process.exit(1)
}

const jwtSecret = process.env.JWT_SECRET || 'dev_secret_change_me'

const MAX_ORDER_LINES = 50
const MAX_QUANTITY = 999
const MAX_TEXT_LENGTH = 200
const PRODUCT_STATUSES = ['active', 'inactive']

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

app.use(helmet())
const allowOrigin = (origin) => {
  if (!origin) return true
  if (origin.startsWith('http://localhost:')) return true
  if (origin.startsWith('http://127.0.0.1:')) return true
  return origin === process.env.CORS_ORIGIN
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (allowOrigin(origin)) return callback(null, true)
      return callback(new Error('Not allowed by CORS'))
    },
  })
)
app.use(express.json({ limit: '200kb' }))

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || ''
  const [, token] = header.split(' ')
  if (!token) return res.status(401).json({ error: 'Missing token' })
  try {
    req.user = jwt.verify(token, jwtSecret)
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
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
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' })

  const user = db
    .prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = ?')
    .get(email)

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = jwt.sign(
    { sub: user.id, name: user.name, role: user.role },
    jwtSecret,
    { expiresIn: '8h' }
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

  const getProduct = db.prepare('SELECT id, name, price_cents, inventory FROM products WHERE id = ?')

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

app.patch('/api/orders/:id', authenticate, requireRole('admin'), (req, res) => {
  const { status } = req.body || {}
  const allowed = ['processing', 'fulfilled', 'cancelled']
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  const { changes } = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id)
  if (changes === 0) return res.status(404).json({ error: 'Order not found' })
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  res.json(order)
})

if (require.main === module) {
  app.listen(port, () => {
    console.log(`CommerceSuite API running on http://localhost:${port}`)
  })
}

module.exports = app
