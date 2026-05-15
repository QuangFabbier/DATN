import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QuickViewModal from './QuickViewModal'
import { ButtonSpinner } from './Spinner'
import { useCart } from '../hooks/useCart'
import { useCompare } from '../hooks/useCompare'
import { useFavorites } from '../hooks/useFavorites'
import { useToast } from '../hooks/useToast'
import { formatCurrency } from '../utils/formatCurrency'
import { buildProductPricing, getProductId, getProductStock } from '../utils/product'
import { wait } from '../utils/timing'

function ProductCard({ product }) {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { isCompared, toggleCompare } = useCompare()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { showToast } = useToast()
  const [isAdding, setIsAdding] = useState(false)
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const productId = getProductId(product)
  const stock = getProductStock(product)
  const isOutOfStock = stock === 0
  const isProductFavorite = isFavorite(productId)
  const isProductCompared = isCompared(productId)
  const { discountPercent, originalPrice } = buildProductPricing(product)

  const productStatusLabel = useMemo(() => {
    if (isOutOfStock) {
      return 'Tạm hết'
    }

    if (stock !== null && stock <= 5) {
      return 'Sắp hết'
    }

    return 'Còn hàng'
  }, [isOutOfStock, stock])

  function handleNavigate() {
    navigate(`/products/${productId}`)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleNavigate()
    }
  }

  async function handleAddToCart(event) {
    event.stopPropagation()

    if (isAdding) {
      return
    }

    setIsAdding(true)
    await wait(260)
    const added = addToCart(product, 1)
    setIsAdding(false)

    showToast({
      type: added ? 'success' : 'warning',
      title: added ? 'Đã thêm vào giỏ hàng' : 'Chưa thể thêm sản phẩm',
      message: added
        ? `${product.name} đã được thêm vào giỏ hàng.`
        : 'Sản phẩm đang hết hàng hoặc đã đạt số lượng tối đa.',
    })
  }

  async function handleToggleFavorite(event) {
    event.stopPropagation()

    if (isFavoriteLoading) {
      return
    }

    setIsFavoriteLoading(true)
    await wait(180)
    const added = toggleFavorite(product)
    setIsFavoriteLoading(false)

    showToast({
      type: added ? 'success' : 'info',
      title: added ? 'Đã thêm yêu thích' : 'Đã bỏ yêu thích',
      message: added
        ? `${product.name} đã được lưu lại để xem sau.`
        : `${product.name} đã được xóa khỏi danh sách yêu thích.`,
    })
  }

  function handleCompare(event) {
    event.stopPropagation()
    const result = toggleCompare(product)

    showToast({
      type: result.status === 'limit' ? 'warning' : 'info',
      title:
        result.status === 'added'
          ? 'Đã thêm để so sánh'
          : result.status === 'removed'
            ? 'Đã bỏ khỏi so sánh'
            : 'Không thể thêm sản phẩm',
      message:
        result.status === 'limit'
          ? 'Bạn chỉ có thể so sánh tối đa 3 sản phẩm cùng lúc.'
          : `${product.name} ${result.status === 'added' ? 'đã sẵn sàng để so sánh.' : 'không còn trong danh sách so sánh.'}`,
    })
  }

  return (
    <>
      <article
        className="product-card product-card-link"
        role="link"
        tabIndex={0}
        onClick={handleNavigate}
        onKeyDown={handleKeyDown}
        aria-label={`Xem chi tiết ${product.name}`}
      >
        <div className="product-image-link">
          <img src={product.image} alt={product.name} className="product-image" />
          <span className="product-discount-badge">-{discountPercent}%</span>

          <div className="product-card-overlay-actions">
            <button
              type="button"
              className={`product-overlay-button favorite-toggle ${isProductFavorite ? 'active' : ''}`}
              onClick={handleToggleFavorite}
              aria-label={isProductFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
            >
              {isFavoriteLoading ? (
                <ButtonSpinner size="sm" />
              ) : (
                <i className="fa-solid fa-heart" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              className={`product-overlay-button ${isProductCompared ? 'active' : ''}`}
              onClick={handleCompare}
              aria-label={isProductCompared ? 'Bỏ khỏi so sánh' : 'So sánh sản phẩm'}
            >
              <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="product-card-body">
          <p className="product-category-tag">{product.category}</p>
          <h3>{product.name}</h3>
          <div className="product-pricing">
            <p className="product-price">{formatCurrency(product.price)}</p>
            <p className="product-original-price">{formatCurrency(originalPrice)}</p>
          </div>
        </div>

        <div className="product-actions">
          <button
            type="button"
            className={`product-add-button button-pressable ${isAdding ? 'is-success-pending' : ''}`}
            onClick={handleAddToCart}
            disabled={isOutOfStock || isAdding}
          >
            {isAdding ? (
              <>
                <ButtonSpinner size="sm" />
                <span>Đang thêm...</span>
              </>
            ) : isOutOfStock ? (
              'Hết hàng'
            ) : (
              <>
                <i className="fa-solid fa-cart-shopping" aria-hidden="true" />
                <span>Thêm vào giỏ</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="product-secondary-button button-pressable"
            onClick={(event) => {
              event.stopPropagation()
              setIsQuickViewOpen(true)
            }}
          >
            Xem nhanh
          </button>
        </div>

        <div className="product-meta-row">
          <span className={`product-inline-status ${isOutOfStock ? 'out-of-stock' : 'in-stock'}`}>
            {productStatusLabel}
          </span>
          {stock !== null ? <span className="product-stock-count">Kho: {stock}</span> : null}
        </div>
      </article>

      {isQuickViewOpen ? (
        <QuickViewModal product={product} onClose={() => setIsQuickViewOpen(false)} />
      ) : null}
    </>
  )
}

export default ProductCard
