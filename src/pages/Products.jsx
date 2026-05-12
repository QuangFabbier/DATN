import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useSearch } from '../hooks/useSearch'
import { getProducts } from '../services/productService'

function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tất cả')
  const [searchParams] = useSearchParams()
  const { searchKeyword, setSearchKeyword } = useSearch()

  useEffect(() => {
    // Đồng bộ keyword khi truy cập trực tiếp /products?search=...
    setSearchKeyword(searchParams.get('search') || '')
  }, [searchParams, setSearchKeyword])

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError('')
        const data = await getProducts()
        setProducts(data)
      } catch {
        setError('Không thể tải danh sách sản phẩm.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const categories = ['Tất cả', ...new Set(products.map((product) => product.category))]
  const keyword = searchKeyword.trim().toLowerCase()

  // Lọc theo tên sản phẩm từ ô search trên Header.
  const searchedProducts = keyword
    ? products.filter((product) => product.name.toLowerCase().includes(keyword))
    : products

  // Lọc tiếp theo danh mục đang chọn.
  const filteredProducts =
    selectedCategory === 'Tất cả'
      ? searchedProducts
      : searchedProducts.filter((product) => product.category === selectedCategory)

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Danh sách sản phẩm</p>
          <h1>Sản phẩm</h1>
        </div>
        <span>{filteredProducts.length} sản phẩm</span>
      </div>

      <div className="toolbar products-toolbar">
        <select
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          aria-label="Lọc theo danh mục"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
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
        <div className="empty-state">Không tìm thấy sản phẩm phù hợp.</div>
      )}
    </section>
  )
}

export default Products
