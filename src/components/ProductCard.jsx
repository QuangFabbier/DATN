import { useNavigate } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { formatCurrency } from '../utils/formatCurrency'
import { getProductId, getProductStock } from '../utils/product'

function buildPricing(product) {
  const productId = getProductId(product)
  const normalizedSeed = Number.parseInt(productId.replace(/\D/g, ''), 10) || product.name.length || 7
  const discountPercent = 5 + (normalizedSeed % 6)
  const originalPrice = Math.ceil(product.price / (1 - discountPercent / 100) / 10000) * 10000

  return {
    discountPercent,
    originalPrice,
  }
}

function ProductCard({ product }) {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const productId = getProductId(product)
  const stock = getProductStock(product)
  const isOutOfStock = stock === 0
  const { discountPercent, originalPrice } = buildPricing(product)

  function handleNavigate() {
    navigate(`/products/${productId}`)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleNavigate()
    }
  }

  function handleAddToCart(event) {
    event.stopPropagation()
    addToCart(product, 1)
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
        <span className="product-discount-badge">-{discountPercent}%</span>
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
          className="product-add-button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
        >
          <i className="fa-solid fa-cart-shopping" aria-hidden="true" />
          <span>{isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}</span>
        </button>
        <span className={`product-inline-status ${isOutOfStock ? 'out-of-stock' : 'in-stock'}`}>
          {isOutOfStock ? 'Tạm hết' : 'Còn hàng'}
        </span>
      </div>
    </article>
  )
}

export default ProductCard
