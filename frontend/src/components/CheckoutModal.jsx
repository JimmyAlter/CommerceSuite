import { useState } from 'react'
import { Icon } from './Icon'
import { icons } from './iconPaths'

export const CheckoutModal = ({ open, onClose, cart, onSubmit, error, busy }) => {
  const [shipping, setShipping] = useState({
    name: '', address: '', city: '', country: '',
  })
  const [paymentMethod, setPaymentMethod] = useState('card')

  if (!open) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({ shipping, payment_method: paymentMethod })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <div className="modal-head">
          <h3 id="checkout-title">Checkout</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close checkout">
            <Icon d={icons.x} size={16} />
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="ship-name">Full name</label>
            <input id="ship-name" value={shipping.name} onChange={(e) => setShipping({ ...shipping, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label htmlFor="ship-address">Address</label>
            <input id="ship-address" value={shipping.address} onChange={(e) => setShipping({ ...shipping, address: e.target.value })} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ship-city">City</label>
              <input id="ship-city" value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="ship-country">Country</label>
              <input id="ship-country" value={shipping.country} onChange={(e) => setShipping({ ...shipping, country: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="payment-method">Payment method</label>
            <select id="payment-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="card">Credit card</option>
              <option value="invoice">Invoice (Net 30)</option>
              <option value="wire">Wire transfer</option>
            </select>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy || cart.length === 0}>
            {busy ? 'Processing…' : 'Place order'}
          </button>
        </form>
      </div>
    </div>
  )
}
