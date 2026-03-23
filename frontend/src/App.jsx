import { useEffect, useMemo, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4100'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100)

const fetchJson = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Request failed')
  }
  return response.json()
}

/* ──────────────────────────────────────────
   Inline SVG Icons
   ────────────────────────────────────────── */

const Icon = ({ d, size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d={d} />
  </svg>
)

const icons = {
  cart: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  search: 'M11 17.25a6.25 6.25 0 1 1 0-12.5 6.25 6.25 0 0 1 0 12.5zM16.65 16.65L21 21',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4',
  check: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  box: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6L6 18M6 6l12 12',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z',
}

/* ──────────────────────────────────────────
   Small Components
   ────────────────────────────────────────── */

const NavLink = ({ href, label }) => (
  <a href={href} className="nav-link">{label}</a>
)

const FeatureCard = ({ icon, title, description }) => (
  <div className="card feature-card animate-in">
    <div className="feature-icon">
      <Icon d={icons[icon]} size={22} />
    </div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
)

const getCategoryClass = (category) => (category || '').toLowerCase().replace(/\s+/g, '')

const ProductCard = ({ product, onAdd }) => (
  <div className="card product-card">
    <div className={`product-tag ${getCategoryClass(product.category)}`}>
      {product.category}
    </div>
    <h3>{product.name}</h3>
    <p>{product.description}</p>
    <div className="product-meta">
      <span>SKU {product.sku}</span>
      <span className={product.inventory > 0 ? 'stock-in' : 'stock-out'}>
        {product.inventory > 0 ? `${product.inventory} in stock` : 'Out of stock'}
      </span>
    </div>
    <div className="product-status">
      {product.inventory === 0 && <span className="badge danger">Out of stock</span>}
      {product.inventory > 0 && product.inventory < 20 && (
        <span className="badge warning">Low stock</span>
      )}
      {product.inventory >= 20 && <span className="badge success">Available</span>}
    </div>
    <div className="product-footer">
      <span className="product-price">{formatCurrency(product.price_cents)}</span>
      <button className="btn btn-primary" onClick={() => onAdd(product)} disabled={product.inventory <= 0}>
        <Icon d={icons.cart} size={14} />
        Add to cart
      </button>
    </div>
  </div>
)

const LoginModal = ({ open, onClose, onLogin, error, busy }) => {
  const [email, setEmail] = useState('buyer@commercesuite.dev')
  const [password, setPassword] = useState('demo123')

  if (!open) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    onLogin(email, password)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-head">
          <h3>Sign in</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <Icon d={icons.x} size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Email address</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@company.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', marginTop: 4 }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="form-hint">Demo: buyer@commercesuite.dev / demo123</p>
        </form>
      </div>
    </div>
  )
}

