function PaymentSuccessDialog({ open, title, description, orderCode, onClose }) {
  if (!open) {
    return null
  }

  return (
    <div
      className="modal-backdrop payment-success-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="modal-card payment-success-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="payment-success-title-block">
            <p className="eyebrow">Thanh toán</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng thông báo">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="payment-success-body">
          <div className="payment-success-icon" aria-hidden="true">
            <i className="fa-solid fa-circle-check" />
          </div>

          <p className="payment-success-description">{description}</p>

          {orderCode ? <p className="payment-success-meta">Mã đơn hàng: <strong>{orderCode}</strong></p> : null}

          <p className="payment-success-note">Hệ thống sẽ tự động quay về trang chủ sau 3 giây hoặc khi bạn bấm X.</p>
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccessDialog
