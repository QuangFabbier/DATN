import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import CheckoutSteps from '../components/CheckoutSteps'
import EmptyState from '../components/EmptyState'
import { ButtonSpinner } from '../components/Spinner'
import { useCart } from '../hooks/useCart'
import { useToast } from '../hooks/useToast'
import { createOrderRecord } from '../services/orderStorage'
import { getPaymentSettings } from '../services/paymentSettingService'
import { formatCurrency } from '../utils/formatCurrency'
import { wait } from '../utils/timing'

const SHIPPING_FEE = 30000

function OrderQrPayment() {
  const navigate = useNavigate()
  const location = useLocation()
  const { cartItems, cartTotal, clearCart } = useCart()
  const { showToast } = useToast()
  const [paymentSettings, setPaymentSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isQrZoomOpen, setIsQrZoomOpen] = useState(false)

  const customerInfo = location.state?.customerInfo || null
  const shippingFee = cartItems.length > 0 ? SHIPPING_FEE : 0
  const total = cartTotal + shippingFee
  const hasPaymentRecipientInfo = Boolean(
    paymentSettings?.bankName || paymentSettings?.accountName || paymentSettings?.accountNumber || paymentSettings?.transferNote,
  )

  useEffect(() => {
    let isMounted = true

    async function fetchPaymentSettings() {
      try {
        setLoading(true)
        setError('')
        const settings = await getPaymentSettings()
        if (!isMounted) {
          return
        }
        setPaymentSettings(settings)
      } catch (requestError) {
        if (!isMounted) {
          return
        }
        setError(requestError.message || 'Không thể tải thông tin thanh toán QR.')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchPaymentSettings()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isQrZoomOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsQrZoomOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isQrZoomOpen])

  const canSubmitOrder = useMemo(() => {
    if (!customerInfo || !cartItems.length || isSubmitting) {
      return false
    }

    return true
  }, [cartItems.length, customerInfo, isSubmitting])

  async function handleConfirmOrder() {
    if (!canSubmitOrder) {
      return
    }

    setIsSubmitting(true)
    await wait(900)

    const createdOrderResult = createOrderRecord({
      customerInfo: {
        fullName: customerInfo.fullName,
        phone: customerInfo.phone,
        address: customerInfo.address,
        note: customerInfo.note || '',
        paymentMethod: 'qr',
      },
      items: cartItems,
      subtotal: cartTotal,
      shippingFee,
      total,
    })
    const createdOrder = createdOrderResult?.order

    showToast({
      type: 'success',
      title: 'Đặt hàng thành công',
      message: `Đơn hàng QR đã được tạo${createdOrder?.id ? ` (Mã: ${createdOrder.id}).` : '.'}`,
    })

    clearCart()
    navigate('/products')
  }

  if (!customerInfo) {
    return (
      <section className="page-section">
        <CheckoutSteps currentStep={3} />
        <EmptyState
          title="Thiếu thông tin đơn hàng"
          description="Vui lòng quay lại bước thanh toán để chọn phương thức QR và tiếp tục."
          icon="fa-circle-exclamation"
          tone="warning"
          action={
            <Link to="/orders" className="button">
              Quay lại thanh toán
            </Link>
          }
        />
      </section>
    )
  }

  if (cartItems.length === 0) {
    return (
      <section className="page-section">
        <CheckoutSteps currentStep={3} />
        <EmptyState
          title="Giỏ hàng đang trống"
          description="Không còn sản phẩm trong giỏ để tiếp tục thanh toán QR."
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
      <CheckoutSteps currentStep={3} />

      <div className="section-heading">
        <div>
          <p className="eyebrow">Thanh toán</p>
          <h1>Thông tin thanh toán QR</h1>
        </div>
      </div>

      <div className="form-layout">
        <div className="form-card">
          <div className="form-card-header">
            <h2>Quét mã QR để chuyển khoản</h2>
            <p>Hoàn tất chuyển khoản trước, sau đó bấm xác nhận để hoàn tất đơn hàng.</p>
          </div>

          {loading ? (
            <p>Đang tải thông tin thanh toán QR...</p>
          ) : (
            <div className="payment-qr-preview">
              <div className="payment-qr-code">
                {paymentSettings?.hasQrImage && paymentSettings?.qrImageUrl ? (
                  <button
                    type="button"
                    className="payment-qr-zoom-trigger"
                    onClick={() => setIsQrZoomOpen(true)}
                    aria-label="Phóng to mã QR thanh toán"
                  >
                    <img src={paymentSettings.qrImageUrl} alt="Mã QR thanh toán" className="payment-qr-image" />
                  </button>
                ) : (
                  <div className="payment-qr-pattern" />
                )}
              </div>

              <div className="payment-qr-copy">
                <strong>Thông tin nhận tiền</strong>
                {hasPaymentRecipientInfo ? (
                  <ul className="payment-qr-account-list">
                    {paymentSettings?.bankName ? (
                      <li>
                        <span>Ngân hàng</span>
                        <strong>{paymentSettings.bankName}</strong>
                      </li>
                    ) : null}
                    {paymentSettings?.accountName ? (
                      <li>
                        <span>Chủ tài khoản</span>
                        <strong>{paymentSettings.accountName}</strong>
                      </li>
                    ) : null}
                    {paymentSettings?.accountNumber ? (
                      <li>
                        <span>Số tài khoản</span>
                        <strong>{paymentSettings.accountNumber}</strong>
                      </li>
                    ) : null}
                    {paymentSettings?.transferNote ? (
                      <li>
                        <span>Nội dung CK</span>
                        <strong>{paymentSettings.transferNote}</strong>
                      </li>
                    ) : null}
                  </ul>
                ) : (
                  <p>Super admin chưa cấu hình thông tin tài khoản QR. Vui lòng liên hệ hỗ trợ.</p>
                )}
                {error ? (
                  <p className="payment-qr-note">{error}</p>
                ) : (
                  <p className="payment-qr-note">Thông tin thanh toán được đồng bộ từ cấu hình quản trị.</p>
                )}
                {paymentSettings?.hasQrImage && paymentSettings?.qrImageUrl ? (
                  <p className="payment-qr-hint">Bấm vào ảnh để zoom</p>
                ) : null}
              </div>
            </div>
          )}

          <div className="checkout-stage-actions">
            <button type="button" className="button button-light" onClick={() => navigate('/orders')}>
              <i className="fa-solid fa-arrow-left" aria-hidden="true" />
              <span>Quay lại chọn phương thức</span>
            </button>

            <button
              type="button"
              className="button button-pressable"
              onClick={handleConfirmOrder}
              disabled={!canSubmitOrder}
            >
              {isSubmitting ? (
                <>
                  <ButtonSpinner size="sm" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-shield-heart" aria-hidden="true" />
                  <span>Xác nhận đã thanh toán</span>
                </>
              )}
            </button>
          </div>
        </div>

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
              <span>Tạm tính</span>
              <strong>{formatCurrency(cartTotal)}</strong>
            </p>
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

      {isQrZoomOpen && paymentSettings?.hasQrImage && paymentSettings?.qrImageUrl ? (
        <div className="qr-zoom-overlay" onClick={() => setIsQrZoomOpen(false)} role="dialog" aria-modal="true" aria-label="Xem lớn mã QR">
          <div className="qr-zoom-content" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="icon-button qr-zoom-close"
              onClick={() => setIsQrZoomOpen(false)}
              aria-label="Đóng xem lớn mã QR"
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
            <img src={paymentSettings.qrImageUrl} alt="Mã QR thanh toán phóng to" className="qr-zoom-image" />
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default OrderQrPayment
