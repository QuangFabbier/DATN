import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { formatCurrency } from '../utils/formatCurrency'
import { getProductStock } from '../utils/product'

function Cart() {
  const { cartItems, cartTotal, clearCart, removeFromCart, updateQuantity } = useCart()

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Giỏ hàng</p>
          <h1>Sản phẩm đã chọn</h1>
        </div>
        {cartItems.length > 0 && (
          <button type="button" className="button button-light" onClick={clearCart}>
            Xóa giỏ hàng
          </button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-state">
          <p>Giỏ hàng đang trống.</p>
          <Link to="/products" className="button">
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-list">
            {cartItems.map((item) => (
              <article key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} />
                <div className="cart-item-content">
                  <h3>{item.name}</h3>
                  <p>{formatCurrency(item.price)}</p>
                  <p className="cart-item-subtotal">
                    Tạm tính: <strong>{formatCurrency(item.price * item.quantity)}</strong>
                  </p>
                  {getProductStock(item) !== null && (
                    <p className="product-stock">Tồn kho: {item.stock}</p>
                  )}
                  <div className="quantity-control">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={getProductStock(item) !== null && item.quantity >= item.stock}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="cart-item-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => removeFromCart(item.id)}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="order-summary">
            <h2>Tạm tính</h2>
            <ul className="summary-list">
              {cartItems.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <strong>{formatCurrency(item.price * item.quantity)}</strong>
                </li>
              ))}
            </ul>
            <p className="summary-total">Tổng cộng: {formatCurrency(cartTotal)}</p>
            <div className="summary-actions">
              <Link to="/products" className="button button-light">
                Tiếp tục mua sắm
              </Link>
              <Link to="/orders" className="button">
                Đặt hàng
              </Link>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}

export default Cart
