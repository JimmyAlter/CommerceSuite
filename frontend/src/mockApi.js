// Mock API for CommerceSuite - Runs 100% in-browser using LocalStorage

const seedUsers = [
  { id: 1, name: 'Store Admin', email: 'admin@commercesuite.dev', role: 'admin', password: 'demo123', created_at: '2026-06-01 10:00:00' },
  { id: 2, name: 'Retail Buyer', email: 'buyer@commercesuite.dev', role: 'customer', password: 'demo123', created_at: '2026-06-01 10:00:00' }
]

const seedProducts = [
  { id: 1, name: 'Ledger Pro Laptop', description: '14-inch business laptop with extended battery and secure boot.', price_cents: 129900, sku: 'LED-1400', inventory: 42, status: 'active', category: 'Hardware' },
  { id: 2, name: 'Nimbus Docking Station', description: 'USB-C dock with dual display support and power delivery.', price_cents: 18900, sku: 'NIM-DOCK', inventory: 120, status: 'active', category: 'Accessories' },
  { id: 3, name: 'Atlas Monitor 27"', description: 'Calibrated IPS monitor for color-accurate workflows.', price_cents: 35900, sku: 'ATL-27M', inventory: 64, status: 'active', category: 'Displays' },
  { id: 4, name: 'Signal Router X2', description: 'Enterprise router with multi-tenant management.', price_cents: 49900, sku: 'SIG-X2', inventory: 18, status: 'active', category: 'Network' },
  { id: 5, name: 'Summit Security Kit', description: 'Endpoint security bundle with policy controls.', price_cents: 8900, sku: 'SUM-SEC', inventory: 250, status: 'active', category: 'Software' },
  { id: 6, name: 'Vertex Ergonomic Keyboard', description: 'Split-layout mechanical keyboard with programmable keys and wrist rest.', price_cents: 12900, sku: 'VTX-KB1', inventory: 85, status: 'active', category: 'Accessories' },
  { id: 7, name: 'Prism Wireless Mouse', description: 'Precision wireless mouse with 16K DPI sensor and USB-C charging.', price_cents: 6900, sku: 'PRM-M01', inventory: 200, status: 'active', category: 'Accessories' },
  { id: 8, name: 'Beacon USB-C Hub', description: 'Compact 7-in-1 hub with HDMI, Ethernet, and SD card reader.', price_cents: 4900, sku: 'BCN-HUB7', inventory: 310, status: 'active', category: 'Accessories' },
  { id: 9, name: 'Forge SSD 2TB', description: 'NVMe M.2 solid-state drive with hardware encryption and 7000 MB/s reads.', price_cents: 19900, sku: 'FRG-SSD2', inventory: 55, status: 'active', category: 'Hardware' },
  { id: 10, name: 'Meridian Webcam Pro', description: '4K autofocus webcam with dual microphones and privacy shutter.', price_cents: 14900, sku: 'MRD-WC4K', inventory: 130, status: 'active', category: 'Peripherals' },
  { id: 11, name: 'Pulse Noise-Cancel Headset', description: 'Wireless ANC headset with 40-hour battery and multipoint Bluetooth.', price_cents: 24900, sku: 'PLS-ANC1', inventory: 72, status: 'active', category: 'Peripherals' },
  { id: 12, name: 'CloudVault Backup License', description: '1-year cloud backup license with 5TB storage and ransomware protection.', price_cents: 3900, sku: 'CLV-BK1Y', inventory: 999, status: 'active', category: 'Software' }
]

const seedOrders = [
  { id: 1, order_number: 'ORD-9A8B7C6D', user_id: 2, status: 'fulfilled', total_cents: 148800, payment_method: 'card', shipping_name: 'John Doe', shipping_address: '123 Main St', shipping_city: 'New York', shipping_country: 'USA', created_at: '2026-06-01 14:32' },
  { id: 2, order_number: 'ORD-1E2F3G4H', user_id: 2, status: 'processing', total_cents: 23800, payment_method: 'wire', shipping_name: 'Jane Smith', shipping_address: '456 Oak Ave', shipping_city: 'San Francisco', shipping_country: 'USA', created_at: '2026-06-05 09:15' }
]

