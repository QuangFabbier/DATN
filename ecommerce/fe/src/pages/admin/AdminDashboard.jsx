import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import { AdminDashboardSkeleton } from '../../components/Skeleton'
import { getOrderStats, ORDER_STORAGE_KEY, ORDER_STORAGE_UPDATED_EVENT } from '../../services/orderStorage'
import { getProducts } from '../../services/productService'
import { withMinimumDelay } from '../../utils/timing'
import { formatCurrency } from '../../utils/formatCurrency'

function AdminDashboard() {
  const [products, setProducts] = useState([])
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    revenue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError('')
        const data = await withMinimumDelay(getProducts(), 220)
        setProducts(data)
        setOrderStats(getOrderStats())
      } catch {
        setError('Không thể tải dữ liệu quản trị.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  useEffect(() => {
    function syncOrderStats() {
      setOrderStats(getOrderStats())
    }

    function handleStorageSync(event) {
      if (event.key === ORDER_STORAGE_KEY) {
        syncOrderStats()
      }
    }

    window.addEventListener(ORDER_STORAGE_UPDATED_EVENT, syncOrderStats)
    window.addEventListener('storage', handleStorageSync)

    return () => {
      window.removeEventListener(ORDER_STORAGE_UPDATED_EVENT, syncOrderStats)
      window.removeEventListener('storage', handleStorageSync)
    }
  }, [])

  const totalProducts = products.length
  const inStockProducts = products.filter((product) => (product.stock || 0) > 0).length
  const outOfStockProducts = products.filter((product) => (product.stock || 0) === 0).length
  const totalCategories = new Set(
    products.map((product) => product.category).filter((category) => Boolean(category)),
  ).size

  if (loading) {
    return <AdminDashboardSkeleton count={8} />
  }

  if (error) {
    return (
      <EmptyState
        title="Không thể tải dashboard quản trị"
        description={error}
        icon="fa-circle-exclamation"
        tone="warning"
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">Tổng quan</p>
          <h2>Dashboard</h2>
        </div>
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
        <article className="admin-stat-card">
          <span>Tổng đơn hàng</span>
          <strong>{orderStats.totalOrders}</strong>
        </article>
        <article className="admin-stat-card">
          <span>Đơn chờ xác nhận</span>
          <strong>{orderStats.pendingOrders}</strong>
        </article>
        <article className="admin-stat-card">
          <span>Đơn hoàn thành</span>
          <strong>{orderStats.completedOrders}</strong>
        </article>
        <article className="admin-stat-card admin-stat-card-currency">
          <span>Doanh thu (đơn hoàn thành)</span>
          <strong>{formatCurrency(orderStats.revenue)}</strong>
        </article>
      </div>

      <Link to="/admin/orders" className="button button-light">
        Mở quản lý đơn hàng
      </Link>
    </div>
  )
}

export default AdminDashboard
