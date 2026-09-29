import { useState } from 'react'
import { Icon } from './Icon'
import { icons } from './iconPaths'
import { formatCurrency, formatDateTime, summarizeItems } from '../format'

const AdminOrders = ({ orders, busy, onUpdateStatus }) => {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const query = search.toLowerCase()
  const visible = orders
    .filter((order) => statusFilter === 'all' || order.status === statusFilter)
    .filter((order) =>
      !query ||
      order.order_number.toLowerCase().includes(query) ||
      (order.buyer_name || '').toLowerCase().includes(query)
    )

  return (
    <div className="card">
      <div className="filter-bar">
        <div className="filter-group">
          <label htmlFor="order-status">Status</label>
          <select id="order-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="processing">Processing</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="order-search">Search</label>
          <input id="order-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order # or buyer…" />
        </div>
      </div>
      <div className="table table--admin">
        <div className="table-row header">
          <span>Order</span>
          <span>Buyer</span>
          <span>Status</span>
          <span>Total</span>
          <span>Placed</span>
          <span>Actions</span>
        </div>
        {visible.length === 0 ? (
          <div className="table-row">
            <span className="text-muted">{orders.length === 0 ? 'No orders yet.' : 'No orders match this filter.'}</span>
          </div>
        ) : (
          visible.map((order) => (
            <div key={order.id} className="table-row">
              <span className="order-cell">
                <span className="mono">{order.order_number}</span>
                <span className="order-items">{summarizeItems(order.items)}</span>
              </span>
              <span>{order.buyer_name}</span>
              <span className={`status-badge ${order.status}`}>{order.status}</span>
              <span className="mono">{formatCurrency(order.total_cents)}</span>
              <span className="text-muted">{formatDateTime(order.created_at)}</span>
              <div className="table-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onUpdateStatus(order.id, 'fulfilled')}
                  disabled={busy || order.status !== 'processing'}
                >
                  <Icon d={icons.check} size={13} />
                  Fulfill
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onUpdateStatus(order.id, 'cancelled')}
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
  )
}

const BuyerOrders = ({ orders }) => (
  <div className="card">
    <div className="table">
      <div className="table-row header">
        <span>Order</span>
        <span>Status</span>
        <span>Total</span>
        <span>Placed</span>
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
            <span className="text-muted">{formatDateTime(order.created_at)}</span>
            <span className="order-items">{summarizeItems(order.items)}</span>
          </div>
        ))
      )}
    </div>
  </div>
)

export const OrdersSection = ({ user, orders, busy, onUpdateStatus, onSignIn }) => {
  const isAdmin = user?.role === 'admin'
  return (
    <section id="orders" className="section">
      <div className="section-head">
        {user && !isAdmin ? (
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
      {isAdmin && <AdminOrders orders={orders} busy={busy} onUpdateStatus={onUpdateStatus} />}
      {user && !isAdmin && <BuyerOrders orders={orders} />}
      {!user && (
        <div className="card orders-empty">
          <Icon d={icons.lock} size={32} />
          <p>Sign in as a buyer to see your orders, or as an admin to manage all orders.</p>
          <button className="btn btn-primary btn-sm" onClick={onSignIn}>Sign in</button>
        </div>
      )}
    </section>
  )
}
