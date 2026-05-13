import { NavLink, Outlet } from 'react-router-dom'

const adminMenuItems = [
  { path: '/admin', label: 'Tổng quan', end: true },
  { path: '/admin/products', label: 'Quản lý sản phẩm' },
]

function AdminLayout() {
  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Khu vực quản trị</p>
          <h1>Admin</h1>
        </div>
      </div>

      <div className="admin-shell">
        <aside className="admin-sidebar">
          <nav className="admin-sidebar-nav" aria-label="Điều hướng quản trị">
            {adminMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? 'admin-sidebar-link active' : 'admin-sidebar-link'
                }
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
