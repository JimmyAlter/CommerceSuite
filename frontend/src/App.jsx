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

const NavLink = ({ href, label }) => (
  <a href={href} className="nav-link">
    {label}
  </a>
)

const FeatureCard = ({ title, description }) => (
  <div className="card feature-card">
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
)

const ProductCard = ({ product, onAdd }) => (
  <div className="card product-card">
    <div className="product-tag">{product.category}</div>
    <h3>{product.name}</h3>
    <p>{product.description}</p>
    <div className="product-meta">
      <span>SKU {product.sku}</span>
      <span className={product.inventory > 0 ? 'stock in' : 'stock out'}>
        {product.inventory > 0 ? `${product.inventory} in stock` : 'Out of stock'}
      </span>
    </div>
    <div className="product-status">
      {product.inventory === 0 && <span className="badge danger">Out of stock</span>}
      {product.inventory > 0 && product.inventory < 20 && (
        <span className="badge warning">Low stock</span>
      )}
      {product.inventory >= 20 && <span className="badge success">Active</span>}
    </div>
    <div className="product-footer">
      <span>{formatCurrency(product.price_cents)}</span>
      <button onClick={() => onAdd(product)} disabled={product.inventory <= 0}>
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
    <div className="modal">
      <div className="modal-card">
        <div className="modal-head">
          <h3>Sign in</h3>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="hint">Demo: buyer@commercesuite.dev / demo123</p>
        </form>
      </div>
    </div>
  )
}

