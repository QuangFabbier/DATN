import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProductById } from '../services/productService'
import { formatCurrency } from '../utils/formatCurrency'

function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true)
        setError('')
        const data = await getProductById(id)
        setProduct(data)
      } catch (err) {
        const message = err.response?.status === 404 ? 'Không tìm thấy sản phẩm' : 'Không thể tải chi tiết sản phẩm'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  function handleAddToCart() {
    console.log('Thêm vào giỏ hàng:', product)
  }

  function handleFavorite() {
    console.log('Yêu thích sản phẩm:', product)
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
          <p className="stock-status">Trạng thái: Còn hàng ({product.stock} sản phẩm)</p>

          <div className="detail-actions">
            <button type="button" className="button" onClick={handleAddToCart}>
              Thêm vào giỏ hàng
            </button>
            <button type="button" className="button button-light" onClick={handleFavorite}>
              Yêu thích
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProductDetail
