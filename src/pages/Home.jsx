import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AI_WIDGET_OPEN_EVENT } from '../components/AIConsultantWidget'
import ProductCard from '../components/ProductCard'
import { useSearch } from '../hooks/useSearch'
import { getProducts } from '../services/productService'

function getRandomFeaturedProducts(products, limit = 4) {
  const shuffledProducts = [...products]

  for (let index = shuffledProducts.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const currentProduct = shuffledProducts[index]

    shuffledProducts[index] = shuffledProducts[randomIndex]
    shuffledProducts[randomIndex] = currentProduct
  }

  return shuffledProducts.slice(0, limit)
}

function Home() {
  const { searchKeyword } = useSearch()
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError('')
        const data = await getProducts()
        setFeaturedProducts(getRandomFeaturedProducts(data))
      } catch {
        setError('Không thể tải sản phẩm nổi bật.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const keyword = searchKeyword.trim().toLowerCase()

  // Header search lọc nhóm sản phẩm nổi bật ngay trên trang Home.
  const filteredProducts = keyword
    ? featuredProducts.filter((product) => product.name.toLowerCase().includes(keyword))
    : featuredProducts

  function handleOpenAIWidget() {
    window.dispatchEvent(new Event(AI_WIDGET_OPEN_EVENT))
  }

  return (
    <section className="page-section">
      <div className="hero-section">
        <div>
          <p className="eyebrow">Đồ án tốt nghiệp</p>
          <h1>Website thương mại điện tử bằng ReactJS</h1>
          <p className="hero-text">
            Cấu trúc project gọn gàng, dữ liệu sản phẩm dùng JSON và sẵn sàng mở rộng thêm tư vấn sản phẩm bằng AI.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="button">
              Xem sản phẩm
            </Link>
            <button type="button" className="button button-outline" onClick={handleOpenAIWidget}>
              Tư vấn AI
            </button>
          </div>
        </div>
      </div>

      <div className="section-heading">
        <h2>Sản phẩm nổi bật</h2>
        <Link to="/products" className="section-action-link">
          Xem tất cả
        </Link>
      </div>

      {loading && <div className="empty-state">Đang tải sản phẩm...</div>}
      {error && <div className="empty-state">{error}</div>}

      {!loading && !error && filteredProducts.length > 0 ? (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      ) : null}

      {!loading && !error && filteredProducts.length === 0 && (
        <div className="empty-state">Không tìm thấy sản phẩm phù hợp</div>
      )}
    </section>
  )
}

export default Home
