import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { getInventoryDashboard, getInventoryInsights } from '../../services/inventoryService'
import { formatCurrency } from '../../utils/formatCurrency'
import { withMinimumDelay } from '../../utils/timing'

function formatDateTime(value) {
  if (!value) {
    return 'Chưa có'
  }

  return new Date(value).toLocaleString('vi-VN')
}

function getTransactionTypeLabel(type) {
  const normalizedType = String(type || '').toUpperCase()

  if (normalizedType === 'IMPORT') {
    return 'Nhập kho'
  }

  if (normalizedType === 'EXPORT') {
    return 'Xuất kho'
  }

  return normalizedType || 'Hoạt động'
}

function getReferenceLabel(referenceType) {
  const normalizedReference = String(referenceType || '').toUpperCase()

  if (normalizedReference === 'INVENTORY_IMPORT') {
    return 'Phiếu nhập'
  }

  if (normalizedReference === 'INVENTORY_EXPORT') {
    return 'Phiếu xuất'
  }

  if (normalizedReference === 'ORDER') {
    return 'Đơn hàng'
  }

  return referenceType || 'Hệ thống'
}

function AdminInventoryDashboard() {
  const { token, isAuthenticated, user } = useAuth()
  const { showToast } = useToast()
  const [dashboard, setDashboard] = useState(null)
  const [insights, setInsights] = useState({ summary: '', recommendations: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const hasAdminAccess = isAuthenticated && user?.role === 'admin'

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const [dashboardData, aiData] = await Promise.all([
          withMinimumDelay(getInventoryDashboard(token), 220),
          getInventoryInsights(token, { source: 'admin-dashboard' }),
        ])

        setDashboard(dashboardData)
        setInsights(aiData)
      } catch (requestError) {
        setError(requestError.message || 'Không thể tải dashboard kho.')
        showToast({
          type: 'error',
          title: 'Không thể tải dashboard kho',
          message: requestError.message || 'Vui lòng thử lại sau.',
        })
      } finally {
        setLoading(false)
      }
    }

    if (hasAdminAccess) {
      loadDashboard()
    }
  }, [hasAdminAccess, showToast, token])

  const activityList = useMemo(() => dashboard?.recentActivities || [], [dashboard])

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Cần đăng nhập để xem inventory"
        description="Bạn cần đăng nhập bằng tài khoản quản trị để xem dashboard kho."
        icon="fa-user-lock"
      />
    )
  }

  if (!hasAdminAccess) {
    return (
      <EmptyState
        title="Không có quyền quản trị"
        description="Tài khoản hiện tại không có quyền truy cập inventory."
        icon="fa-lock"
      />
    )
  }

  if (loading) {
    return <div className="admin-table-card">Đang tải dashboard kho...</div>
  }

  if (error || !dashboard) {
    return (
      <EmptyState
        title="Không thể tải dashboard kho"
        description={error || 'Không có dữ liệu inventory.'}
        icon="fa-circle-exclamation"
        tone="warning"
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">Quản lý tồn kho</p>
          <h2>Dashboard kho</h2>
        </div>
      </div>

      <div className="admin-stats-grid inventory-stats-grid">
        <article className="admin-stat-card">
          <span>Tổng sản phẩm</span>
          <strong>{dashboard.totalProducts}</strong>
        </article>
        <article className="admin-stat-card admin-stat-card-currency">
          <span>Giá trị tồn kho</span>
          <strong>{formatCurrency(dashboard.totalInventoryValue)}</strong>
        </article>
        <article className="admin-stat-card">
          <span>Sắp hết hàng</span>
          <strong>{dashboard.lowStockProducts}</strong>
        </article>
        <article className="admin-stat-card">
          <span>Hết hàng</span>
          <strong>{dashboard.outOfStockProducts}</strong>
        </article>
      </div>

      <div className="inventory-dashboard-grid">
        <section className="admin-table-card inventory-activity-card">
          <div className="admin-table-meta">
            <span>Hoạt động gần đây</span>
          </div>
          <div className="inventory-activity-list">
            {activityList.length === 0 ? (
              <p className="section-heading-meta">Chưa có giao dịch kho nào.</p>
            ) : (
              activityList.map((activity) => (
                <article key={activity.id} className="inventory-activity-item">
                  <div>
                    <strong>{activity.product?.name || 'Sản phẩm'}</strong>
                    <p>
                      {getTransactionTypeLabel(activity.type)} - SL {activity.quantity} -{' '}
                      {getReferenceLabel(activity.referenceType)}
                    </p>
                  </div>
                  <small>
                    {activity.stockBefore} → {activity.stockAfter}
                  </small>
                  <span>{formatDateTime(activity.createdAt)}</span>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="admin-table-card inventory-ai-card">
          <div className="admin-table-meta">
            <span>Gợi ý từ AI</span>
          </div>
          <div className="inventory-ai-panel">
            <p>{insights.summary || 'Tồn kho đang ổn định.'}</p>
            {Array.isArray(insights.recommendations) && insights.recommendations.length > 0 ? (
              <ul className="inventory-ai-list">
                {insights.recommendations.map((item, index) => (
                  <li key={`${item.productId || 'ai'}-${index}`}>
                    <strong>{item.type}</strong>
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="section-heading-meta">Không có khuyến nghị nổi bật.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default AdminInventoryDashboard
