import { useEffect, useState } from 'react'
import { Icon } from './components/Icon'
import { icons } from './components/iconPaths'
import { NavLink } from './components/FeatureCard'
import { Hero } from './components/Hero'
import { CatalogSection } from './components/CatalogSection'
import { CartSection } from './components/CartSection'
import { SecuritySection } from './components/SecuritySection'
import { OrdersSection } from './components/OrdersSection'
import { Footer } from './components/Footer'
import { LoginModal } from './components/LoginModal'
import { CheckoutModal } from './components/CheckoutModal'
import { authHeaders, fetchJson } from './api'
import { clearStoredSession, readStoredSession, storeSession } from './session'

const SESSION_EXPIRED = 'Your session has expired. Please sign in again.'

function App() {
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [cart, setCart] = useState([])
  const [session, setSession] = useState(readStoredSession)
  const { token, user } = session
  const [orders, setOrders] = useState([])
  const [ordersVersion, setOrdersVersion] = useState(0)
  const [loginOpen, setLoginOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  // Each surface keeps its own message so an error in one place never shows up in another.
  const [pageError, setPageError] = useState('')
  const [loginError, setLoginError] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [status, setStatus] = useState('')
  const [toast, setToast] = useState('')

  /* ── Session ── */

  const signOut = () => {
    clearStoredSession()
    setSession({ token: null, user: null })
    setOrders([])
  }

  // Tokens last 8 hours, and a deleted or demoted account is rejected right away.
  const expireSession = () => {
    signOut()
    setCheckoutOpen(false)
    setLoginError(SESSION_EXPIRED)
    setLoginOpen(true)
  }

  const openLogin = () => {
    setLoginError('')
    setLoginOpen(true)
  }

  /* ── Data loading ── */

  const loadProducts = () =>
    fetchJson('/api/products')
      .then(setProducts)
      .catch(() => setPageError('Unable to load catalog. The API may be waking up; refresh in a minute.'))
      .finally(() => setLoadingProducts(false))

  useEffect(() => {
    loadProducts()
  }, [])

  // Admins see every order; buyers see their own. Bumping ordersVersion reloads the list.
  useEffect(() => {
    if (!token || !user) return
    const path = user.role === 'admin' ? '/api/orders' : '/api/orders/mine'
    fetchJson(path, { headers: authHeaders(token) })
      .then(setOrders)
      .catch((err) => {
        if (err.status !== 401) return setPageError('Unable to load orders')
        clearStoredSession()
        setSession({ token: null, user: null })
        setLoginError(SESSION_EXPIRED)
        setLoginOpen(true)
      })
  }, [token, user, ordersVersion])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  /* ── Cart ── */

  const addToCart = (product) => {
    if (product.inventory <= 0) return
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (!existing) return [...prev, { ...product, quantity: 1 }]
      return prev.map((item) =>
        item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.inventory) } : item
      )
    })
    setToast(`${product.name} added to cart`)
  }

  // Quantities stay between 1 and the stock the catalog showed; 0 removes the line.
  const changeQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.min(item.inventory, Math.max(0, item.quantity + delta)) } : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const openCheckout = () => {
    if (!token) {
      setLoginError('Please sign in to check out.')
      setLoginOpen(true)
      return
    }
    setCheckoutError('')
    setCheckoutOpen(true)
  }

  /* ── API actions ── */

  const handleLogin = async (email, password) => {
    try {
      setBusy(true)
      setLoginError('')
      const data = await fetchJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      storeSession(data.token, data.user)
      setSession({ token: data.token, user: data.user })
      setLoginOpen(false)
    } catch (err) {
      setLoginError(err.status === 401 ? 'Invalid credentials. Try a demo account.' : err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleCheckout = async ({ shipping, payment_method }) => {
    try {
      setBusy(true)
      setCheckoutError('')
      const data = await fetchJson('/api/orders', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
          shipping,
          payment_method,
        }),
      })
      setStatus(`Order ${data.order_number} confirmed. Status: ${data.status}`)
      setToast('Order submitted successfully')
      setCart([])
      setCheckoutOpen(false)
      loadProducts()
      setOrdersVersion((v) => v + 1)
    } catch (err) {
      if (err.status === 401) return expireSession()
      setCheckoutError(`Unable to place order: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setBusy(true)
      setPageError('')
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
      setPageError(`Unable to update order status: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  /* ── Render ── */

  return (
    <div className="app">
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
              <button className="btn btn-ghost btn-sm" onClick={signOut} aria-label="Sign out" title="Sign out">
                <Icon d={icons.logout} size={14} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={openLogin}>
              Sign in
            </button>
          )}
        </div>
      </header>

      <Hero products={products} loading={loadingProducts} showSignIn={!user} onSignIn={openLogin} />

      {status && <div className="banner success" role="status">{status}</div>}
      {pageError && <div className="banner error" role="alert">{pageError}</div>}
      {toast && <div className="toast" role="status">{toast}</div>}

      <CatalogSection products={products} loading={loadingProducts} onAdd={addToCart} />
      <CartSection cart={cart} onChangeQuantity={changeQuantity} onCheckout={openCheckout} />
      <SecuritySection />
      <OrdersSection user={user} orders={orders} busy={busy} onUpdateStatus={updateOrderStatus} onSignIn={openLogin} />
      <Footer />

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        error={loginError}
        busy={busy}
      />
      {checkoutOpen && (
        <CheckoutModal
          open
          onClose={() => setCheckoutOpen(false)}
          cart={cart}
          onSubmit={handleCheckout}
          error={checkoutError}
          busy={busy}
        />
      )}
    </div>
  )
}

export default App