function getStorage(key, fallback) {
  const data = localStorage.getItem(key)
  if (!data) {
    localStorage.setItem(key, JSON.stringify(fallback))
    return fallback
  }
  return JSON.parse(data)
}

function setStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export const isDemoMode = () => {
  return window.location.hostname.includes('vercel.app') || 
         import.meta.env.VITE_DEMO_MODE === 'true'
}

// Helper to generate a short unique id for order numbers
function generateOrderNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'ORD-'
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export const mockFetchJson = async (path, options = {}) => {
  // Network simulation (50-200ms)
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150))

  // Decode user from Authorization header
  let currentUser = null
  const authHeader = options.headers?.Authorization || ''
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      currentUser = JSON.parse(atob(token))
    } catch (e) {
      throw new Error('Unauthorized')
    }
  }

  // 1. POST /api/auth/login
  if (path === '/api/auth/login' && options.method === 'POST') {
    const { email, password } = JSON.parse(options.body)
    const users = getStorage('commerce_users', seedUsers)
    const user = users.find(u => u.email === email && u.password === password)

    if (!user) {
      throw new Error('Invalid credentials')
    }

    const tokenInfo = { id: user.id, name: user.name, email: user.email, role: user.role }
    const token = btoa(JSON.stringify(tokenInfo))

    return {
      token,
      user: tokenInfo
    }
  }

  // 2. GET /api/products
  if (path === '/api/products' && (!options.method || options.method === 'GET')) {
    return getStorage('commerce_products', seedProducts)
  }

  // Auth check for remaining routes
  if (!currentUser) {
    throw new Error('Unauthorized')
  }

  // 3. POST /api/orders
  if (path === '/api/orders' && options.method === 'POST') {
    const { items, shipping, payment_method } = JSON.parse(options.body)
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Items are required')
    }
    if (!shipping?.name || !shipping?.address || !shipping?.city || !shipping?.country) {
      throw new Error('Shipping details are required')
    }

    const products = getStorage('commerce_products', seedProducts)
    const orders = getStorage('commerce_orders', seedOrders)
    
    let totalCents = 0

    // Validate stock and deduct inventory
    const updatedProducts = [...products]
    for (const item of items) {
      const product = updatedProducts.find(p => p.id === item.product_id)
      if (!product) throw new Error('Invalid product')
      const quantity = Math.max(1, Number(item.quantity || 1))
      if (product.inventory < quantity) throw new Error('Insufficient inventory')
      
      product.inventory -= quantity
      totalCents += product.price_cents * quantity
    }

    const now = new Date()
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 16)
    
    const newOrder = {
      id: orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1,
      order_number: generateOrderNumber(),
      user_id: currentUser.id,
      status: 'processing',
      total_cents: totalCents,
      payment_method: payment_method || 'card',
      shipping_name: shipping.name,
      shipping_address: shipping.address,
      shipping_city: shipping.city,
      shipping_country: shipping.country,
      created_at: formattedDate
    }

    orders.unshift(newOrder)
    
    // Save updated state
    setStorage('commerce_products', updatedProducts)
    setStorage('commerce_orders', orders)
    
    return newOrder
  }

  // 4. GET /api/orders (admin only)
  if (path === '/api/orders' && (!options.method || options.method === 'GET')) {
    if (currentUser.role !== 'admin') {
      throw new Error('Forbidden')
    }
    return getStorage('commerce_orders', seedOrders)
  }

  // 5. PATCH /api/orders/:id (admin only)
  if (path.startsWith('/api/orders/') && options.method === 'PATCH') {
    if (currentUser.role !== 'admin') {
      throw new Error('Forbidden')
    }
    const orderId = parseInt(path.split('/').pop(), 10)
    const { status } = JSON.parse(options.body)
    
    const allowed = ['processing', 'fulfilled', 'cancelled']
    if (!allowed.includes(status)) {
      throw new Error('Invalid status')
    }

    const orders = getStorage('commerce_orders', seedOrders)
    const orderIndex = orders.findIndex(o => o.id === orderId)
    if (orderIndex === -1) {
      throw new Error('Order not found')
    }

    orders[orderIndex].status = status
    setStorage('commerce_orders', orders)
    
    return orders[orderIndex]
  }

  throw new Error(`Endpoint not mocked: ${path}`)
}
