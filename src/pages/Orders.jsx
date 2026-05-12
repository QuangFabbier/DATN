import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { formatCurrency } from '../utils/formatCurrency'

const SHIPPING_FEE = 30000
const vietnamesePhoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/

function Orders() {
  const navigate = useNavigate()
  const { cartItems, cartTotal, clearCart } = useCart()
  const [formData, setFormData] = useState({
    fullname: '',
    phone: '',
    address: '',
    note: '',
  })
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  const shippingFee = cartItems.length > 0 ? SHIPPING_FEE : 0
  const total = cartTotal + shippingFee

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((currentData) => ({ ...currentData, [name]: value }))
    setErrors((currentErrors) => ({ ...currentErrors, [name]: '' }))
    setSuccessMessage('')
  }

  function validateForm() {
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

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (cartItems.length === 0 || !validateForm()) {
      return
    }

    setSuccessMessage('Đặt hàng thành công. Chúng tôi sẽ liên hệ xác nhận sớm.')
    clearCart()
    setFormData({
      fullname: '',
      phone: '',
      address: '',
      note: '',
    })

    window.setTimeout(() => {
      navigate('/products')
    }, 1200)
  }

  if (successMessage) {
    return (
      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Đặt hàng</p>
            <h1>Thông tin đơn hàng</h1>
          </div>
        </div>

        <div className="empty-state">
          <p className="auth-message">{successMessage}</p>
          <Link to="/products" className="button">
            Tiếp tục mua sắm
          </Link>
        </div>
      </section>
    )
  }

  if (cartItems.length === 0) {
    return (
      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Đặt hàng</p>
            <h1>Thông tin đơn hàng</h1>
          </div>
        </div>

        <div className="empty-state">
          <p>Giỏ hàng đang trống, chưa thể tạo đơn hàng.</p>
          <Link to="/products" className="button">
            Quay lại mua sắm
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Đặt hàng</p>
          <h1>Thông tin đơn hàng</h1>
        </div>
      </div>

      <div className="form-layout">
        <form className="form-card" onSubmit={handleSubmit}>
          <label>
            Họ tên
            <input
              type="text"
              name="fullname"
              value={formData.fullname}
              onChange={handleChange}
              placeholder="Nhập họ tên"
            />
            {errors.fullname && <span className="field-error">{errors.fullname}</span>}
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
            {errors.phone && <span className="field-error">{errors.phone}</span>}
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
            {errors.address && <span className="field-error">{errors.address}</span>}
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
          <button type="submit" className="button">
            Xác nhận đặt hàng
          </button>
        </form>

        <aside className="order-summary">
          <h2>Đơn hàng hiện tại</h2>
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
          <div className="summary-breakdown">
            <p>
              <span>Tạm tính</span>
              <strong>{formatCurrency(cartTotal)}</strong>
            </p>
            <p>
              <span>Phí vận chuyển</span>
              <strong>{formatCurrency(shippingFee)}</strong>
            </p>
          </div>
          <p className="summary-total">Tổng: {formatCurrency(total)}</p>
        </aside>
      </div>
    </section>
  )
}

export default Orders
