import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { useFavorites } from '../hooks/useFavorites'
import { getProductById } from '../services/productService'
import { formatCurrency } from '../utils/formatCurrency'
import { getProductId, getProductStock, normalizeProduct } from '../utils/product'

function ProductDetail() {
  const { id } = useParams()
  const { addToCart } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [cartMessage, setCartMessage] = useState('')
  const [favoriteMessage, setFavoriteMessage] = useState('')

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true)
        setError('')
        setCartMessage('')
        setFavoriteMessage('')
        const data = await getProductById(id)
        setProduct(normalizeProduct(data))
        setQuantity(1)
      } catch (err) {
        const message =
          err.response?.status === 404 ? 'Không tìm thấy sản phẩm' : 'Không thể tải chi tiết sản phẩm'
        setError(message)
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

  function handleAddToCart() {
    if (!product) {
      return
    }

    const added = addToCart(product, quantity)

    setCartMessage(
      added
        ? `Đã thêm ${quantity} sản phẩm vào giỏ hàng.`
        : 'Không thể thêm sản phẩm này vào giỏ hàng.',
    )
  }

  function handleFavorite() {
    if (!product) {
      return
    }

    const added = toggleFavorite(product)

    setFavoriteMessage(added ? 'Đã thêm vào danh sách yêu thích.' : 'Đã xóa khỏi danh sách yêu thích.')
  }

  if (loading) {
    return (
      <section className="page-section">
        <div className="empty-state">Đang tải chi tiết sản phẩm...</div>
      </section>
    )
  }

  if (error || !product) {
    return (
      <section className="page-section">
        <div className="empty-state">
          <h1>{error || 'Không tìm thấy sản phẩm'}</h1>
          <Link to="/products" className="button">
            Quay lại danh sách sản phẩm
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page-section">
      <Link to="/products" className="back-link">
        Quay lại danh sách sản phẩm
      </Link>

      <div className="product-detail">
        <div className="detail-image-box">
          <img src={product.image} alt={product.name} className="detail-image" />
        </div>

        <div className="detail-content">
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatCurrency(product.price)}</p>
          <p className="detail-description">{product.description}</p>
          <p className={`stock-status ${isOutOfStock ? 'out-of-stock' : ''}`}>
            {isOutOfStock
              ? 'Trạng thái: Hết hàng'
              : `Trạng thái: Còn hàng${stock !== null ? ` (${stock} sản phẩm)` : ''}`}
          </p>

          <div className="detail-quantity">
            <span>Số lượng</span>
            <div className="quantity-control">
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
              >
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
            <button
              type="button"
              className="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              {isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}
            </button>
            <button type="button" className="button button-light" onClick={handleFavorite}>
              {isProductFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
            </button>
          </div>

          {cartMessage && <p className="auth-message">{cartMessage}</p>}
          {favoriteMessage && <p className="auth-message">{favoriteMessage}</p>}
        </div>
      </div>
    </section>
  )
}

export default ProductDetail
