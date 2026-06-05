import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ButtonSpinner } from './Spinner'
import StarRating from './StarRating'
import { useCart } from '../hooks/useCart'
import { useCompare } from '../hooks/useCompare'
import { useFavorites } from '../hooks/useFavorites'
import { useToast } from '../hooks/useToast'
import { formatCurrency } from '../utils/formatCurrency'
import {
  buildProductPricing,
  getProductId,
  getProductSalesProgress,
  getProductStock,
} from '../utils/product'
import { wait } from '../utils/timing'

function ProductCard({ product, flashSaleCampaign = null }) {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { isCompared, toggleCompare } = useCompare()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { showToast } = useToast()
  const [isAdding, setIsAdding] = useState(false)
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
  const productId = getProductId(product)
  const stock = getProductStock(product)
  const isOutOfStock = stock === 0
  const isProductFavorite = isFavorite(productId)
  const isProductCompared = isCompared(productId)
  const { discountPercent, originalPrice } = buildProductPricing(product, flashSaleCampaign)
  const { soldCount, totalCount, soldRatio } = getProductSalesProgress(product)
  const hasDiscount = discountPercent > 0

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
        {hasDiscount ? <span className="product-discount-badge">-{discountPercent}%</span> : null}

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
        <StarRating
          value={product.averageRating}
          reviewCount={product.totalReviews}
          readonly
          size="sm"
          showValue={product.totalReviews > 0}
          ariaLabel={`Đánh giá trung bình của ${product.name}`}
        />
        <div className="product-pricing">
          <p className="product-price">{formatCurrency(product.price)}</p>
          {hasDiscount ? <p className="product-original-price">{formatCurrency(originalPrice)}</p> : null}
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
      </div>

      <div className="product-meta-row">
        <div className="product-sales-progress">
          <div className="product-sales-track" aria-hidden="true">
            <span className="product-sales-fill" style={{ width: `${Math.round(soldRatio * 100)}%` }} />
          </div>
          <span className="product-sales-copy">Đã bán {soldCount}/{totalCount} sản phẩm</span>
        </div>
      </div>
    </article>
  )
}

export default ProductCard
