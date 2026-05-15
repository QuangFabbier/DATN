import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import EmptyState from '../components/EmptyState'
import ProductGallery from '../components/ProductGallery'
import { DetailSkeleton } from '../components/Skeleton'
import { ButtonSpinner } from '../components/Spinner'
import { useCart } from '../hooks/useCart'
import { useCompare } from '../hooks/useCompare'
import { useFavorites } from '../hooks/useFavorites'
import { useToast } from '../hooks/useToast'
import { getProductById } from '../services/productService'
import { formatCurrency } from '../utils/formatCurrency'
import {
  buildProductPricing,
  getProductId,
  getProductImages,
  getProductStock,
  normalizeProduct,
} from '../utils/product'
import { wait, withMinimumDelay } from '../utils/timing'

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { isCompared, toggleCompare } = useCompare()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { showToast } = useToast()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const [isBuyingNow, setIsBuyingNow] = useState(false)

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true)
        setError('')
        const data = await withMinimumDelay(getProductById(id), 220)
        setProduct(normalizeProduct(data))
        setQuantity(1)
      } catch (requestError) {
        setError(requestError.response?.status === 404 ? 'Không tìm thấy sản phẩm' : 'Không thể tải chi tiết sản phẩm')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  const productId = getProductId(product)
  const stock = getProductStock(product)
  const isOutOfStock = stock === 0
  const isProductFavorite = productId ? isFavorite(productId) : false
  const isProductCompared = productId ? isCompared(productId) : false
  const productImages = useMemo(() => getProductImages(product), [product])
  const { discountPercent, originalPrice, discountAmount } = buildProductPricing(product)

  const breadcrumbs = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Sản phẩm', to: '/products' },
    product?.category ? { label: product.category, to: `/products?category=${encodeURIComponent(product.category)}` } : null,
    { label: product?.name || 'Chi tiết sản phẩm' },
  ].filter(Boolean)

  function handleQuantityChange(nextQuantity) {
    const parsedQuantity = Number(nextQuantity)

    if (!Number.isFinite(parsedQuantity)) {
      return
    }

    if (stock === null) {
      setQuantity(Math.max(1, parsedQuantity))
      return
    }

    setQuantity(Math.min(Math.max(1, parsedQuantity), Math.max(1, stock)))
  }

  async function handleAddToCart() {
    if (!product || isAddingToCart) {
      return
    }

    setIsAddingToCart(true)
    await wait(300)
    const added = addToCart(product, quantity)
    setIsAddingToCart(false)

    showToast({
      type: added ? 'success' : 'warning',
      title: added ? 'Đã thêm vào giỏ hàng' : 'Không thể thêm sản phẩm',
      message: added
        ? `${quantity} ${product.name} đã được thêm vào giỏ hàng.`
        : 'Sản phẩm đang hết hàng hoặc đã chạm giới hạn số lượng.',
    })
  }

  async function handleFavorite() {
    if (!product || isTogglingFavorite) {
      return
    }

    setIsTogglingFavorite(true)
    await wait(220)
    const added = toggleFavorite(product)
    setIsTogglingFavorite(false)

    showToast({
      type: added ? 'success' : 'info',
      title: added ? 'Đã thêm vào yêu thích' : 'Đã bỏ yêu thích',
      message: added
        ? `${product.name} đã được lưu trong danh sách yêu thích.`
        : `${product.name} đã được xóa khỏi danh sách yêu thích.`,
    })
  }

  function handleCompare() {
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

  async function handleBuyNow() {
    if (!product || isBuyingNow) {
      return
    }

    setIsBuyingNow(true)
    addToCart(product, quantity)
    await wait(380)
    setIsBuyingNow(false)
    navigate('/orders')
  }

  if (loading) {
    return (
      <section className="page-section">
        <Breadcrumbs items={breadcrumbs} />
        <DetailSkeleton />
      </section>
    )
  }

  if (error || !product) {
    return (
      <section className="page-section">
        <Breadcrumbs items={breadcrumbs} />
        <EmptyState
          title={error || 'Không tìm thấy sản phẩm'}
          description="Sản phẩm có thể đã bị xóa khỏi localStorage hoặc đường dẫn không còn hợp lệ."
          icon="fa-circle-exclamation"
          tone="warning"
          action={
            <Link to="/products" className="button">
              Quay lại danh sách sản phẩm
            </Link>
          }
        />
      </section>
    )
  }

  return (
    <section className="page-section">
      <Breadcrumbs items={breadcrumbs} />

      <div className="product-detail">
        <ProductGallery images={productImages} enableZoom name={product.name} />

        <div className="detail-content">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>

          <div className="detail-price-stack">
            <p className="detail-price">{formatCurrency(product.price)}</p>
            <p className="product-original-price">{formatCurrency(originalPrice)}</p>
            <span className="product-discount-badge inline">-{discountPercent}%</span>
          </div>

          <p className="detail-savings">Tiết kiệm {formatCurrency(discountAmount)} so với giá niêm yết.</p>
          <p className="detail-description">{product.description}</p>

          <div className="detail-meta-grid">
            <div>
              <span>Tồn kho</span>
              <strong>{isOutOfStock ? 'Hết hàng' : `${stock} sản phẩm`}</strong>
            </div>
            <div>
              <span>Danh mục</span>
              <strong>{product.category}</strong>
            </div>
            <div>
              <span>Trạng thái</span>
              <strong>{isOutOfStock ? 'Tạm hết hàng' : 'Sẵn sàng giao nhanh'}</strong>
            </div>
          </div>

          <p className={`stock-status ${isOutOfStock ? 'out-of-stock' : ''}`}>
            {isOutOfStock ? 'Sản phẩm hiện đang tạm hết hàng.' : 'Sản phẩm còn sẵn trong kho.'}
          </p>

          <div className="detail-quantity">
            <span>Số lượng</span>
            <div className="quantity-control">
              <button type="button" onClick={() => handleQuantityChange(quantity - 1)} disabled={quantity <= 1}>
                -
              </button>
              <input
                type="number"
                min="1"
                max={stock === null ? undefined : Math.max(1, stock)}
                value={quantity}
                onChange={(event) => handleQuantityChange(event.target.value)}
                disabled={isOutOfStock}
              />
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={stock !== null && quantity >= stock}
              >
                +
              </button>
            </div>
          </div>

          <div className="detail-actions">
            <button type="button" className="button button-pressable" onClick={handleBuyNow} disabled={isOutOfStock || isBuyingNow}>
              {isBuyingNow ? (
                <>
                  <ButtonSpinner size="sm" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-bolt" aria-hidden="true" />
                  <span>Mua ngay</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={`button button-light button-pressable ${isAddingToCart ? 'is-success-pending' : ''}`}
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
                  <i className="fa-solid fa-cart-plus" aria-hidden="true" />
                  <span>{isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={`button button-light button-pressable favorite-toggle ${isProductFavorite ? 'active' : ''}`}
              onClick={handleFavorite}
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
                  <span>{isProductFavorite ? 'Đã yêu thích' : 'Yêu thích'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={`button button-outline button-pressable ${isProductCompared ? 'active' : ''}`}
              onClick={handleCompare}
            >
              <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
              <span>{isProductCompared ? 'Đang so sánh' : 'So sánh'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProductDetail
