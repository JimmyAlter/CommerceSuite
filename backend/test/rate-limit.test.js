const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')

// Separate file (and so a separate process) so the login budget is fresh.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'commercesuite-rl-'))
process.env.DB_PATH = path.join(tmpDir, 'rl.db')
process.env.JWT_SECRET = 'test-secret'

const app = require('../src/server')
const { db } = require('../src/db')

test('login is limited to 20 attempts per minute per client', async (t) => {
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve))
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
  const url = `http://127.0.0.1:${server.address().port}/api/auth/login`
  const attempt = () =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'nobody@example.com', password: 'x' }) })

  for (let i = 0; i < 20; i++) assert.equal((await attempt()).status, 401, `attempt ${i + 1}`)
  const limited = await attempt()
  assert.equal(limited.status, 429)
  assert.ok(limited.headers.get('ratelimit') || limited.headers.get('ratelimit-limit'), 'standard rate limit headers')
})
