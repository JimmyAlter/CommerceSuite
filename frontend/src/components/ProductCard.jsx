import React from 'react'
import { Icon, icons } from './Icon'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100)

const getCategoryClass = (category) => (category || '').toLowerCase().replace(/\s+/g, '')

export const ProductCard = ({ product, onAdd }) => (
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
