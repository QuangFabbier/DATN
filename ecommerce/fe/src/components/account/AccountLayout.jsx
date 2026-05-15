import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import Breadcrumbs from '../Breadcrumbs'
import { useAuth } from '../../hooks/useAuth'
import { getProfile } from '../../services/accountStorage'
import './account.css'

const accountMenuItems = [
  {
    to: '/account/profile',
    label: 'Hồ sơ cá nhân',
    icon: 'fa-id-card',
  },
  {
    to: '/account/security',
    label: 'Bảo mật',
    icon: 'fa-shield-halved',
  },
  {
    to: '/account/addresses',
    label: 'Địa chỉ giao hàng',
    icon: 'fa-location-dot',
  },
  {
    to: '/account/orders',
    label: 'Đơn hàng',
    icon: 'fa-box',
  },
  {
    to: '/account/wishlist',
    label: 'Yêu thích',
    icon: 'fa-heart',
  },
  {
    to: '/account/notifications',
    label: 'Thông báo',
    icon: 'fa-bell',
  },
  {
    to: '/account/appearance',
    label: 'Giao diện',
    icon: 'fa-palette',
  },
  {
    to: '/account/ai-preferences',
    label: 'AI Preferences',
    icon: 'fa-wand-magic-sparkles',
  },
]

function AccountLayout() {
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const profile = useMemo(() => getProfile(user), [user])

  const profileName =
    profile.displayName || profile.fullName || user?.name || (isAuthenticated ? 'Nexora Member' : 'Khách')

  const profileEmail = profile.email || user?.email || ''

  return (
    <section className="page-section account-page">
      <Breadcrumbs
        items={[
          { to: '/', label: 'Trang chủ' },
          { label: 'Tài khoản' },
        ]}
      />

      <header className="account-hero">
        <div className="account-hero-copy">
          <p className="eyebrow">Account Center</p>
          <h1>Quản lý tài khoản Nexora</h1>
          <p>
            Theo dõi hồ sơ, bảo mật, sở thích mua sắm và tùy chỉnh trải nghiệm cá nhân hóa cho AI
            consultant.
          </p>
          {!isAuthenticated ? (
            <Link to="/login" className="button">
              Đăng nhập để đồng bộ đầy đủ
            </Link>
          ) : null}
        </div>

        <div className="account-hero-profile">
          <div className="account-hero-avatar" aria-hidden="true">
            {profile.avatar ? <img src={profile.avatar} alt={profileName} /> : <span>{profileName[0]}</span>}
          </div>
          <div>
            <strong>{profileName}</strong>
            {profileEmail ? <p>{profileEmail}</p> : <p>Nexora account</p>}
          </div>
        </div>
      </header>

      <button
        type="button"
        className="account-sidebar-trigger"
        onClick={() => setIsSidebarOpen(true)}
      >
        <i className="fa-solid fa-sliders" aria-hidden="true" />
        <span>Mở menu tài khoản</span>
      </button>

      <div className="account-layout-shell">
        <aside className="account-sidebar" aria-label="Menu tài khoản">
          <nav className="account-sidebar-nav">
            {accountMenuItems.map((menuItem) => (
              <NavLink
                key={menuItem.to}
                to={menuItem.to}
                className={({ isActive }) =>
                  isActive || location.pathname.startsWith(`${menuItem.to}/`)
                    ? 'account-sidebar-link active'
                    : 'account-sidebar-link'
                }
                onClick={() => setIsSidebarOpen(false)}
              >
                <i className={`fa-solid ${menuItem.icon}`} aria-hidden="true" />
                <span>{menuItem.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="account-content-shell">
          <Outlet />
        </div>
      </div>

      <div
        className={`account-mobile-sidebar-backdrop ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className={`account-mobile-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="account-mobile-sidebar-header">
          <h2>Tài khoản</h2>
          <button
            type="button"
            className="icon-button"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Đóng menu tài khoản"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <nav className="account-mobile-sidebar-nav">
          {accountMenuItems.map((menuItem) => (
            <NavLink
              key={menuItem.to}
              to={menuItem.to}
              className={({ isActive }) =>
                isActive || location.pathname.startsWith(`${menuItem.to}/`)
                  ? 'account-mobile-sidebar-link active'
                  : 'account-mobile-sidebar-link'
              }
              onClick={() => setIsSidebarOpen(false)}
            >
              <i className={`fa-solid ${menuItem.icon}`} aria-hidden="true" />
              <span>{menuItem.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </section>
  )
}

export default AccountLayout