const CheckoutModal = ({ open, onClose, cart, onSubmit, busy }) => {
  const [shipping, setShipping] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
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
    <div className="modal">
      <div className="modal-card">
        <div className="modal-head">
          <h3>Checkout</h3>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              value={shipping.name}
              onChange={(event) => setShipping({ ...shipping, name: event.target.value })}
              required
            />
          </label>
          <label>
            Address
            <input
              value={shipping.address}
              onChange={(event) => setShipping({ ...shipping, address: event.target.value })}
              required
            />
          </label>
          <div className="row">
            <label>
              City
              <input
                value={shipping.city}
                onChange={(event) => setShipping({ ...shipping, city: event.target.value })}
                required
              />
            </label>
            <label>
              Country
              <input
                value={shipping.country}
                onChange={(event) => setShipping({ ...shipping, country: event.target.value })}
                required
              />
            </label>
          </div>
          <label>
            Payment method
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="card">Credit card</option>
              <option value="invoice">Invoice (Net 30)</option>
              <option value="wire">Wire transfer</option>
            </select>
          </label>
          <button className="primary" type="submit" disabled={busy || cart.length === 0}>
            {busy ? 'Processing...' : 'Place order'}
          </button>
        </form>
      </div>
    </div>
  )
}

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
    const timer = setTimeout(() => setToast(''), 2000)
    return () => clearTimeout(timer)
  }, [toast])

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price_cents * item.quantity, 0),
    [cart]
  )
  const cartTax = Math.round(cartSubtotal * 0.08)
  const cartShipping = cartSubtotal > 0 ? 1200 : 0
  const cartTotal = cartSubtotal + cartTax + cartShipping

  const categories = useMemo(
    () => ['All', ...new Set(products.map((product) => product.category))],
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

  useEffect(() => {
    setPage(1)
  }, [category, search, priceRange, sortBy])

  const pageSize = 6
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize)

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
          item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
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
    } catch (err) {
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
      setStatus(`Order ${data.order_number} confirmed. Status: ${data.status}.`)
      setToast('Order submitted successfully')
      setCart([])
      setCheckoutOpen(false)
    } catch (err) {
      setError('Unable to place order. Please try again.')
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

  return (
    <div className="app">
      <header className="nav">
        <div className="nav-left">
          <div className="brand">CommerceSuite</div>
          <nav className="nav-links">
            <NavLink href="#products" label="Products" />
            <NavLink href="#cart" label="Cart" />
            <NavLink href="#security" label="Security" />
            <NavLink href="#orders" label="Orders" />
          </nav>
        </div>
        <div className="nav-right">
          <button className="ghost" onClick={openCheckout}>
            Cart ({cartCount})
          </button>
          {user ? (
            <div className="user-chip">
              <span>{user.name}</span>
              <button className="ghost" onClick={handleLogout}>Sign out</button>
            </div>
          ) : (
            <button className="primary" onClick={() => setLoginOpen(true)}>Sign in</button>
          )}
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Enterprise storefront</p>
          <h1>Procurement that scales with your team.</h1>
          <p>
            CommerceSuite centralizes hardware and software purchasing with secure
            checkout, inventory insight, and order tracking.
          </p>
          <div className="hero-actions">
            <a className="primary" href="#products">Browse catalog</a>
            <button className="ghost" onClick={() => setLoginOpen(true)}>Request access</button>
          </div>
        </div>
        <div className="card hero-card">
          <h3>Order status</h3>
          <p>Processing: 12 · Fulfilled: 48 · Pending: 7</p>
          <div className="hero-metrics">
            <div>
              <span>Avg. delivery</span>
              <strong>4.2 days</strong>
            </div>
            <div>
              <span>Compliance</span>
              <strong>98%</strong>
            </div>
            <div>
              <span>Support</span>
              <strong>24/7</strong>
            </div>
          </div>
        </div>
      </section>

      {status && <div className="banner success">{status}</div>}
      {error && <div className="banner error">{error}</div>}
      {toast && <div className="toast">{toast}</div>}

      <section id="products" className="section">
        <div className="section-head">
          <h2>Catalog</h2>
          <p>Curated equipment with transparent stock and pricing.</p>
        </div>
        <div className="filter-bar">
          <div>
            <label>Category</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or SKU"
            />
          </div>
          <div>
            <label>Price</label>
            <select value={priceRange} onChange={(event) => setPriceRange(event.target.value)}>
              <option value="all">All</option>
              <option value="lt100">Under $100</option>
              <option value="100-300">$100 - $300</option>
              <option value="300-700">$300 - $700</option>
              <option value="gt700">$700+</option>
            </select>
          </div>
          <div>
            <label>Sort</label>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="price-asc">Price (Low to High)</option>
              <option value="price-desc">Price (High to Low)</option>
              <option value="stock-desc">Stock (High to Low)</option>
            </select>
          </div>
        </div>
        <div className="grid">
          {loadingProducts &&
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="card product-card skeleton" />
            ))}
          {!loadingProducts && filteredProducts.length === 0 && (
            <div className="card empty">
              <p>No products found for this category.</p>
            </div>
          )}
          {!loadingProducts && paginatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={addToCart} />
          ))}
        </div>
        {!loadingProducts && filteredProducts.length > 0 && (
          <div className="pagination">
            <button className="ghost" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            <span>Page {page} of {totalPages}</span>
            <button className="ghost" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </button>
          </div>
        )}
      </section>

      <section id="cart" className="section">
        <div className="section-head">
          <h2>Cart summary</h2>
          <p>Review quantities before submitting a request.</p>
        </div>
        <div className="card">
          {cart.length === 0 ? (
            <div className="empty">
              <p>Your cart is empty.</p>
              <a href="#products" className="primary">Browse products</a>
            </div>
          ) : (
            <div className="cart-list">
              {cart.map((item) => (
                <div key={item.id} className="cart-row">
                  <div>
                    <strong>{item.name}</strong>
                    <span>{formatCurrency(item.price_cents)}</span>
                  </div>
                  <div className="cart-controls">
                    <button className="ghost" onClick={() => updateQuantity(item.id, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button className="ghost" onClick={() => updateQuantity(item.id, 1)}>+</button>
                  </div>
                </div>
              ))}
              <div className="cart-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatCurrency(cartSubtotal)}</strong>
                </div>
                <div>
                  <span>Estimated tax</span>
                  <strong>{formatCurrency(cartTax)}</strong>
                </div>
                <div>
                  <span>Shipping</span>
                  <strong>{formatCurrency(cartShipping)}</strong>
                </div>
                <div className="total">
                  <span>Total</span>
                  <strong>{formatCurrency(cartTotal)}</strong>
                </div>
              </div>
              <button className="primary" onClick={openCheckout}>
                Proceed to checkout
              </button>
            </div>
          )}
        </div>
      </section>

      <section id="security" className="section alt">
        <div className="section-head">
          <h2>Security & Compliance</h2>
          <p>Built with authentication, rate limiting, and audit-ready flows.</p>
        </div>
        <div className="grid three">
          <FeatureCard
            title="Secure authentication"
            description="JWT-based sessions with password hashing and login rate limits."
          />
          <FeatureCard
            title="Order integrity"
            description="Server-side totals and inventory checks prevent tampering."
          />
          <FeatureCard
            title="Operational controls"
            description="Role-gated admin access and status tracking for compliance."
          />
        </div>
      </section>

      <section id="orders" className="section">
        <div className="section-head">
          <h2>Order management</h2>
          <p>Admin visibility into fulfillment and customer activity.</p>
        </div>
        {user?.role === 'admin' ? (
          <div className="card">
            <div className="filter-bar">
              <div>
                <label>Status</label>
                <select
                  value={orderStatusFilter}
                  onChange={(event) => setOrderStatusFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="processing">Processing</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label>Search</label>
                <input
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="Search order #"
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
                  <span>No orders yet.</span>
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
                      <span>{order.order_number}</span>
                      <span className={`status ${order.status}`}>{order.status}</span>
                      <span>{formatCurrency(order.total_cents)}</span>
                      <span>{order.created_at}</span>
                      <div className="actions">
                        <button
                          className="ghost"
                          onClick={() => updateOrderStatus(order.id, 'fulfilled')}
                          disabled={busy || order.status === 'fulfilled'}
                        >
                          Fulfill
                        </button>
                        <button
                          className="ghost"
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          disabled={busy || order.status === 'cancelled'}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        ) : (
          <div className="card empty">
            <p>Sign in as admin to view order management.</p>
            <button className="primary" onClick={() => setLoginOpen(true)}>Admin sign in</button>
          </div>
        )}
      </section>

      <footer className="footer">
        <div>
          <strong>CommerceSuite</strong>
          <p>Enterprise procurement, delivered with clarity.</p>
        </div>
        <div>
          <span>Support</span>
          <p>support@commercesuite.dev</p>
        </div>
        <div>
          <span>Security</span>
          <p>ISO-aligned, audit-ready workflows.</p>
        </div>
      </footer>

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
  const updateOrderStatus = async (orderId, status) => {
    try {
      setBusy(true)
      const updated = await fetchJson(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)))
      setToast(`Order ${updated.order_number} updated to ${updated.status}`)
    } catch (err) {
      setError('Unable to update order status')
    } finally {
      setBusy(false)
    }
  }
