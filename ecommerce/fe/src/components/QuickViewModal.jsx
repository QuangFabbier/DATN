import { Link } from 'react-router-dom'
import { useState } from 'react'
import ProductGallery from './ProductGallery'
import { ButtonSpinner } from './Spinner'
import { useCart } from '../hooks/useCart'
import { useFavorites } from '../hooks/useFavorites'
import { useCompare } from '../hooks/useCompare'
import { useToast } from '../hooks/useToast'
import { buildProductPricing, getProductImages, getProductStock } from '../utils/product'
import { formatCurrency } from '../utils/formatCurrency'
import { wait } from '../utils/timing'

function QuickViewModal({ onClose, product }) {
  const { addToCart } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { isCompared, toggleCompare } = useCompare()
  const { showToast } = useToast()
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const stock = getProductStock(product)
  const isOutOfStock = stock === 0
  const productImages = getProductImages(product)
  const isProductFavorite = isFavorite(product.id)
  const isProductCompared = isCompared(product.id)
  const { discountPercent, originalPrice } = buildProductPricing(product)

  async function handleAddToCart() {
    if (isAddingToCart) {
      return
    }

    setIsAddingToCart(true)
    await wait(280)
    const added = addToCart(product, 1)
    setIsAddingToCart(false)

    showToast({
      type: added ? 'success' : 'warning',
      title: added ? 'Đã thêm vào giỏ hàng' : 'Chưa thể thêm sản phẩm',
      message: added
        ? `${product.name} đã xuất hiện trong giỏ hàng của bạn.`
        : 'Sản phẩm đã đạt giới hạn số lượng hoặc đang hết hàng.',
    })
  }

  async function handleFavoriteToggle() {
    if (isTogglingFavorite) {
      return
    }

    setIsTogglingFavorite(true)
    await wait(220)
    const added = toggleFavorite(product)
    setIsTogglingFavorite(false)

    showToast({
      type: added ? 'success' : 'info',
      title: added ? 'Đã lưu yêu thích' : 'Đã bỏ yêu thích',
      message: added
        ? `${product.name} đã được thêm vào danh sách yêu thích.`
        : `${product.name} đã được xóa khỏi danh sách yêu thích.`,
    })
  }

  function handleCompareToggle() {
    const result = toggleCompare(product)

    showToast({
      type: result.status === 'limit' ? 'warning' : 'info',
      title:
        result.status === 'added'
          ? 'Đã thêm để so sánh'
          : result.status === 'removed'
            ? 'Đã bỏ khỏi danh sách so sánh'
            : 'Không thể thêm sản phẩm',
      message:
        result.status === 'limit'
          ? 'Bạn chỉ có thể so sánh tối đa 3 sản phẩm cùng lúc.'
          : `${product.name} ${result.status === 'added' ? 'đã sẵn sàng để so sánh.' : 'không còn trong danh sách so sánh.'}`,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal-card quick-view-modal"
        onClick={(event) => event.stopPropagation()}
        aria-label={`Xem nhanh ${product.name}`}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Xem nhanh</p>
            <h2>{product.name}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng xem nhanh">
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="quick-view-layout">
          <ProductGallery images={productImages} isCompact name={product.name} />

          <div className="quick-view-content">
            <p className="product-category-tag">{product.category}</p>
            <div className="detail-price-stack">
              <p className="detail-price">{formatCurrency(product.price)}</p>
              <p className="product-original-price">{formatCurrency(originalPrice)}</p>
              <span className="product-discount-badge inline">-{discountPercent}%</span>
            </div>
            <p className="detail-description">{product.description}</p>
            <div className="product-meta-grid">
              <div>
                <span>Danh mục</span>
                <strong>{product.category}</strong>
              </div>
              <div>
                <span>Tồn kho</span>
                <strong>{stock === null ? 'Đang cập nhật' : stock}</strong>
              </div>
            </div>

            <div className="quick-view-actions">
              <button
                type="button"
                className={`button button-pressable ${isAddingToCart ? 'is-success-pending' : ''}`}
                onClick={handleAddToCart}
                disabled={isOutOfStock || isAddingToCart}
              >
                {isAddingToCart ? (
                  <>
                    <ButtonSpinner size="sm" />
                    <span>Đang thêm...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-cart-shopping" aria-hidden="true" />
                    <span>{isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className={`button button-light button-pressable favorite-toggle ${isProductFavorite ? 'active' : ''}`}
                onClick={handleFavoriteToggle}
                disabled={isTogglingFavorite}
              >
                {isTogglingFavorite ? (
                  <>
                    <ButtonSpinner size="sm" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-heart" aria-hidden="true" />
                    <span>{isProductFavorite ? 'Đã thích' : 'Yêu thích'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className={`button button-outline button-pressable ${isProductCompared ? 'active' : ''}`}
                onClick={handleCompareToggle}
              >
                <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
                <span>{isProductCompared ? 'Đang so sánh' : 'So sánh'}</span>
              </button>
            </div>

            <Link to={`/products/${product.id}`} className="section-action-link">
              Xem trang chi tiết
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default QuickViewModal
