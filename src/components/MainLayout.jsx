import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import "../../fontawesome-free-7.2.0-web/css/all.min.css";
import AIConsultantWidget from "./AIConsultantWidget";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useFavorites } from "../hooks/useFavorites";
import { useSearch } from "../hooks/useSearch";

const menuItems = [
  { path: "/", label: "Trang chủ" },
  { path: "/products", label: "Sản phẩm" },
];

const nexoraLogoPng = new URL("../assets/image/logo.png", import.meta.url).href;
function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartItemCount } = useCart();
  const { favoriteItems } = useFavorites();
  const { searchKeyword, setSearchKeyword } = useSearch();
  const isAdminRoute = location.pathname.startsWith("/admin");

  function handleSubmit(event) {
    event.preventDefault();

    const keyword = searchKeyword.trim();
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
          <NavLink to="/" className="brand" aria-label="Nexora">
            <img src={nexoraLogoPng} alt="Nexora" className="brand-logo" />
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
            <NavLink to="/admin" className="header-link admin-header-link">
              Admin
            </NavLink>
            <NavLink to="/favorites" className="header-link header-link-badge">
              <i
                className="fa-solid fa-heart header-link-icon"
                aria-hidden="true"
              />
              <span className="header-badge">{favoriteItems.length}</span>
            </NavLink>
            <NavLink to="/cart" className="header-link header-link-badge">
              <i
                className="fa-solid fa-cart-shopping header-link-icon"
                aria-hidden="true"
              />
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

      <main
        className={
          isAdminRoute ? "main-content admin-page-content" : "main-content"
        }
      >
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <section className="footer-service-bar">
            <article className="footer-service-item">
              <i className="fa-solid fa-truck-fast footer-service-icon" aria-hidden="true" />
              <h3>Giao Hàng Toàn Quốc</h3>
              <p>Giao hàng trước, trả tiền sau COD</p>
            </article>

            <article className="footer-service-item">
              <i className="fa-solid fa-rotate-left footer-service-icon" aria-hidden="true" />
              <h3>Đổi Trả Dễ Dàng</h3>
              <p>Đổi mới trong 30 ngày đầu</p>
            </article>

            <article className="footer-service-item">
              <i className="fa-regular fa-credit-card footer-service-icon" aria-hidden="true" />
              <h3>Thanh Toán Tiện Lợi</h3>
              <p>Trả tiền mặt, chuyển khoản, trả góp 0%</p>
            </article>

            <article className="footer-service-item">
              <i className="fa-solid fa-headset footer-service-icon" aria-hidden="true" />
              <h3>Hỗ Trợ Nhiệt Tình</h3>
              <p>Tư vấn tổng đài miễn phí 24/7</p>
            </article>
          </section>

          <section className="footer-brand-block footer-panel">
            <img
              src={nexoraLogoPng}
              alt="Nexora"
              className="footer-brand-visual"
            />
            <p className="footer-kicker">Nexora Tech Store</p>
            <h2>
              Không gian mua sắm công nghệ hiện đại, rõ ràng và dễ trải nghiệm.
            </h2>
            {/* <p className="footer-description">
              Demo ecommerce ReactJS phục vụ đồ án tốt nghiệp với shopping flow
              hoàn chỉnh, khu vực admin frontend và trải nghiệm UI đang được
              hoàn thiện liên tục.
            </p> */}
          </section>

          <section className="footer-card footer-panel">
            <p className="footer-card-title">Liên hệ</p>
            <a href="tel:0982241317" className="footer-contact-link">
              <i className="fa-solid fa-phone-volume" aria-hidden="true" />
              <span>0982241317</span>
            </a>
            <a
              href="mailto:nguyenminhquang0325@gmail.com"
              className="footer-contact-link"
            >
              <i className="fa-solid fa-envelope" aria-hidden="true" />
              <span>nguyenminhquang0325@gmail.com</span>
            </a>
          </section>

          <section className="footer-card footer-panel">
            <p className="footer-card-title">Cơ sở</p>
            <div className="footer-location-list">
              <div className="footer-address">
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                <p>52B ngõ 4 Hoàng Quốc Việt, Nghĩa Đô, Hà Nội</p>
              </div>
              <div className="footer-address">
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                <p>55 Nghiêm Quý Ngãi, Hầm Rồng, tỉnh Thanh Hóa</p>
              </div>
            </div>
          </section>
        </div>
      </footer>

      <AIConsultantWidget />
    </div>
  );
}

export default MainLayout;
