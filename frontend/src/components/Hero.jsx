import { Icon } from './Icon'
import { icons } from './iconPaths'

export const Hero = ({ products, loading, showSignIn, onSignIn }) => {
  const categoryCount = new Set(products.map((p) => p.category)).size
  const unitsInStock = products.reduce((sum, p) => sum + p.inventory, 0)
  const figure = (value) => (loading ? '–' : value)

  return (
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
          {showSignIn && (
            <button className="btn btn-ghost" onClick={onSignIn}>
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
            <strong>{figure(products.length)}</strong>
          </div>
          <div className="hero-metric success">
            <span>Categories</span>
            <strong>{figure(categoryCount)}</strong>
          </div>
          <div className="hero-metric">
            <span>Units in stock</span>
            <strong>{figure(unitsInStock)}</strong>
          </div>
        </div>
      </div>
    </section>
  )
}
