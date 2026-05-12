import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { formatCurrency } from '../utils/formatCurrency'

function Orders() {
  const { cartItems, cartTotal } = useCart()

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Đặt hàng</p>
          <h1>Thông tin đơn hàng</h1>
        </div>
      </div>

      <div className="form-layout">
        <form className="form-card">
          <label>
            Họ tên
            <input type="text" placeholder="Nhập họ tên" />
          </label>
          <label>
            Số điện thoại
            <input type="tel" placeholder="Nhập số điện thoại" />
          </label>
          <label>
            Địa chỉ nhận hàng
            <textarea rows="4" placeholder="Nhập địa chỉ" />
          </label>
          <button type="button" className="button">
            Xác nhận đặt hàng
          </button>
        </form>

        <aside className="order-summary">
          <h2>Đơn hàng hiện tại</h2>
          {cartItems.length === 0 ? (
            <>
              <p>Chưa có sản phẩm trong giỏ hàng.</p>
              <Link to="/products" className="button button-outline">
                Chọn sản phẩm
              </Link>
            </>
          ) : (
            <>
              <ul className="summary-list">
                {cartItems.map((item) => (
                  <li key={item.id}>
                    <span>{item.name} x {item.quantity}</span>
                    <strong>{formatCurrency(item.price * item.quantity)}</strong>
                  </li>
                ))}
              </ul>
              <p className="summary-total">Tổng: {formatCurrency(cartTotal)}</p>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}

export default Orders
