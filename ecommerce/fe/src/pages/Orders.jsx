import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CheckoutSteps from '../components/CheckoutSteps'
import EmptyState from '../components/EmptyState'
import { OrderFormSkeleton } from '../components/Skeleton'
import { ButtonSpinner } from '../components/Spinner'
import { useCart } from '../hooks/useCart'
import { useInitialRender } from '../hooks/useInitialRender'
import { useToast } from '../hooks/useToast'
import { createOrderRecord } from '../services/orderStorage'
import { buildProductPricing } from '../utils/product'
import { formatCurrency } from '../utils/formatCurrency'
import { wait } from '../utils/timing'

const SHIPPING_FEE = 30000
const vietnamesePhoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/
const paymentMethodOptions = [
  {
    value: 'qr',
    label: 'Thanh toán bằng QR',
    description: 'Quét mã QR để chuyển khoản nhanh. Đây là UI demo frontend-only, chưa tích hợp cổng thật.',
    badge: 'QR',
  },
  {
    value: 'cod',
    label: 'Thanh toán khi nhận hàng',
    description: 'Khách hàng thanh toán trực tiếp cho đơn vị giao hàng khi nhận sản phẩm.',
    badge: 'COD',
  },
]

function Orders() {
  const navigate = useNavigate()
  const { cartItems, cartTotal, clearCart } = useCart()
  const isInitialRenderReady = useInitialRender()
  const { showToast } = useToast()
  const [checkoutStage, setCheckoutStage] = useState('info')
  const [formData, setFormData] = useState({
    fullname: '',
    phone: '',
    address: '',
    note: '',
  })
  const [paymentMethod, setPaymentMethod] = useState('qr')
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cartTotalOriginal = cartItems.reduce((total, item) => {
    const { originalPrice } = buildProductPricing(item)
    return total + originalPrice * item.quantity
  }, 0)
  const cartSavings = Math.max(0, cartTotalOriginal - cartTotal)
  const shippingFee = cartItems.length > 0 ? SHIPPING_FEE : 0
  const total = cartTotal + shippingFee

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((currentData) => ({ ...currentData, [name]: value }))
    setErrors((currentErrors) => ({ ...currentErrors, [name]: '' }))
    setSuccessMessage('')
  }

  function validateInfoForm() {
    const nextErrors = {}

    if (!formData.fullname.trim()) {
      nextErrors.fullname = 'Vui lòng nhập họ tên.'
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = 'Vui lòng nhập số điện thoại.'
    } else if (!vietnamesePhoneRegex.test(formData.phone.trim())) {
      nextErrors.phone = 'Số điện thoại chưa đúng định dạng Việt Nam.'
    }

    if (!formData.address.trim()) {
      nextErrors.address = 'Vui lòng nhập địa chỉ nhận hàng.'
    }

    setErrors((currentErrors) => ({
      ...currentErrors,
      fullname: nextErrors.fullname || '',
      phone: nextErrors.phone || '',
      address: nextErrors.address || '',
    }))

    return Object.keys(nextErrors).length === 0
  }

  function validatePaymentForm() {
    const nextErrors = {}

    if (!paymentMethod) {
      nextErrors.paymentMethod = 'Vui lòng chọn phương thức thanh toán.'
    }

    setErrors((currentErrors) => ({
      ...currentErrors,
      paymentMethod: nextErrors.paymentMethod || '',
    }))

    return Object.keys(nextErrors).length === 0
  }

  function handleContinueToPayment() {
    if (!validateInfoForm()) {
      return
    }

    setCheckoutStage('payment')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (
      cartItems.length === 0 ||
      checkoutStage !== 'payment' ||
      !validateInfoForm() ||
      !validatePaymentForm() ||
      isSubmitting
    ) {
      return
    }

    setIsSubmitting(true)
    await wait(900)

    const createdOrderResult = createOrderRecord({
      customerInfo: {
        fullName: formData.fullname,
        phone: formData.phone,
        address: formData.address,
        note: formData.note,
        paymentMethod,
      },
      items: cartItems,
      subtotal: cartTotal,
      shippingFee,
      total,
    })
    const createdOrder = createdOrderResult?.order

    setSuccessMessage('Đặt hàng thành công. Chúng tôi sẽ liên hệ xác nhận sớm.')
    showToast({
      type: 'success',
      title: 'Đặt hàng thành công',
      message: `Đơn hàng demo đã được tạo với phương thức ${
        paymentMethod === 'qr' ? 'thanh toán QR' : 'thanh toán khi nhận hàng'
      }${createdOrder?.id ? ` (Mã: ${createdOrder.id}).` : '.'}`,
    })
    clearCart()
    setFormData({
      fullname: '',
      phone: '',
      address: '',
      note: '',
    })
    setPaymentMethod('qr')
    setCheckoutStage('info')
    setIsSubmitting(false)

    window.setTimeout(() => {
      navigate('/products')
    }, 1400)
  }

  if (!isInitialRenderReady) {
    return (
      <section className="page-section">
        <CheckoutSteps currentStep={2} />
        <OrderFormSkeleton />
      </section>
    )
  }

  if (successMessage) {
    return (
      <section className="page-section">
        <CheckoutSteps currentStep={4} />
        <EmptyState
          title="Đặt hàng thành công"
          description={successMessage}
          icon="fa-circle-check"
          tone="success"
          action={
            <Link to="/products" className="button">
              Tiếp tục mua sắm
            </Link>
          }
        />
      </section>
    )
  }

  if (cartItems.length === 0) {
    return (
      <section className="page-section">
        <CheckoutSteps currentStep={1} />
        <EmptyState
          title="Giỏ hàng đang trống"
          description="Bạn cần có ít nhất một sản phẩm trong giỏ để tiếp tục bước thông tin và thanh toán."
          icon="fa-cart-plus"
          action={
            <Link to="/products" className="button">
              Quay lại mua sắm
            </Link>
          }
        />
      </section>
    )
  }

  return (
    <section className="page-section">
      <CheckoutSteps currentStep={checkoutStage === 'payment' ? 3 : 2} />

      <div className="section-heading">
        <div>
          <p className="eyebrow">Đặt hàng</p>
          <h1>{checkoutStage === 'payment' ? 'Thanh toán đơn hàng' : 'Thông tin đơn hàng'}</h1>
        </div>
      </div>

      <div className="form-layout">
        <form className="form-card" onSubmit={handleSubmit}>
          {checkoutStage === 'info' ? (
            <>
              <div className="form-card-header">
                <h2>Thông tin nhận hàng</h2>
                <p>Hoàn tất bước thông tin trước, sau đó mới chuyển sang bước chọn phương thức thanh toán.</p>
              </div>

              <label>
                Họ tên
                <input
                  type="text"
                  name="fullname"
                  value={formData.fullname}
                  onChange={handleChange}
                  placeholder="Nhập họ tên"
                />
                {errors.fullname ? <span className="field-error">{errors.fullname}</span> : null}
              </label>

              <label>
                Số điện thoại
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Nhập số điện thoại"
                />
                {errors.phone ? <span className="field-error">{errors.phone}</span> : null}
              </label>

              <label>
                Địa chỉ nhận hàng
                <textarea
                  rows="4"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Nhập địa chỉ"
                />
                {errors.address ? <span className="field-error">{errors.address}</span> : null}
              </label>

              <label>
                Ghi chú
                <textarea
                  rows="3"
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="Ghi chú thêm cho đơn hàng"
                />
              </label>

              <button
                type="button"
                className="button button-pressable"
                onClick={handleContinueToPayment}
              >
                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                <span>Tiếp tục đến thanh toán</span>
              </button>
            </>
          ) : (
            <>
              <div className="form-card-header">
                <h2>Phương thức thanh toán</h2>
                <p>Thông tin đã được lưu tạm. Chọn phương thức thanh toán để hoàn tất đơn hàng.</p>
              </div>

              <div className="checkout-review-card">
                <div className="checkout-review-header">
                  <strong>Thông tin nhận hàng</strong>
                  <button
                    type="button"
                    className="button button-light"
                    onClick={() => setCheckoutStage('info')}
                  >
                    Sửa thông tin
                  </button>
                </div>

                <div className="checkout-review-grid">
                  <div>
                    <span>Khách hàng</span>
                    <strong>{formData.fullname}</strong>
                  </div>
                  <div>
                    <span>Số điện thoại</span>
                    <strong>{formData.phone}</strong>
                  </div>
                  <div className="checkout-review-full">
                    <span>Địa chỉ</span>
                    <strong>{formData.address}</strong>
                  </div>
                  {formData.note.trim() ? (
                    <div className="checkout-review-full">
                      <span>Ghi chú</span>
                      <strong>{formData.note}</strong>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="payment-method-section">
                <div className="payment-method-grid">
                  {paymentMethodOptions.map((option) => {
                    const isSelected = paymentMethod === option.value

                    return (
                      <label
                        key={option.value}
                        className={`payment-method-card ${isSelected ? 'active' : ''}`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={option.value}
                          checked={isSelected}
                          onChange={(event) => {
                            setPaymentMethod(event.target.value)
                            setErrors((currentErrors) => ({ ...currentErrors, paymentMethod: '' }))
                          }}
                        />

                        <div className="payment-method-copy">
                          <div className="payment-method-topline">
                            <strong>{option.label}</strong>
                            <span className="payment-method-badge">{option.badge}</span>
                          </div>
                          <p>{option.description}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>

                {errors.paymentMethod ? (
                  <span className="field-error">{errors.paymentMethod}</span>
                ) : null}

                {paymentMethod === 'qr' ? (
                  <div className="payment-qr-preview">
                    <div className="payment-qr-code" aria-hidden="true">
                      <div className="payment-qr-pattern" />
                    </div>
                    <div className="payment-qr-copy">
                      <strong>Quét QR để thanh toán</strong>
                      <p>Demo UI: sau này có thể thay bằng mã QR thật từ backend hoặc cổng thanh toán.</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="checkout-stage-actions">
                <button
                  type="button"
                  className="button button-light"
                  onClick={() => setCheckoutStage('info')}
                >
                  <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                  <span>Quay lại thông tin</span>
                </button>

                <button type="submit" className="button button-pressable" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <ButtonSpinner size="sm" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-shield-heart" aria-hidden="true" />
                      <span>Xác nhận đặt hàng</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>

        <aside className="order-summary sticky-summary checkout-summary-panel">
          <div className="summary-header checkout-summary-header">
            <h2>Đơn hàng hiện tại</h2>
            <span className="checkout-summary-meta">{cartItems.length} sản phẩm</span>
          </div>

          <ul className="summary-list checkout-summary-list">
            {cartItems.map((item) => (
              <li key={item.id} className="checkout-summary-item">
                <span className="checkout-summary-item-name">
                  {item.name} x {item.quantity}
                </span>
                <strong className="checkout-summary-item-price">{formatCurrency(item.price * item.quantity)}</strong>
              </li>
            ))}
          </ul>

          <div className="summary-breakdown checkout-summary-breakdown">
            <p className="checkout-summary-row">
              <span>Tạm tính (giá gốc)</span>
              <strong>{formatCurrency(cartTotalOriginal)}</strong>
            </p>
            {cartSavings > 0 ? (
              <p className="summary-savings checkout-summary-row">
                <span>Giảm giá</span>
                <strong>-{formatCurrency(cartSavings)}</strong>
              </p>
            ) : null}
            <p className="checkout-summary-row">
              <span>Phí vận chuyển</span>
              <strong>{formatCurrency(shippingFee)}</strong>
            </p>
          </div>

          <p className="summary-total checkout-summary-total">
            <span>Tổng thanh toán</span>
            <strong>{formatCurrency(total)}</strong>
          </p>
        </aside>
      </div>
    </section>
  )
}

export default Orders
