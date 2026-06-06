import React, { useState, useEffect } from 'react'
import { Icon, icons } from './Icon'

export const CheckoutModal = ({ open, onClose, cart, onSubmit, busy }) => {
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
