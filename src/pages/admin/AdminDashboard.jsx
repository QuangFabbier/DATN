import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts } from '../../services/productService'

function AdminDashboard() {
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
        setError('Không thể tải dữ liệu quản trị.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const totalProducts = products.length
  const inStockProducts = products.filter((product) => (product.stock || 0) > 0).length
  const outOfStockProducts = products.filter((product) => (product.stock || 0) === 0).length
  const totalCategories = new Set(
    products.map((product) => product.category).filter((category) => Boolean(category)),
  ).size

  if (loading) {
    return <div className="empty-state">Đang tải dashboard quản trị...</div>
  }

  if (error) {
    return <div className="empty-state">{error}</div>
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">Tổng quan</p>
          <h2>Dashboard</h2>
        </div>
        <Link to="/admin/products" className="button">
          Quản lý sản phẩm
        </Link>
      </div>

      <div className="admin-stats-grid">
        <article className="admin-stat-card">
          <span>Tổng số sản phẩm</span>
          <strong>{totalProducts}</strong>
        </article>
        <article className="admin-stat-card">
          <span>Sản phẩm còn hàng</span>
          <strong>{inStockProducts}</strong>
        </article>
        <article className="admin-stat-card">
          <span>Sản phẩm hết hàng</span>
          <strong>{outOfStockProducts}</strong>
        </article>
        <article className="admin-stat-card">
          <span>Tổng số danh mục</span>
          <strong>{totalCategories}</strong>
        </article>
      </div>
    </div>
  )
}

export default AdminDashboard
