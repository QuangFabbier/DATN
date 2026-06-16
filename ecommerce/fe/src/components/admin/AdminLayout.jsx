import { useMemo, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import Breadcrumbs from '../Breadcrumbs'
import EmptyState from '../EmptyState'
import { useAuth } from '../../hooks/useAuth'

const adminMenuItems = [
  { type: 'link', path: '/admin', label: 'Tổng quan', end: true, superAdminOnly: false },
  {
    type: 'group',
    path: '/admin/inventory',
    label: 'Quản lý kho',
    superAdminOnly: false,
    children: [
      { path: '/admin/inventory/imports', label: 'Phiếu nhập' },
      { path: '/admin/inventory/exports', label: 'Phiếu xuất' },
      { path: '/admin/inventory/transactions', label: 'Giao dịch kho' },
    ],
  },
  { type: 'link', path: '/admin/products', label: 'Quản lý sản phẩm', superAdminOnly: false },
  { type: 'link', path: '/admin/product-catalog', label: 'Danh sách sản phẩm', superAdminOnly: false },
  { type: 'link', path: '/admin/reviews', label: 'Quản lý review', superAdminOnly: false },
  { type: 'link', path: '/admin/orders', label: 'Quản lý đơn hàng', superAdminOnly: false },
  { type: 'link', path: '/admin/payment', label: 'Quản lý thanh toán', superAdminOnly: true },
  { type: 'link', path: '/admin/access', label: 'Quản lý admin', superAdminOnly: true },
]

function AdminLayout() {
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const hasAdminAccess = isAuthenticated && user?.role === 'admin'
  const canManageAdmins = Boolean(user?.canManageAdmins)
  const isInventoryRoute = location.pathname.startsWith('/admin/inventory')
  const [inventoryMenuManualOpen, setInventoryMenuManualOpen] = useState(false)
  const inventoryMenuOpen = isInventoryRoute || inventoryMenuManualOpen

  const visibleMenuItems = useMemo(
    () => adminMenuItems.filter((item) => !item.superAdminOnly || canManageAdmins),
    [canManageAdmins],
  )

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
            {visibleMenuItems.map((item) => {
              if (item.type === 'group') {
                return (
                  <div
                    key={item.path}
                    className={`admin-sidebar-group ${isInventoryRoute ? 'active' : ''} ${
                      inventoryMenuOpen ? 'open' : ''
                    }`}
                  >
                    <div className="admin-sidebar-group-header">
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          isActive ? 'admin-sidebar-group-link active' : 'admin-sidebar-group-link'
                        }
                      >
                        {item.label}
                      </NavLink>
                      <button
                        type="button"
                        className="admin-sidebar-group-toggle"
                        onClick={() => setInventoryMenuManualOpen((current) => !current)}
                        aria-label={
                          inventoryMenuOpen ? 'Thu gọn nhóm quản lý kho' : 'Mở rộng nhóm quản lý kho'
                        }
                        aria-expanded={inventoryMenuOpen}
                      >
                        <i
                          className={`fa-solid fa-chevron-${inventoryMenuOpen ? 'up' : 'down'}`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    <div className="admin-sidebar-subnav" aria-label={`${item.label} submenu`}>
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) =>
                            isActive ? 'admin-sidebar-sublink active' : 'admin-sidebar-sublink'
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => (isActive ? 'admin-sidebar-link active' : 'admin-sidebar-link')}
                >
                  {item.label}
                </NavLink>
              )
            })}
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
