import { Link } from 'react-router-dom'
import CheckoutSteps from '../components/CheckoutSteps'
import EmptyState from '../components/EmptyState'
import { CartSkeleton } from '../components/Skeleton'
import { useCart } from '../hooks/useCart'
import { useInitialRender } from '../hooks/useInitialRender'
import { useToast } from '../hooks/useToast'
import { formatCurrency } from '../utils/formatCurrency'
import { getProductStock } from '../utils/product'

function Cart() {
  const { cartItems, cartTotal, clearCart, removeFromCart, updateQuantity } = useCart()
  const isInitialRenderReady = useInitialRender()
  const { showToast } = useToast()

  if (!isInitialRenderReady) {
    return (
      <section className="page-section">
        <CheckoutSteps currentStep={1} />
        <CartSkeleton items={3} />
      </section>
    )
  }

  return (
    <section className="page-section">
      <CheckoutSteps currentStep={1} />

      <div className="section-heading">
        <div>
          <p className="eyebrow">Giỏ hàng</p>
          <h1>Sản phẩm đã chọn</h1>
        </div>
        {cartItems.length > 0 ? (
          <button
            type="button"
            className="button button-danger button-pressable"
            onClick={() => {
              clearCart()
              showToast({
                type: 'info',
                title: 'Đã xóa toàn bộ giỏ hàng',
                message: 'Bạn có thể tiếp tục chọn lại sản phẩm bất kỳ lúc nào.',
              })
            }}
          >
            Xóa giỏ hàng
          </button>
        ) : null}
      </div>

      {cartItems.length === 0 ? (
        <EmptyState
          title="Giỏ hàng đang trống"
          description="Thêm một vài sản phẩm vào giỏ để tiếp tục checkout, compare hoặc lưu đơn hàng demo."
          icon="fa-cart-plus"
          action={
            <Link to="/products" className="button">
              Tiếp tục mua sắm
            </Link>
          }
        />
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
                  {getProductStock(item) !== null ? (
                    <p className="product-stock">{item.stock === 0 ? 'Hết hàng' : `Tồn kho: ${item.stock}`}</p>
                  ) : null}
                  <div className="quantity-control">
                    <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
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
                    className="text-button button-danger"
                    onClick={() => {
                      removeFromCart(item.id)
                      showToast({
                        type: 'info',
                        title: 'Đã xóa khỏi giỏ hàng',
                        message: `${item.name} đã được xóa khỏi giỏ hàng.`,
                      })
                    }}
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
