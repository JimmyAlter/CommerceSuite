const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const Database = require('better-sqlite3')

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'commercesuite-db-'))
process.env.DB_PATH = path.join(tmpDir, 'schema.db')

const { db, init, seed } = require('../src/db')

init()
seed()

test.after(() => {
  db.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

const product = () => db.prepare('SELECT * FROM products ORDER BY id LIMIT 1').get()

test('an empty database is seeded with both demo users and the catalog', () => {
  const roles = db.prepare('SELECT role FROM users ORDER BY role').all().map((u) => u.role)
  assert.deepEqual(roles, ['admin', 'customer'])
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM products').get().n, 12)
  seed()
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 2, 'seeding twice is a no-op')
})

test('foreign keys are enforced', () => {
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1)
  assert.throws(
    () => db.prepare(
      'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price_cents) VALUES (?, ?, ?, ?, ?)'
    ).run(999999, product().id, 'Ghost', 1, 100),
    /FOREIGN KEY constraint failed/
  )
  assert.throws(
    () => db.prepare(
      `INSERT INTO orders (order_number, user_id, status, total_cents, payment_method, shipping_name, shipping_address, shipping_city, shipping_country)
       VALUES ('ORD-FK', 999999, 'processing', 0, 'card', 'a', 'b', 'c', 'd')`
    ).run(),
    /FOREIGN KEY constraint failed/
  )
})

test('CHECK constraints reject impossible values', () => {
  const { id } = product()
  assert.throws(() => db.prepare('UPDATE products SET inventory = -1 WHERE id = ?').run(id), /CHECK constraint failed/)
  assert.throws(() => db.prepare('UPDATE products SET price_cents = 0 WHERE id = ?').run(id), /CHECK constraint failed/)
  assert.throws(() => db.prepare("UPDATE products SET status = 'deleted' WHERE id = ?").run(id), /CHECK constraint failed/)
  assert.throws(() => db.prepare(
    `INSERT INTO orders (order_number, user_id, status, total_cents, payment_method, shipping_name, shipping_address, shipping_city, shipping_country)
     VALUES ('ORD-CK', 1, 'refunded', 0, 'card', 'a', 'b', 'c', 'd')`
  ).run(), /CHECK constraint failed/)
})

test('a database created with the old schema still opens and seeds', () => {
  const legacyPath = path.join(tmpDir, 'legacy.db')
  const legacy = new Database(legacyPath)
  legacy.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT NOT NULL,
      price_cents INTEGER NOT NULL, sku TEXT NOT NULL UNIQUE, inventory INTEGER NOT NULL, status TEXT NOT NULL, category TEXT NOT NULL);
    CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL,
      status TEXT NOT NULL, total_cents INTEGER NOT NULL, payment_method TEXT NOT NULL, shipping_name TEXT NOT NULL,
      shipping_address TEXT NOT NULL, shipping_city TEXT NOT NULL, shipping_country TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price_cents INTEGER NOT NULL);
  `)
  legacy.close()

  // Run init + seed in a fresh process, the way the server does on boot.
  const script = "const { db, init, seed } = require('./src/db'); init(); seed(); console.log(db.prepare('SELECT COUNT(*) AS n FROM products').get().n)"
  const out = execFileSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DB_PATH: legacyPath },
    encoding: 'utf8',
  })
  assert.equal(out.trim(), '12')
})
