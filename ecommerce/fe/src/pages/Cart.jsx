import { useState } from 'react'
import { Link } from 'react-router-dom'
import CheckoutSteps from '../components/CheckoutSteps'
import EmptyState from '../components/EmptyState'
import { CartSkeleton } from '../components/Skeleton'
import { useCart } from '../hooks/useCart'
import { useInitialRender } from '../hooks/useInitialRender'
import { useToast } from '../hooks/useToast'
import { analyzeCartWithAi } from '../services/aiService'
import { formatCurrency } from '../utils/formatCurrency'
import { getProductStock } from '../utils/product'

function Cart() {
  const defaultCartNeed = 'Tôi muốn kiểm tra giỏ hàng này có hợp lý không'
  const { cartItems, cartTotal, clearCart, removeFromCart, updateQuantity } = useCart()
  const isInitialRenderReady = useInitialRender()
  const { showToast } = useToast()
  const [cartNeed, setCartNeed] = useState(defaultCartNeed)
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false)
  const [aiCartError, setAiCartError] = useState('')
  const [aiCartResult, setAiCartResult] = useState(null)

  async function handleAnalyzeCartWithAi() {
    if (isAiAnalyzing || cartItems.length === 0) {
      return
    }

    setIsAiAnalyzing(true)
    setAiCartError('')

    try {
      const result = await analyzeCartWithAi({
        cartItems: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        userNeed: cartNeed.trim() || defaultCartNeed,
      })
      setAiCartResult(result)
    } catch (requestError) {
      setAiCartError(requestError?.message || 'Không thể phân tích giỏ hàng bằng AI lúc này.')
    } finally {
      setIsAiAnalyzing(false)
    }
  }

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
            <div className="consultant-card cart-ai-card">
              <div className="form-card-header">
                <p className="eyebrow">AI Cart Analyzer</p>
                <h3>AI phân tích giỏ hàng</h3>
              </div>

              <label htmlFor="cart-ai-need">
                Nhu cầu cần AI phân tích
                <textarea
                  id="cart-ai-need"
                  rows={3}
                  value={cartNeed}
                  onChange={(event) => setCartNeed(event.target.value)}
                  placeholder={defaultCartNeed}
                  disabled={isAiAnalyzing}
                />
              </label>

              <div className="summary-actions">
                <button type="button" className="button" onClick={handleAnalyzeCartWithAi} disabled={isAiAnalyzing}>
                  {isAiAnalyzing ? 'AI đang phân tích...' : 'AI phân tích giỏ hàng'}
                </button>
              </div>

              {aiCartError ? <p className="field-error">{aiCartError}</p> : null}

              {aiCartResult?.analysis ? (
                <div className="ai-answer cart-ai-answer">
                  {aiCartResult.analysis.summary ? <p>{aiCartResult.analysis.summary}</p> : null}
                  {aiCartResult.analysis.fitAssessment ? (
                    <p>
                      <strong>Độ phù hợp:</strong> {aiCartResult.analysis.fitAssessment}
                    </p>
                  ) : null}
                  {aiCartResult.analysis.budgetAssessment ? (
                    <p>
                      <strong>Ngân sách:</strong> {aiCartResult.analysis.budgetAssessment}
                    </p>
                  ) : null}
                  {aiCartResult.analysis.redundantItems?.length ? (
                    <div className="ai-list-group">
                      <strong>Món có thể dư thừa</strong>
                      <ul>
                        {aiCartResult.analysis.redundantItems.map((item, index) => (
                          <li key={`${item.productId || 'redundant'}-${index}`}>{item.reason || item.productId}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {aiCartResult.analysis.missingAccessories?.length ? (
                    <div className="ai-list-group">
                      <strong>Món phụ kiện nên bổ sung</strong>
                      <ul>
                        {aiCartResult.analysis.missingAccessories.map((item, index) => (
                          <li key={`${item.productId || 'missing'}-${index}`}>{item.reason || item.productId}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {aiCartResult.analysis.swapSuggestions?.length ? (
                    <div className="ai-list-group">
                      <strong>Đề xuất thay thế</strong>
                      <ul>
                        {aiCartResult.analysis.swapSuggestions.map((item, index) => (
                          <li key={`${item.fromProductId || item.toProductId || 'swap'}-${index}`}>{item.reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {aiCartResult.analysis.finalRecommendation ? <p>{aiCartResult.analysis.finalRecommendation}</p> : null}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}

export default Cart
