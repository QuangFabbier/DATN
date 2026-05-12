import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useSearch } from '../hooks/useSearch'
import { getProducts } from '../services/productService'

function Home() {
  const { searchKeyword } = useSearch()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError('')
        const data = await getProducts()
        setProducts(data)
      } catch {
        setError('Không thể tải sản phẩm nổi bật.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const featuredProducts = products.slice(0, 4)
  const keyword = searchKeyword.trim().toLowerCase()

  // Header search lọc nhóm sản phẩm nổi bật ngay trên trang Home.
  const filteredProducts = keyword
    ? featuredProducts.filter((product) => product.name.toLowerCase().includes(keyword))
    : featuredProducts

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
            <Link to="/ai-consultant" className="button button-outline">
              Tư vấn AI
            </Link>
          </div>
        </div>
      </div>

      <div className="section-heading">
        <h2>Sản phẩm nổi bật</h2>
        <Link to="/products">Xem tất cả</Link>
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
