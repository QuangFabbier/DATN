import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import { AdminProductsSkeleton } from '../../components/Skeleton'
import { useAuth } from '../../hooks/useAuth'
import { getProducts } from '../../services/productService'
import { formatCurrency } from '../../utils/formatCurrency'
import { getProductId, normalizeProductCategory, PRODUCT_PLACEHOLDER_IMAGE } from '../../utils/product'
import { withMinimumDelay } from '../../utils/timing'

function AdminProductCatalog() {
  const { isAuthenticated, user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tất cả')
  const [selectedBrand, setSelectedBrand] = useState('Tất cả')
  const [sortBy, setSortBy] = useState('featured')

  const hasAdminAccess = isAuthenticated && user?.role === 'admin'

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError('')
        const data = await withMinimumDelay(getProducts(), 220)
        setProducts(data)
      } catch (requestError) {
        setError(requestError.message || 'Không thể tải danh sách sản phẩm.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const categories = useMemo(
    () => ['Tất cả', ...new Set(products.map((product) => normalizeProductCategory(product.category)).filter(Boolean))],
    [products],
  )

  const brands = useMemo(
    () => [
      'Tất cả',
      ...new Set(
        products
          .map((product) => String(product.brand || '').trim())
          .filter(Boolean),
      ),
    ],
    [products],
  )

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase()
    const normalizedBrand = selectedBrand.trim().toLowerCase()

    const nextProducts = products.filter((product) => {
      const matchesKeyword = normalizedKeyword
        ? `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(normalizedKeyword)
        : true

      const matchesCategory =
        selectedCategory === 'Tất cả'
          ? true
          : normalizeProductCategory(product.category) === selectedCategory

      const matchesBrand =
        selectedBrand === 'Tất cả'
          ? true
          : String(product.brand || '').trim().toLowerCase() === normalizedBrand

      return matchesKeyword && matchesCategory && matchesBrand
    })

    return [...nextProducts].sort((firstProduct, secondProduct) => {
      if (sortBy === 'priceAsc') {
        return Number(firstProduct.price || 0) - Number(secondProduct.price || 0)
      }

      if (sortBy === 'priceDesc') {
        return Number(secondProduct.price || 0) - Number(firstProduct.price || 0)
      }

      if (sortBy === 'nameAsc') {
        return String(firstProduct.name || '').localeCompare(String(secondProduct.name || ''), 'vi')
      }

      if (sortBy === 'nameDesc') {
        return String(secondProduct.name || '').localeCompare(String(firstProduct.name || ''), 'vi')
      }

      return 0
    })
  }, [products, searchKeyword, selectedCategory, selectedBrand, sortBy])

  if (loading) {
    return <AdminProductsSkeleton />
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Cần đăng nhập để xem danh sách sản phẩm"
        description="Bạn cần đăng nhập bằng tài khoản quản trị để xem danh sách sản phẩm."
        icon="fa-user-lock"
      />
    )
  }

  if (!hasAdminAccess) {
    return (
      <EmptyState
        title="Không có quyền quản trị"
        description="Tài khoản hiện tại không có quyền admin để xem danh sách sản phẩm."
        icon="fa-lock"
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">Danh sách sản phẩm</p>
          <h2>View Products</h2>
        </div>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}

      <div className="admin-toolbar admin-catalog-toolbar">
        <input
          type="search"
          value={searchKeyword}
          onChange={(event) => setSearchKeyword(event.target.value)}
          placeholder="Tìm theo tên, hãng hoặc danh mục"
        />
        <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select value={selectedBrand} onChange={(event) => setSelectedBrand(event.target.value)}>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="featured">Nổi bật</option>
          <option value="priceAsc">Giá tăng dần</option>
          <option value="priceDesc">Giá giảm dần</option>
          <option value="nameAsc">Tên A-Z</option>
          <option value="nameDesc">Tên Z-A</option>
        </select>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="Chưa có sản phẩm nào"
          description="MongoDB hiện chưa có sản phẩm để hiển thị."
          icon="fa-box-open"
        />
      ) : (
        <div className="admin-table-card">
          <div className="admin-table-meta">
            <span>{filteredProducts.length} sản phẩm phù hợp</span>
          </div>

          {filteredProducts.length === 0 ? (
            <EmptyState
              title="Không có sản phẩm phù hợp"
              description="Hãy đổi từ khóa hoặc danh mục để xem các sản phẩm khác."
              icon="fa-filter-circle-xmark"
            />
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ảnh</th>
                    <th>Tên sản phẩm</th>
                    <th>Hãng</th>
                    <th>Danh mục</th>
                    <th>Giá</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={getProductId(product)}>
                      <td>
                        <img
                          src={product.image || PRODUCT_PLACEHOLDER_IMAGE}
                          alt={product.name}
                          className="admin-product-image"
                        />
                      </td>
                      <td>
                        <strong>{product.name}</strong>
                      </td>
                      <td>{product.brand || 'N/A'}</td>
                      <td>{product.category}</td>
                      <td>{formatCurrency(product.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminProductCatalog
