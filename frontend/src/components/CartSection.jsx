import { Icon } from './Icon'
import { icons } from './iconPaths'
import { formatCurrency } from '../format'

export const CartSection = ({ cart, onChangeQuantity, onCheckout }) => {
  const total = cart.reduce((sum, item) => sum + item.price_cents * item.quantity, 0)

  return (
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
                  <span>
                    {formatCurrency(item.price_cents)}
                    {item.quantity >= item.inventory && ' · max available'}
                  </span>
                </div>
                <div className="cart-controls">
                  <button
                    className="btn btn-ghost"
                    aria-label={`Remove one ${item.name}`}
                    onClick={() => onChangeQuantity(item.id, -1)}
                  >
                    <Icon d={icons.minus} size={14} />
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    className="btn btn-ghost"
                    aria-label={`Add one ${item.name}`}
                    disabled={item.quantity >= item.inventory}
                    onClick={() => onChangeQuantity(item.id, 1)}
                  >
                    <Icon d={icons.plus} size={14} />
                  </button>
                </div>
              </div>
            ))}
            <div className="cart-summary">
              <div className="cart-summary-row cart-total">
                <span>Order total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <p className="cart-note">No tax or shipping in this demo. The server recalculates the total from its own prices.</p>
            </div>
            <button className="btn btn-primary btn-block" onClick={onCheckout}>
              Proceed to checkout
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
