import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import Breadcrumbs from '../Breadcrumbs'
import EmptyState from '../EmptyState'
import { useAuth } from '../../hooks/useAuth'

const adminMenuItems = [
  { path: '/admin', label: 'Tổng quan', end: true, superAdminOnly: false },
  { path: '/admin/products', label: 'Quản lý sản phẩm', superAdminOnly: false },
  { path: '/admin/orders', label: 'Quản lý đơn hàng', superAdminOnly: false },
  { path: '/admin/payment', label: 'Quản lý thanh toán', superAdminOnly: true },
  { path: '/admin/access', label: 'Quản lý admin', superAdminOnly: true },
]

function AdminLayout() {
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const hasAdminAccess = isAuthenticated && user?.role === 'admin'
  const canManageAdmins = Boolean(user?.canManageAdmins)
  const visibleMenuItems = adminMenuItems.filter((item) => !item.superAdminOnly || canManageAdmins)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!hasAdminAccess) {
    return (
      <section className="page-section">
        <Breadcrumbs items={[{ label: 'Trang chủ', to: '/' }, { label: 'Admin' }]} />
        <EmptyState
          title="Bạn không có quyền truy cập trang quản trị"
          description="Hãy đăng nhập bằng tài khoản admin để sử dụng các chức năng quản trị."
          icon="fa-user-shield"
        />
      </section>
    )
  }

  return (
    <section className="page-section">
      <Breadcrumbs items={[{ label: 'Trang chủ', to: '/' }, { label: 'Admin' }]} />

      <div className="section-heading">
        <div>
          <p className="eyebrow">Khu vực quản trị</p>
          <h1>Admin</h1>
        </div>
      </div>

      <div className="admin-shell">
        <aside className="admin-sidebar">
          <nav className="admin-sidebar-nav" aria-label="Điều hướng quản trị">
            {visibleMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => (isActive ? 'admin-sidebar-link active' : 'admin-sidebar-link')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="admin-main">
          <Outlet />
        </div>
      </div>
    </section>
  )
}

export default AdminLayout
