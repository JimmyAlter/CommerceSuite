const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'data', 'commercesuite.db')

// Ensure target database directory exists
const dir = path.dirname(dbPath)
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

const init = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      inventory INTEGER NOT NULL,
      status TEXT NOT NULL,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      total_cents INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      shipping_name TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      shipping_city TEXT NOT NULL,
      shipping_country TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL
    );
  `)
}

const seed = () => {
  const count = db.prepare('SELECT COUNT(*) as total FROM users').get()
  if (count.total > 0) return

  const passwordHash = bcrypt.hashSync('demo123', 10)
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)'
  )
  insertUser.run('Store Admin', 'admin@commercesuite.dev', 'admin', passwordHash)
  insertUser.run('Retail Buyer', 'buyer@commercesuite.dev', 'customer', passwordHash)

  const insertProduct = db.prepare(
    `INSERT INTO products (name, description, price_cents, sku, inventory, status, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  insertProduct.run(
    'Ledger Pro Laptop',
    '14-inch business laptop with extended battery and secure boot.',
    129900,
    'LED-1400',
    42,
    'active',
    'Hardware'
  )
  insertProduct.run(
    'Nimbus Docking Station',
    'USB-C dock with dual display support and power delivery.',
    18900,
    'NIM-DOCK',
    120,
    'active',
    'Accessories'
  )
  insertProduct.run(
    'Atlas Monitor 27"',
    'Calibrated IPS monitor for color-accurate workflows.',
    35900,
    'ATL-27M',
    64,
    'active',
    'Displays'
  )
  insertProduct.run(
    'Signal Router X2',
    'Enterprise router with multi-tenant management.',
    49900,
    'SIG-X2',
    18,
    'active',
    'Network'
  )
  insertProduct.run(
    'Summit Security Kit',
    'Endpoint security bundle with policy controls.',
    8900,
    'SUM-SEC',
    250,
    'active',
    'Software'
  )
  insertProduct.run(
    'Vertex Ergonomic Keyboard',
    'Split-layout mechanical keyboard with programmable keys and wrist rest.',
    12900,
    'VTX-KB1',
    85,
    'active',
    'Accessories'
  )
  insertProduct.run(
    'Prism Wireless Mouse',
    'Precision wireless mouse with 16K DPI sensor and USB-C charging.',
    6900,
    'PRM-M01',
    200,
    'active',
    'Accessories'
  )
  insertProduct.run(
    'Beacon USB-C Hub',
    'Compact 7-in-1 hub with HDMI, Ethernet, and SD card reader.',
    4900,
    'BCN-HUB7',
    310,
    'active',
    'Accessories'
  )
  insertProduct.run(
    'Forge SSD 2TB',
    'NVMe M.2 solid-state drive with hardware encryption and 7000 MB/s reads.',
    19900,
    'FRG-SSD2',
    55,
    'active',
    'Hardware'
  )
  insertProduct.run(
    'Meridian Webcam Pro',
    '4K autofocus webcam with dual microphones and privacy shutter.',
    14900,
    'MRD-WC4K',
    130,
    'active',
    'Peripherals'
  )
  insertProduct.run(
    'Pulse Noise-Cancel Headset',
    'Wireless ANC headset with 40-hour battery and multipoint Bluetooth.',
    24900,
    'PLS-ANC1',
    72,
    'active',
    'Peripherals'
  )
  insertProduct.run(
    'CloudVault Backup License',
    '1-year cloud backup license with 5TB storage and ransomware protection.',
    3900,
    'CLV-BK1Y',
    999,
    'active',
    'Software'
  )
}

module.exports = {
  db,
  init,
  seed,
}
