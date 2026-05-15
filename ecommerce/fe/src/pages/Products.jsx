import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ProductCard from '../components/ProductCard'
import { ProductGridSkeleton } from '../components/Skeleton'
import { useSearch } from '../hooks/useSearch'
import { getProducts } from '../services/productService'
import { getProductId } from '../utils/product'
import { withMinimumDelay } from '../utils/timing'

function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('featured')
  const [searchParams, setSearchParams] = useSearchParams()
  const { searchKeyword, setSearchKeyword } = useSearch()
  const selectedCategory = searchParams.get('category') || 'Tất cả'

  useEffect(() => {
    setSearchKeyword(searchParams.get('search') || '')
  }, [searchParams, setSearchKeyword])

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError('')
        const data = await withMinimumDelay(getProducts(), 240)
        setProducts(data)
      } catch {
        setError('Không thể tải danh sách sản phẩm.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const categories = useMemo(
    () => ['Tất cả', ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  )

  const keyword = searchKeyword.trim().toLowerCase()
  const pageTitle = selectedCategory === 'Tất cả' ? 'Sản phẩm' : selectedCategory

  const filteredProducts = useMemo(() => {
    const nextProducts = products
      .filter((product) => (keyword ? product.name.toLowerCase().includes(keyword) : true))
      .filter((product) => (selectedCategory === 'Tất cả' ? true : product.category === selectedCategory))

    return [...nextProducts].sort((firstProduct, secondProduct) => {
      if (sortBy === 'priceAsc') {
        return firstProduct.price - secondProduct.price
      }

      if (sortBy === 'priceDesc') {
        return secondProduct.price - firstProduct.price
      }

      if (sortBy === 'nameAsc') {
        return firstProduct.name.localeCompare(secondProduct.name)
      }

      return secondProduct.price - firstProduct.price
    })
  }, [keyword, products, selectedCategory, sortBy])

  const suggestedProducts = useMemo(
    () =>
      products
        .filter(
          (product) =>
            !filteredProducts.some(
              (filteredProduct) => getProductId(filteredProduct) === getProductId(product),
            ),
        )
        .slice(0, 4),
    [filteredProducts, products],
  )

  function updateParams(nextCategory, nextSearch) {
    const nextParams = new URLSearchParams(searchParams)

    if (nextCategory && nextCategory !== 'Tất cả') {
      nextParams.set('category', nextCategory)
    } else {
      nextParams.delete('category')
    }

    if (nextSearch.trim()) {
      nextParams.set('search', nextSearch.trim())
    } else {
      nextParams.delete('search')
    }

    setSearchParams(nextParams)
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Danh sách sản phẩm</p>
          <h1>{pageTitle}</h1>
        </div>
        <span className="section-heading-meta">{filteredProducts.length} sản phẩm</span>
      </div>

      <div className="toolbar products-toolbar sticky-filter-bar">
        <label className="filter-field">
          <span>Tìm kiếm</span>
          <input
            type="search"
            value={searchKeyword}
            onChange={(event) => {
              setSearchKeyword(event.target.value)
              updateParams(selectedCategory, event.target.value)
            }}
            placeholder="Tìm theo tên sản phẩm"
          />
        </label>

        <label className="filter-field">
          <span>Danh mục</span>
          <select
            value={selectedCategory}
            onChange={(event) => {
              updateParams(event.target.value, searchKeyword)
            }}
            aria-label="Lọc theo danh mục"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>Sắp xếp</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sắp xếp sản phẩm">
            <option value="featured">Nổi bật</option>
            <option value="priceAsc">Giá tăng dần</option>
            <option value="priceDesc">Giá giảm dần</option>
            <option value="nameAsc">Tên A-Z</option>
          </select>
        </label>
      </div>

      {loading ? <ProductGridSkeleton count={8} /> : null}

      {error ? (
        <EmptyState
          title="Không thể tải danh sách sản phẩm"
          description={error}
          icon="fa-circle-exclamation"
          tone="warning"
          action={
            <Link to="/" className="button">
              Quay lại trang chủ
            </Link>
          }
        />
      ) : null}

      {!loading && !error && filteredProducts.length > 0 ? (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      ) : null}

      {!loading && !error && filteredProducts.length === 0 ? (
        <>
          <EmptyState
            title="Không tìm thấy sản phẩm phù hợp"
            description="Hãy thử từ khóa khác, quay lại danh mục tổng hoặc xem các gợi ý bên dưới."
            icon="fa-magnifying-glass"
            action={
              <button
                type="button"
                className="button"
                onClick={() => {
                  setSearchKeyword('')
                  setSearchParams(new URLSearchParams())
                }}
              >
                Xóa bộ lọc
              </button>
            }
          />

          {suggestedProducts.length > 0 ? (
            <div className="suggested-products-section">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">Gợi ý thêm</p>
                  <h2>Sản phẩm bạn có thể quan tâm</h2>
                </div>
              </div>

              <div className="product-grid">
                {suggestedProducts.map((product) => (
                  <ProductCard key={getProductId(product)} product={product} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

export default Products
