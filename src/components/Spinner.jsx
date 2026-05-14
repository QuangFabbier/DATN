function Spinner({ size = 'md', className = '' }) {
  const sizeMap = {
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px'
  }

  const pixelSize = sizeMap[size] || sizeMap.md

  return (
    <span 
      className={`spinner ${className}`}
      style={{ 
        width: pixelSize, 
        height: pixelSize,
        display: 'inline-block'
      }}
      aria-hidden="true"
    />
  )
}

function ButtonSpinner({ size = 'sm' }) {
  return (
    <span className="button-spinner">
      <Spinner size={size} />
    </span>
  )
}

function FullPageSpinner() {
  return (
    <div className="fullpage-spinner">
      <div className="fullpage-spinner-content">
        <Spinner size="xl" />
        <p>Đang tải...</p>
      </div>
    </div>
  )
}

function LoadingOverlay({ children, isLoading }) {
  return (
    <div className="loading-overlay-container">
      {children}
      {isLoading && (
        <div className="loading-overlay">
          <Spinner size="lg" />
        </div>
      )}
    </div>
  )
}

export { Spinner, ButtonSpinner, FullPageSpinner, LoadingOverlay }
