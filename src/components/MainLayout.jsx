import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useFavorites } from '../hooks/useFavorites'
import { useSearch } from '../hooks/useSearch'

const menuItems = [
  { path: '/', label: 'Trang chủ' },
  { path: '/products', label: 'Sản phẩm' },
  { path: '/favorites', label: 'Yêu thích' },
  { path: '/cart', label: 'Giỏ hàng' },
  { path: '/orders', label: 'Đơn hàng' },
  { path: '/ai-consultant', label: 'Tư vấn AI' },
]

function MainLayout() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const { cartItems } = useCart()
  const { favoriteItems } = useFavorites()
  const { searchKeyword, setSearchKeyword } = useSearch()

  const cartQuantity = cartItems.reduce((total, item) => total + item.quantity, 0)

  function handleSubmit(event) {
    event.preventDefault()

    const keyword = searchKeyword.trim()
    // Submit search sẽ chuyển sang trang Products kèm query string.
    navigate(keyword ? `/products?search=${encodeURIComponent(keyword)}` : '/products')
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-main">
          <NavLink to="/" className="brand">
            DATN Shop
          </NavLink>

          <form className="header-search" onSubmit={handleSubmit}>
            <input
              type="search"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              aria-label="Tìm kiếm sản phẩm"
            />
            <button type="submit">Tìm kiếm</button>
          </form>

          <div className="header-actions">
            <NavLink to="/favorites" className="header-link">
              Yêu thích ({favoriteItems.length})
            </NavLink>
            <NavLink to="/cart" className="header-link">
              Giỏ hàng ({cartQuantity})
            </NavLink>

            {isAuthenticated ? (
              <>
                <span className="user-pill">{user?.name}</span>
                <button type="button" className="header-link logout-button" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="button button-outline">
                  Đăng nhập
                </NavLink>
                <NavLink to="/register" className="button">
                  Đăng ký
                </NavLink>
              </>
            )}
          </div>
        </div>

        <nav className="main-nav" aria-label="Điều hướng chính">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>Website thương mại điện tử ReactJS dùng dữ liệu JSON.</p>
      </footer>
    </div>
  )
}

export default MainLayout
