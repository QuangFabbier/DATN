const checkoutSteps = ['Giỏ hàng', 'Thông tin', 'Thanh toán', 'Hoàn tất']

function CheckoutSteps({ currentStep = 1 }) {
  return (
    <div className="checkout-steps" aria-label="Tiến trình thanh toán">
      {checkoutSteps.map((step, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <div
            key={step}
            className={`checkout-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="checkout-step-index">{stepNumber}</span>
            <span className="checkout-step-label">{step}</span>
          </div>
        )
      })}
    </div>
  )
}

export default CheckoutSteps