const CheckoutModal = ({ open, onClose, cart, onSubmit, busy }) => {
  const [shipping, setShipping] = useState({
    name: '', address: '', city: '', country: '',
  })
  const [paymentMethod, setPaymentMethod] = useState('card')

  useEffect(() => {
    if (open) {
      setShipping({ name: '', address: '', city: '', country: '' })
      setPaymentMethod('card')
    }
  }, [open])

  if (!open) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({ shipping, payment_method: paymentMethod })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-head">
          <h3>Checkout</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <Icon d={icons.x} size={16} />
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full name</label>
            <input value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input value={shipping.address} onChange={(e) => setShipping({ ...shipping, address: e.target.value })} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input value={shipping.country} onChange={(e) => setShipping({ ...shipping, country: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label>Payment method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="card">Credit card</option>
              <option value="invoice">Invoice (Net 30)</option>
              <option value="wire">Wire transfer</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy || cart.length === 0} style={{ width: '100%', marginTop: 4 }}>
            {busy ? 'Processing…' : 'Place order'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────
   Main App
   ────────────────────────────────────────── */

function App() {
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [cart, setCart] = useState([])
  const [token, setToken] = useState(() => localStorage.getItem('commerce-token'))
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('commerce-user')
    return stored ? JSON.parse(stored) : null
  })
  const [loginOpen, setLoginOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [orders, setOrders] = useState([])
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [orderSearch, setOrderSearch] = useState('')

  /* ── Data loading ── */

  useEffect(() => {
    setLoadingProducts(true)
    fetchJson('/api/products')
      .then(setProducts)
      .catch(() => setError('Unable to load catalog'))
      .finally(() => setLoadingProducts(false))
  }, [])

  useEffect(() => {
    if (user?.role === 'admin' && token) {
      fetchJson('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
        .then(setOrders)
        .catch(() => setError('Unable to load orders'))
    }
  }, [user, token])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  /* ── Cart math ── */

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price_cents * item.quantity, 0),
    [cart]
  )
  const cartTax = Math.round(cartSubtotal * 0.08)
  const cartShipping = cartSubtotal > 0 ? 1200 : 0
  const cartTotal = cartSubtotal + cartTax + cartShipping

  /* ── Filters ── */

  const categories = useMemo(
    () => ['All', ...new Set(products.map((p) => p.category))],
    [products]
  )
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [priceRange, setPriceRange] = useState('all')
  const [sortBy, setSortBy] = useState('name-asc')
  const [page, setPage] = useState(1)

  const filteredProducts = useMemo(() => {
    const byCategory = category === 'All' ? products : products.filter((p) => p.category === category)
    const bySearch = !search
      ? byCategory
      : byCategory.filter(
        (p) => p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase())
      )

    const byPrice = (() => {
      if (priceRange === 'all') return bySearch
      if (priceRange === 'lt100') return bySearch.filter((p) => p.price_cents < 10000)
      if (priceRange === '100-300') return bySearch.filter((p) => p.price_cents >= 10000 && p.price_cents <= 30000)
      if (priceRange === '300-700') return bySearch.filter((p) => p.price_cents > 30000 && p.price_cents <= 70000)
      return bySearch.filter((p) => p.price_cents > 70000)
    })()

    const sorted = [...byPrice]
    if (sortBy === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === 'name-desc') sorted.sort((a, b) => b.name.localeCompare(a.name))
    if (sortBy === 'price-asc') sorted.sort((a, b) => a.price_cents - b.price_cents)
    if (sortBy === 'price-desc') sorted.sort((a, b) => b.price_cents - a.price_cents)
    if (sortBy === 'stock-desc') sorted.sort((a, b) => b.inventory - a.inventory)
    return sorted
  }, [products, category, search, priceRange, sortBy])

  useEffect(() => { setPage(1) }, [category, search, priceRange, sortBy])

  const pageSize = 6
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize)

  /* ── Actions ── */

  const addToCart = (product) => {
    if (product.inventory <= 0) return
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        const nextQty = Math.min(existing.quantity + 1, product.inventory)
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: nextQty } : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
    setToast(`${product.name} added to cart`)
  }

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const handleLogin = async (email, password) => {
    try {
      setBusy(true)
      setError('')
      const data = await fetchJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('commerce-token', data.token)
      localStorage.setItem('commerce-user', JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user)
      setLoginOpen(false)
    } catch {
      setError('Invalid credentials. Try the demo account.')
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('commerce-token')
    localStorage.removeItem('commerce-user')
    setToken(null)
    setUser(null)
    setOrders([])
  }

  const handleCheckout = async ({ shipping, payment_method }) => {
    try {
      setBusy(true)
      setError('')
      const data = await fetchJson('/api/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
          shipping,
          payment_method,
        }),
      })
      setStatus(`Order ${data.order_number} confirmed — Status: ${data.status}`)
      setToast('Order submitted successfully')
      setCart([])
      setCheckoutOpen(false)
    } catch {
      setError('Unable to place order. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setBusy(true)
      const updated = await fetchJson(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      })
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)))
      setToast(`Order ${updated.order_number} updated to ${updated.status}`)
    } catch {
      setError('Unable to update order status')
    } finally {
      setBusy(false)
    }
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const openCheckout = () => {
    if (!token) {
      setError('Please sign in to checkout.')
      setLoginOpen(true)
      return
    }
    setCheckoutOpen(true)
  }

  /* ── Render ── */

  return (
    <div className="app">

      {/* ── Navigation ── */}
      <header className="nav">
        <div className="nav-left">
          <div className="brand">
            <div className="brand-icon">NT</div>
            <span>NovaTech Supply</span>
          </div>
          <nav className="nav-links">
            <NavLink href="#catalog" label="Catalog" />
            <NavLink href="#cart" label="Cart" />
            <NavLink href="#security" label="Security" />
            <NavLink href="#orders" label="Orders" />
          </nav>
        </div>
        <div className="nav-right">
          <button className="btn btn-ghost btn-sm" onClick={openCheckout}>
            <Icon d={icons.cart} size={15} />
            Cart{cartCount > 0 && ` (${cartCount})`}
          </button>
          {user ? (
            <div className="user-chip">
              <span>{user.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                <Icon d={icons.logout} size={14} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setLoginOpen(true)}>
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Enterprise procurement platform</p>
          <h1>
            Hardware that scales{' '}
            <em>with your team.</em>
          </h1>
          <p className="hero-desc">
            NovaTech Supply centralizes hardware and software purchasing with
            secure checkout, real-time inventory, and order tracking — built
            for teams that move fast.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#catalog">
              <Icon d={icons.search} size={15} />
              Browse catalog
            </a>
            <button className="btn btn-ghost" onClick={() => setLoginOpen(true)}>
              Request access
            </button>
          </div>
        </div>
        <div className="hero-card">
          <h3>Live order dashboard</h3>
          <p>Processing: 12 · Fulfilled: 48 · Pending: 7</p>
          <div className="hero-metrics">
            <div className="hero-metric accent">
              <span>Avg. delivery</span>
              <strong>4.2d</strong>
            </div>
            <div className="hero-metric success">
              <span>Compliance</span>
              <strong>98%</strong>
            </div>
            <div className="hero-metric">
              <span>Uptime</span>
              <strong>99.9%</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted Strip ── */}
      <div className="trusted-strip">
        <p>Trusted by leading teams</p>
        <div className="trusted-logos">
          <span className="trusted-logo">Meridian Labs</span>
          <span className="trusted-logo">Vertex Systems</span>
          <span className="trusted-logo">Arcline Group</span>
          <span className="trusted-logo">Helix Corp</span>
          <span className="trusted-logo">Stratos Inc</span>
        </div>
      </div>

      {/* ── Banners ── */}
      {status && <div className="banner success">{status}</div>}
      {error && <div className="banner error">{error}</div>}
      {toast && <div className="toast">{toast}</div>}

      {/* ── Catalog ── */}
      <section id="catalog" className="section">
        <div className="section-head">
          <h2>Product Catalog</h2>
          <p>Curated enterprise equipment with transparent stock and pricing.</p>
        </div>

        <div className="filter-bar">
          <div className="filter-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU…"
            />
          </div>
          <div className="filter-group">
            <label>Price</label>
            <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
              <option value="all">All prices</option>
              <option value="lt100">Under $100</option>
              <option value="100-300">$100 – $300</option>
              <option value="300-700">$300 – $700</option>
              <option value="gt700">$700+</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Sort</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name-asc">Name (A–Z)</option>
              <option value="name-desc">Name (Z–A)</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
              <option value="stock-desc">Stock ↓</option>
            </select>
          </div>
        </div>

        <div className="grid">
          {loadingProducts &&
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="skeleton" />
            ))}
          {!loadingProducts && filteredProducts.length === 0 && (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              No products found for this filter.
            </div>
          )}
          {!loadingProducts && paginatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={addToCart} />
          ))}
        </div>

        {!loadingProducts && filteredProducts.length > pageSize && (
          <div className="pagination">
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <Icon d={icons.chevronLeft} size={14} />
              Prev
            </button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
              <Icon d={icons.chevronRight} size={14} />
            </button>
          </div>
        )}
      </section>

      {/* ── Cart ── */}
      <section id="cart" className="section">
        <div className="section-head">
          <h2>Cart Summary</h2>
          <p>Review quantities before submitting your procurement request.</p>
        </div>
        <div className="card">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <Icon d={icons.cart} size={32} />
              <p>Your cart is empty</p>
              <a href="#catalog" className="btn btn-primary btn-sm">Browse products</a>
            </div>
          ) : (
            <div className="cart-list">
              {cart.map((item) => (
                <div key={item.id} className="cart-row">
                  <div className="cart-item-info">
                    <strong>{item.name}</strong>
                    <span>{formatCurrency(item.price_cents)}</span>
                  </div>
                  <div className="cart-controls">
                    <button className="btn btn-ghost" onClick={() => updateQuantity(item.id, -1)}>
                      <Icon d={icons.minus} size={14} />
                    </button>
                    <span>{item.quantity}</span>
                    <button className="btn btn-ghost" onClick={() => updateQuantity(item.id, 1)}>
                      <Icon d={icons.plus} size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="cart-summary">
                <div className="cart-summary-row">
                  <span>Subtotal</span>
                  <strong>{formatCurrency(cartSubtotal)}</strong>
                </div>
                <div className="cart-summary-row">
                  <span>Estimated tax</span>
                  <strong>{formatCurrency(cartTax)}</strong>
                </div>
                <div className="cart-summary-row">
                  <span>Shipping</span>
                  <strong>{formatCurrency(cartShipping)}</strong>
                </div>
                <div className="cart-summary-row cart-total">
                  <span>Total</span>
                  <strong>{formatCurrency(cartTotal)}</strong>
                </div>
              </div>
              <button className="btn btn-primary" onClick={openCheckout} style={{ width: '100%', marginTop: 8 }}>
                Proceed to checkout
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" className="section section-alt">
        <div className="section-head">
          <h2>Security & Compliance</h2>
          <p>Built with authentication, rate limiting, and audit-ready flows.</p>
        </div>
        <div className="feature-grid">
          <FeatureCard
            icon="shield"
            title="Secure authentication"
            description="JWT-based sessions with bcrypt password hashing and configurable login rate limits."
          />
          <FeatureCard
            icon="lock"
            title="Order integrity"
            description="Server-side totals and real-time inventory checks prevent client-side tampering."
          />
          <FeatureCard
            icon="layers"
            title="Operational controls"
            description="Role-gated admin access, status audit trails, and compliance-ready workflows."
          />
        </div>
      </section>

      {/* ── Orders ── */}
      <section id="orders" className="section">
        <div className="section-head">
          <h2>Order Management</h2>
          <p>Admin visibility into fulfillment and customer activity.</p>
        </div>
        {user?.role === 'admin' ? (
          <div className="card">
            <div className="filter-bar">
              <div className="filter-group">
                <label>Status</label>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="processing">Processing</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Search</label>
                <input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search order #…"
                />
              </div>
            </div>
            <div className="table">
              <div className="table-row header">
                <span>Order</span>
                <span>Status</span>
                <span>Total</span>
                <span>Date</span>
                <span>Actions</span>
              </div>
              {orders.length === 0 ? (
                <div className="table-row">
                  <span style={{ color: 'var(--text-muted)' }}>No orders yet.</span>
                </div>
              ) : (
                orders
                  .filter((order) => orderStatusFilter === 'all' || order.status === orderStatusFilter)
                  .filter((order) =>
                    !orderSearch
                      ? true
                      : order.order_number.toLowerCase().includes(orderSearch.toLowerCase())
                  )
                  .map((order) => (
                    <div key={order.id} className="table-row">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{order.order_number}</span>
                      <span className={`status-badge ${order.status}`}>{order.status}</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(order.total_cents)}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{order.created_at}</span>
                      <div className="table-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => updateOrderStatus(order.id, 'fulfilled')}
                          disabled={busy || order.status === 'fulfilled'}
                        >
                          <Icon d={icons.check} size={13} />
                          Fulfill
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          disabled={busy || order.status === 'cancelled'}
                        >
                          <Icon d={icons.x} size={13} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        ) : (
          <div className="card orders-empty">
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Icon d={icons.lock} size={32} />
              <p style={{ color: 'var(--text-muted)', margin: '12px 0 16px' }}>Sign in as admin to view order management.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setLoginOpen(true)}>Admin sign in</button>
            </div>
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brand">
              <div className="brand-icon">NT</div>
              <span>NovaTech Supply</span>
            </div>
            <p>
              Enterprise procurement, delivered with precision. Secure,
              transparent, and built for teams that need reliability.
            </p>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <a href="#catalog">Product Catalog</a>
            <a href="#security">Security</a>
            <a href="#orders">Order Management</a>
            <a href="#cart">Cart</a>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <a href="#">Documentation</a>
            <a href="#">API Reference</a>
            <a href="#">Status Page</a>
            <a href="#">Release Notes</a>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Careers</a>
            <a href="#">Contact</a>
            <a href="mailto:support@novatech.supply">support@novatech.supply</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 NovaTech Supply. All rights reserved.</span>
          <div className="footer-bottom-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </footer>

      {/* ── Modals ── */}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        error={error}
        busy={busy}
      />
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        onSubmit={handleCheckout}
        busy={busy}
      />
    </div>
  )
}

export default App
