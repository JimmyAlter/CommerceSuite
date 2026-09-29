import { test, expect } from '@playwright/test'

// Must match API_PORT in playwright.config.js.
const API = 'http://localhost:4320'
const shipping = { name: 'Receiving Dock', address: '100 Example Ave', city: 'Springfield', country: 'US' }

const signIn = async (page, role) => {
  await page.locator('.nav-right').getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: `Sign in as ${role}` }).click()
  await expect(page.locator('.user-chip')).toBeVisible()
}

// Filters the catalog down to one product and returns its card.
const findProduct = async (page, name) => {
  await page.getByLabel('Search').first().fill(name)
  const card = page.locator('.product-card', { hasText: name })
  await expect(card).toHaveCount(1)
  return card
}

const stockOf = async (card) => {
  const text = await card.locator('.product-meta').innerText()
  return Number(text.match(/(\d+) in stock/)[1])
}

test('a buyer can sign in, check out, and see the order in My Orders', async ({ page }) => {
  await page.goto('/')
  await signIn(page, 'buyer')
  await expect(page.getByRole('heading', { name: 'My Orders' })).toBeVisible()

  const card = await findProduct(page, 'Atlas Monitor')
  const stockBefore = await stockOf(card)
  await card.getByRole('button', { name: 'Add to cart' }).click()
  await page.getByRole('button', { name: 'Add one Atlas Monitor 27"' }).click()

  // Regression: checkout used to fail with 400 because the Authorization
  // header replaced Content-Type.
  await page.getByRole('button', { name: 'Proceed to checkout' }).click()
  const dialog = page.getByRole('dialog', { name: 'Checkout' })
  await dialog.getByLabel('Full name').fill(shipping.name)
  await dialog.getByLabel('Address').fill(shipping.address)
  await dialog.getByLabel('City').fill(shipping.city)
  await dialog.getByLabel('Country').fill(shipping.country)
  await dialog.getByRole('button', { name: 'Place order' }).click()

  const confirmation = page.locator('.banner.success')
  await expect(confirmation).toContainText(/Order ORD-[0-9A-F]{8} confirmed/)
  const orderNumber = (await confirmation.innerText()).match(/ORD-[0-9A-F]{8}/)[0]

  const row = page.locator('#orders .table-row', { hasText: orderNumber })
  await expect(row.locator('.status-badge')).toHaveText('processing')
  await expect(row).toContainText('2 × Atlas Monitor 27"')
  await expect.poll(() => stockOf(card)).toBe(stockBefore - 2)
})

test('an admin can cancel a processing order and the stock comes back', async ({ page, request }) => {
  // Place an order as the buyer through the API.
  const login = await request.post(`${API}/api/auth/login`, {
    data: { email: 'buyer@commercesuite.dev', password: 'demo123' },
  })
  const { token } = await login.json()
  const products = await (await request.get(`${API}/api/products`)).json()
  const router = products.find((p) => p.name === 'Signal Router X2')
  const created = await request.post(`${API}/api/orders`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { items: [{ product_id: router.id, quantity: 3 }], shipping },
  })
  expect(created.status()).toBe(201)
  const order = await created.json()

  await page.goto('/')
  const card = await findProduct(page, 'Signal Router X2')
  await expect.poll(() => stockOf(card)).toBe(router.inventory - 3)

  await signIn(page, 'admin')
  await expect(page.getByRole('heading', { name: 'Order Management' })).toBeVisible()
  const row = page.locator('#orders .table-row', { hasText: order.order_number })
  await expect(row).toContainText('Retail Buyer')
  await expect(row).toContainText('3 × Signal Router X2')
  await row.getByRole('button', { name: 'Cancel' }).click()

  await expect(row.locator('.status-badge')).toHaveText('cancelled')
  await expect(row.getByRole('button', { name: 'Fulfill' })).toBeDisabled()
  await expect.poll(() => stockOf(card)).toBe(router.inventory)
})

// Returns elements on the first screen that stick out past the viewport.
const firstScreenOverflow = (page) =>
  page.evaluate(() => {
    const width = document.documentElement.clientWidth
    const offenders = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const box = el.getBoundingClientRect()
        return box.width > 0 && box.top < window.innerHeight && box.right > width + 0.5
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`)
    return { scrollWidth: document.documentElement.scrollWidth, width, offenders }
  })

test('on a 375px phone the header stays compact and nothing scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.locator('.product-card').first()).toBeVisible()

  const header = page.locator('header.nav')
  expect((await header.boundingBox()).height).toBeLessThan(90)
  let overflow = await firstScreenOverflow(page)
  expect(overflow.offenders).toEqual([])
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width)

  // Signed in, the name chip and sign-out button must still fit on the one row.
  await signIn(page, 'buyer')
  expect((await header.boundingBox()).height).toBeLessThan(90)
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  overflow = await firstScreenOverflow(page)
  expect(overflow.offenders).toEqual([])
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width)
})
