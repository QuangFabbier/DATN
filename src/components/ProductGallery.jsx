import { useRef, useState } from 'react'

function ProductGallery({
  images = [],
  name,
  enableZoom = false,
  isCompact = false,
}) {
  const safeImages = images.filter(Boolean)
  const [activeIndex, setActiveIndex] = useState(0)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const touchStartXRef = useRef(0)

  function handlePointerMove(event) {
    if (!enableZoom) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const relativeX = ((event.clientX - bounds.left) / bounds.width) * 100
    const relativeY = ((event.clientY - bounds.top) / bounds.height) * 100

    setZoomPosition({
      x: Math.min(100, Math.max(0, relativeX)),
      y: Math.min(100, Math.max(0, relativeY)),
    })
  }

  function showNextImage() {
    setActiveIndex((currentIndex) => (currentIndex + 1) % safeImages.length)
  }

  function showPreviousImage() {
    setActiveIndex((currentIndex) => (currentIndex - 1 + safeImages.length) % safeImages.length)
  }

  function handleTouchStart(event) {
    touchStartXRef.current = event.changedTouches[0]?.clientX || 0
  }

  function handleTouchEnd(event) {
    const touchEndX = event.changedTouches[0]?.clientX || 0
    const deltaX = touchStartXRef.current - touchEndX

    if (Math.abs(deltaX) < 42) {
      return
    }

    if (deltaX > 0) {
      showNextImage()
      return
    }

    showPreviousImage()
  }

  if (!safeImages.length) {
    return null
  }

  return (
    <div className={`product-gallery ${isCompact ? 'compact' : ''}`}>
      <div
        className={`detail-image-box ${enableZoom ? 'zoom-enabled' : ''}`}
        onMouseMove={handlePointerMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img src={safeImages[activeIndex]} alt={name} className="detail-image" />

        {enableZoom ? (
          <div
            className="detail-image-zoom-layer"
            aria-hidden="true"
            style={{
              backgroundImage: `url(${safeImages[activeIndex]})`,
              backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
            }}
          />
        ) : null}

        {safeImages.length > 1 ? (
          <>
            <button
              type="button"
              className="gallery-nav gallery-nav-prev"
              onClick={showPreviousImage}
              aria-label="Xem ảnh trước"
            >
              <i className="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="gallery-nav gallery-nav-next"
              onClick={showNextImage}
              aria-label="Xem ảnh tiếp theo"
            >
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {safeImages.length > 1 ? (
        <div className="gallery-thumbnails" aria-label="Bộ sưu tập ảnh sản phẩm">
          {safeImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              className={`gallery-thumbnail ${index === activeIndex ? 'active' : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Xem ảnh ${index + 1} của ${name}`}
            >
              <img src={image} alt="" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default ProductGallery
