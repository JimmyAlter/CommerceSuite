import { useEffect, useMemo, useState } from 'react'
import { Icon } from './components/Icon'
import { icons } from './components/iconPaths'
import { NavLink, FeatureCard } from './components/FeatureCard'
import { ProductCard } from './components/ProductCard'
import { LoginModal } from './components/LoginModal'
import { CheckoutModal } from './components/CheckoutModal'
import { authHeaders, fetchJson } from './api'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100)

const REPO_URL = 'https://github.com/JimmyAlter/CommerceSuite'

const SESSION_EXPIRED = 'Your session has expired. Please sign in again.'

const clearStoredSession = () => {
  localStorage.removeItem('commerce-token')
  localStorage.removeItem('commerce-user')
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

  /* ── Data loading ── */

  const loadProducts = () =>
    fetchJson('/api/products')
      .then(setProducts)
      .catch(() => setError('Unable to load catalog. The API may be waking up; refresh in a minute.'))
      .finally(() => setLoadingProducts(false))

  useEffect(() => {
    loadProducts()
  }, [])

  // Admins see every order; buyers see their own. Bumping ordersVersion reloads the list.
  const [ordersVersion, setOrdersVersion] = useState(0)
  useEffect(() => {
    if (!token || !user) return
    const path = user.role === 'admin' ? '/api/orders' : '/api/orders/mine'
    fetchJson(path, { headers: authHeaders(token) })
      .then(setOrders)
      .catch((err) => {
        if (err.status !== 401) return setError('Unable to load orders')
        clearStoredSession()
        setToken(null)
        setUser(null)
        setError(SESSION_EXPIRED)
        setLoginOpen(true)
      })
  }, [user, token, ordersVersion])

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

  /* ── Filters ── */

  const categories = useMemo(
    () => ['All', ...new Set(products.map((p) => p.category))],
    [products]
  )
  const unitsInStock = products.reduce((sum, p) => sum + p.inventory, 0)
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
    } catch (err) {
      setError(err.status === 401 ? 'Invalid credentials. Try the demo account.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = () => {
    clearStoredSession()
    setToken(null)
    setUser(null)
    setOrders([])
  }

  // The token is kept for 8 hours; after that the API answers 401 and we ask for a fresh sign-in.
  const expireSession = () => {
    handleLogout()
    setCheckoutOpen(false)
    setError(SESSION_EXPIRED)
    setLoginOpen(true)
  }

  const handleCheckout = async ({ shipping, payment_method }) => {
    try {
      setBusy(true)
      setError('')
      const data = await fetchJson('/api/orders', {
        method: 'POST',
        headers: authHeaders(token),
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
      loadProducts()
      setOrdersVersion((v) => v + 1)
    } catch (err) {
      if (err.status === 401) return expireSession()
      setError(`Unable to place order: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setBusy(true)
      const updated = await fetchJson(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify({ status: newStatus }),
      })
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)))
      setToast(`Order ${updated.order_number} updated to ${updated.status}`)
      // Cancelling returns stock to the catalog.
      if (updated.status === 'cancelled') loadProducts()
    } catch (err) {
      if (err.status === 401) return expireSession()
      setError(`Unable to update order status: ${err.message}`)
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
          <p className="eyebrow">B2B procurement demo</p>
          <h1>
            Hardware that scales{' '}
            <em>with your team.</em>
          </h1>
          <p className="hero-desc">
            NovaTech Supply is a fictional storefront for CommerceSuite. Browse the
            catalog, check out as a buyer, and manage orders as an admin. Prices,
            stock and roles are enforced by the API, not the browser.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#catalog">
              <Icon d={icons.search} size={15} />
              Browse catalog
            </a>
            {!user && (
              <button className="btn btn-ghost" onClick={() => setLoginOpen(true)}>
                Sign in with a demo account
              </button>
            )}
          </div>
        </div>
        <div className="hero-card">
          <h3>Catalog at a glance</h3>
          <p>Live figures from the API.</p>
          <div className="hero-metrics">
            <div className="hero-metric accent">
              <span>Products</span>
              <strong>{loadingProducts ? '–' : products.length}</strong>
            </div>
            <div className="hero-metric success">
              <span>Categories</span>
              <strong>{loadingProducts ? '–' : categories.length - 1}</strong>
            </div>
            <div className="hero-metric">
              <span>Units in stock</span>
              <strong>{loadingProducts ? '–' : unitsInStock}</strong>
            </div>
          </div>
        </div>
      </section>

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
            <div className="card grid-empty">
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
                <div className="cart-summary-row cart-total">
                  <span>Order total</span>
                  <strong>{formatCurrency(cartSubtotal)}</strong>
                </div>
                <p className="cart-note">No tax or shipping in this demo. The server recalculates the total from its own prices.</p>
              </div>
              <button className="btn btn-primary btn-block" onClick={openCheckout}>
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
          <p>Built with authentication, rate limiting, and server-side order rules.</p>
        </div>
        <div className="feature-grid">
          <FeatureCard
            icon="shield"
            title="Secure authentication"
            description="JWT sessions (HS256, 8-hour expiry), bcrypt password hashing and a per-client login rate limit."
          />
          <FeatureCard
            icon="lock"
            title="Order integrity"
            description="Server-side totals and real-time inventory checks prevent client-side tampering."
          />
          <FeatureCard
            icon="layers"
            title="Operational controls"
            description="Role-gated admin order management, with status changes validated on the server."
          />
        </div>
      </section>

      {/* ── Orders ── */}
      <section id="orders" className="section">
        <div className="section-head">
          {user && user.role !== 'admin' ? (
            <>
              <h2>My Orders</h2>
              <p>Orders placed with this account and their current status.</p>
            </>
          ) : (
            <>
              <h2>Order Management</h2>
              <p>Admins can fulfill or cancel processing orders. Cancelling returns the stock.</p>
            </>
          )}
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
                  <span className="text-muted">No orders yet.</span>
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
                      <span className="mono">{order.order_number}</span>
                      <span className={`status-badge ${order.status}`}>{order.status}</span>
                      <span className="mono">{formatCurrency(order.total_cents)}</span>
                      <span className="text-muted">{order.created_at}</span>
                      <div className="table-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => updateOrderStatus(order.id, 'fulfilled')}
                          disabled={busy || order.status !== 'processing'}
                        >
                          <Icon d={icons.check} size={13} />
                          Fulfill
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          disabled={busy || order.status !== 'processing'}
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
        ) : user ? (
          <div className="card">
            <div className="table">
              <div className="table-row header">
                <span>Order</span>
                <span>Status</span>
                <span>Total</span>
                <span>Date</span>
                <span>Items</span>
              </div>
              {orders.length === 0 ? (
                <div className="table-row">
                  <span className="text-muted">You have not placed any orders yet.</span>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="table-row">
                    <span className="mono">{order.order_number}</span>
                    <span className={`status-badge ${order.status}`}>{order.status}</span>
                    <span className="mono">{formatCurrency(order.total_cents)}</span>
                    <span className="text-muted">{order.created_at}</span>
                    <span className="order-items">
                      {(order.items || []).map((item) => `${item.quantity} × ${item.product_name}`).join(', ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="card orders-empty">
            <Icon d={icons.lock} size={32} />
            <p>Sign in as a buyer to see your orders, or as an admin to manage all orders.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setLoginOpen(true)}>Sign in</button>
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
              A fictional company used as the demo brand for CommerceSuite, an
              open-source procurement storefront.
            </p>
          </div>
          <div className="footer-col">
            <h4>On this page</h4>
            <a href="#catalog">Product Catalog</a>
            <a href="#cart">Cart</a>
            <a href="#security">Security</a>
            <a href="#orders">Orders</a>
          </div>
          <div className="footer-col">
            <h4>Project</h4>
            <a href={REPO_URL} target="_blank" rel="noreferrer">Source on GitHub</a>
            <a href={`${REPO_URL}#api`} target="_blank" rel="noreferrer">API summary</a>
            <a href={`${REPO_URL}/blob/main/SECURITY.md`} target="_blank" rel="noreferrer">Security policy</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>CommerceSuite by Thiago Langone · MIT License</span>
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
      {checkoutOpen && (
        <CheckoutModal
          open
          onClose={() => setCheckoutOpen(false)}
          cart={cart}
          onSubmit={handleCheckout}
          error={error}
          busy={busy}
        />
      )}
    </div>
  )
}

export default App
