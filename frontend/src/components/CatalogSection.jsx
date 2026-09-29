import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { icons } from './iconPaths'
import { ProductCard } from './ProductCard'

const PAGE_SIZE = 6

const PRICE_FILTERS = {
  all: () => true,
  lt100: (p) => p.price_cents < 10000,
  '100-300': (p) => p.price_cents >= 10000 && p.price_cents <= 30000,
  '300-700': (p) => p.price_cents > 30000 && p.price_cents <= 70000,
  gt700: (p) => p.price_cents > 70000,
}

const SORTERS = {
  'name-asc': (a, b) => a.name.localeCompare(b.name),
  'name-desc': (a, b) => b.name.localeCompare(a.name),
  'price-asc': (a, b) => a.price_cents - b.price_cents,
  'price-desc': (a, b) => b.price_cents - a.price_cents,
  'stock-desc': (a, b) => b.inventory - a.inventory,
}

export const CatalogSection = ({ products, loading, onAdd }) => {
  const [filters, setFilters] = useState({ category: 'All', search: '', priceRange: 'all', sortBy: 'name-asc' })
  const [page, setPage] = useState(1)

  // Changing any filter goes back to the first page.
  const updateFilter = (key) => (event) => {
    setFilters((prev) => ({ ...prev, [key]: event.target.value }))
    setPage(1)
  }

  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category))], [products])

  const filtered = useMemo(() => {
    const search = filters.search.toLowerCase()
    return products
      .filter((p) => filters.category === 'All' || p.category === filters.category)
      .filter((p) => !search || p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search))
      .filter(PRICE_FILTERS[filters.priceRange])
      .sort(SORTERS[filters.sortBy])
  }, [products, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <section id="catalog" className="section">
      <div className="section-head">
        <h2>Product Catalog</h2>
        <p>Curated enterprise equipment with transparent stock and pricing.</p>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label htmlFor="filter-category">Category</label>
          <select id="filter-category" value={filters.category} onChange={updateFilter('category')}>
            {categories.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filter-search">Search</label>
          <input id="filter-search" value={filters.search} onChange={updateFilter('search')} placeholder="Search by name or SKU…" />
        </div>
        <div className="filter-group">
          <label htmlFor="filter-price">Price</label>
          <select id="filter-price" value={filters.priceRange} onChange={updateFilter('priceRange')}>
            <option value="all">All prices</option>
            <option value="lt100">Under $100</option>
            <option value="100-300">$100 – $300</option>
            <option value="300-700">$300 – $700</option>
            <option value="gt700">$700+</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="filter-sort">Sort</label>
          <select id="filter-sort" value={filters.sortBy} onChange={updateFilter('sortBy')}>
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
            <option value="stock-desc">Stock ↓</option>
          </select>
        </div>
      </div>

      <div className="grid">
        {loading && Array.from({ length: PAGE_SIZE }).map((_, idx) => <div key={idx} className="skeleton" />)}
        {!loading && filtered.length === 0 && <div className="card grid-empty">No products found for this filter.</div>}
        {!loading && visible.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} />)}
      </div>

      {!loading && filtered.length > PAGE_SIZE && (
        <div className="pagination">
          <button className="btn btn-ghost btn-sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
            <Icon d={icons.chevronLeft} size={14} />
            Prev
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
            Next
            <Icon d={icons.chevronRight} size={14} />
          </button>
        </div>
      )}
    </section>
  )
}
