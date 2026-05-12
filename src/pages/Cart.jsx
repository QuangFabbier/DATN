import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { formatCurrency } from '../utils/formatCurrency'

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
                <div>
                  <h3>{item.name}</h3>
                  <p>{formatCurrency(item.price)}</p>
                  <div className="quantity-control">
                    <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      +
                    </button>
                  </div>
                </div>
                <button type="button" className="text-button" onClick={() => removeFromCart(item.id)}>
                  Xóa
                </button>
              </article>
            ))}
          </div>

          <aside className="order-summary">
            <h2>Tạm tính</h2>
            <p>{formatCurrency(cartTotal)}</p>
            <Link to="/orders" className="button">
              Đặt hàng
            </Link>
          </aside>
        </div>
      )}
    </section>
  )
}

export default Cart
