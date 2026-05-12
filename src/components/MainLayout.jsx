import { NavLink, Outlet, useNavigate } from "react-router-dom";
import AIConsultantWidget from "./AIConsultantWidget";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useFavorites } from "../hooks/useFavorites";
import { useSearch } from "../hooks/useSearch";

const menuItems = [
  { path: "/", label: "Trang chủ" },
  { path: "/products", label: "Sản phẩm" },
  { path: "/favorites", label: "Yêu thích" },
  { path: "/cart", label: "Giỏ hàng" },
];

function MainLayout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartItemCount } = useCart();
  const { favoriteItems } = useFavorites();
  const { searchKeyword, setSearchKeyword } = useSearch();

  function handleSubmit(event) {
    event.preventDefault();

    const keyword = searchKeyword.trim();
    // Submit search sẽ chuyển sang trang Products kèm query string.
    navigate(
      keyword ? `/products?search=${encodeURIComponent(keyword)}` : "/products",
    );
  }

  function handleLogout() {
    logout();
    navigate("/");
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
            <NavLink to="/favorites" className="header-link header-link-badge">
              <span>Yêu thích</span>
              <span className="header-badge">{favoriteItems.length}</span>
            </NavLink>
            <NavLink to="/cart" className="header-link header-link-badge">
              <span>Giỏ hàng</span>
              <span className="header-badge">{cartItemCount}</span>
            </NavLink>

            {isAuthenticated ? (
              <div className="account-menu">
                <button
                  type="button"
                  className="account-trigger"
                  aria-haspopup="menu"
                >
                  <span className="account-name">{user?.name}</span>
                </button>

                <div
                  className="account-dropdown"
                  role="menu"
                  aria-label="Tài khoản"
                >
                  <NavLink
                    to="/orders"
                    className="account-dropdown-link"
                    role="menuitem"
                  >
                    Đơn hàng
                  </NavLink>
                  <button
                    type="button"
                    className="account-dropdown-link account-dropdown-button"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
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
              end={item.path === "/"}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
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

      <AIConsultantWidget />
    </div>
  );
}

export default MainLayout;
