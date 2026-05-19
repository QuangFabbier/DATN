import { useEffect, useMemo, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "../../fontawesome-free-7.2.0-web/css/all.min.css";
import AIConsultantWidget from "./AIConsultantWidget";
import BackToTopButton from "./BackToTopButton";
import CompareTray from "./CompareTray";
import { TopProgressBar } from "./ProgressBar";
import { CART_ITEM_ADDED_EVENT } from "../context/CartProvider";
import { FAVORITE_TOGGLED_EVENT } from "../context/FavoritesProvider";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useFavorites } from "../hooks/useFavorites";
import { useSearch } from "../hooks/useSearch";
import { useTheme } from "../hooks/useTheme";
import { getProfile } from "../services/accountStorage";
import { getProducts } from "../services/productService";
import { formatCurrency } from "../utils/formatCurrency";

const menuItems = [
  { path: "/", label: "Trang chủ", end: true },
  { path: "/products", label: "Sản phẩm" },
];

const nexoraLogoPng = new URL("../assets/image/logo.png", import.meta.url).href;

function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartItemCount, cartItems, cartTotal, removeFromCart } = useCart();
  const { favoriteItems } = useFavorites();
  const { searchKeyword, setSearchKeyword } = useSearch();
  const { isDarkMode, toggleTheme } = useTheme();
  const [categories, setCategories] = useState([]);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isCartMenuOpen, setIsCartMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartIconAnimated, setIsCartIconAnimated] = useState(false);
  const [isFavoriteIconAnimated, setIsFavoriteIconAnimated] = useState(false);
  const isAdminRoute = location.pathname.startsWith("/admin");
  const hasAdminAccess = isAuthenticated && user?.role === "admin";
  const accountProfile = useMemo(() => getProfile(user), [user]);
  const accountDisplayName =
    accountProfile.displayName || accountProfile.fullName || user?.name || "Tài khoản";
  const accountInitial = accountDisplayName?.[0]?.toUpperCase() || "N";

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getProducts();
        setCategories([
          ...new Set(data.map((product) => product.category).filter(Boolean)),
        ]);
      } catch {
        setCategories([]);
      }
    }

    fetchCategories();
  }, []);

  useEffect(() => {
    function handleCartPulse() {
      setIsCartIconAnimated(true);
      window.setTimeout(() => setIsCartIconAnimated(false), 620);
    }

    function handleFavoritePulse() {
      setIsFavoriteIconAnimated(true);
      window.setTimeout(() => setIsFavoriteIconAnimated(false), 520);
    }

    window.addEventListener(CART_ITEM_ADDED_EVENT, handleCartPulse);
    window.addEventListener(FAVORITE_TOGGLED_EVENT, handleFavoritePulse);

    return () => {
      window.removeEventListener(CART_ITEM_ADDED_EVENT, handleCartPulse);
      window.removeEventListener(FAVORITE_TOGGLED_EVENT, handleFavoritePulse);
    };
  }, []);

  const bottomNavigationAccountPath = isAuthenticated ? "/account" : "/login";
  const bottomNavigationAccountLabel = isAuthenticated
    ? "Tài khoản"
    : "Đăng nhập";

  const accountLinks = [
    { path: "/account/profile", label: "Tài khoản", icon: "fa-user-gear" },
    { path: "/account/orders", label: "Lịch sử mua", icon: "fa-box" },
  ];

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

  function handleCategoryNavigate(category) {
    navigate(`/products?category=${encodeURIComponent(category)}`);
  }

  return (
    <div className={`app-shell ${isAdminRoute ? "admin-shell-page" : ""}`}>
      <TopProgressBar />

      <header className="site-header">
        <div className="header-main">
          <div className="header-brand-group">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Mở menu điều hướng"
            >
              <i className="fa-solid fa-bars" aria-hidden="true" />
            </button>

            <NavLink to="/" className="brand" aria-label="Nexora">
              <img src={nexoraLogoPng} alt="Nexora" className="brand-logo" />
            </NavLink>
          </div>

          <form className="header-search" onSubmit={handleSubmit}>
            <input
              type="search"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Tìm laptop, điện thoại, phụ kiện..."
              aria-label="Tìm kiếm sản phẩm"
            />
            <button type="submit">Tìm kiếm</button>
          </form>

          <div className="header-actions">
            {hasAdminAccess ? (
              <NavLink
                to="/admin"
                className="header-link admin-header-link"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  setIsCartMenuOpen(false);
                }}
              >
                Admin
              </NavLink>
            ) : null}

            <NavLink
              to="/favorites"
              className={`header-link header-link-badge ${isFavoriteIconAnimated ? "badge-pulse" : ""}`}
              aria-label={`Yêu thích, ${favoriteItems.length} sản phẩm`}
              onClick={(event) => {
                if (!isAuthenticated) {
                  event.preventDefault();
                  navigate("/login");
                }
                setIsAccountMenuOpen(false);
                setIsCartMenuOpen(false);
              }}
            >
              <i
                className="fa-solid fa-heart header-link-icon"
                aria-hidden="true"
              />
              <span className="header-badge">{favoriteItems.length}</span>
            </NavLink>

            <div
              className="mini-cart-shell"
              onMouseEnter={() => setIsCartMenuOpen(true)}
              onMouseLeave={() => setIsCartMenuOpen(false)}
            >
              <button
                type="button"
                className={`header-link header-link-badge ${isCartIconAnimated ? "badge-pulse" : ""}`}
                onClick={() =>
                  setIsCartMenuOpen((currentState) => !currentState)
                }
                aria-label={`Giỏ hàng, ${cartItemCount} sản phẩm`}
                aria-expanded={isCartMenuOpen}
              >
                <i
                  className="fa-solid fa-cart-shopping header-link-icon"
                  aria-hidden="true"
                />
                <span className="header-badge">{cartItemCount}</span>
              </button>

              <div
                className={`mini-cart-dropdown ${isCartMenuOpen ? "open" : ""}`}
              >
                <div className="mini-cart-header">
                  <strong>Giỏ hàng của bạn</strong>
                  <span>{cartItemCount} sản phẩm</span>
                </div>

                {cartItems.length > 0 ? (
                  <>
                    <div className="mini-cart-items">
                      {cartItems.slice(0, 4).map((item) => (
                        <article key={item.id} className="mini-cart-item">
                          <img src={item.image} alt={item.name} />
                          <div>
                            <p>{item.name}</p>
                            <span>
                              {item.quantity} x {formatCurrency(item.price)}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="icon-button subtle button-danger mini-cart-remove-button"
                            onClick={() => removeFromCart(item.id)}
                            aria-label={`Xóa ${item.name} khỏi giỏ hàng`}
                          >
                            <i className="fa-solid fa-trash-can" aria-hidden="true" />
                          </button>
                        </article>
                      ))}
                    </div>

                    <div className="mini-cart-footer">
                      <p>
                        <span>Tạm tính</span>
                        <strong>{formatCurrency(cartTotal)}</strong>
                      </p>
                      <div className="mini-cart-actions">
                        <NavLink
                          to="/cart"
                          className="button button-light"
                          onClick={() => setIsCartMenuOpen(false)}
                        >
                          Xem giỏ hàng
                        </NavLink>
                        <NavLink
                          to="/orders"
                          className="button"
                          onClick={() => setIsCartMenuOpen(false)}
                        >
                          Thanh toán
                        </NavLink>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mini-cart-empty">
                    <i className="fa-solid fa-cart-plus" aria-hidden="true" />
                    <p>
                      Giỏ hàng đang trống. Hãy thêm vài sản phẩm để bắt đầu.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {isAuthenticated ? (
              <div
                className="account-menu"
                onMouseEnter={() => setIsAccountMenuOpen(true)}
                onMouseLeave={() => setIsAccountMenuOpen(false)}
              >
                <button
                  type="button"
                  className="account-trigger"
                  aria-haspopup="menu"
                  aria-expanded={isAccountMenuOpen}
                  onClick={() =>
                    setIsAccountMenuOpen((currentState) => !currentState)
                  }
                >
                  <span className="account-avatar" aria-hidden="true">
                    {accountProfile.avatar ? (
                      <img src={accountProfile.avatar} alt={accountDisplayName} />
                    ) : (
                      accountInitial
                    )}
                  </span>
                  <span className="account-name">{accountDisplayName}</span>
                  <i
                    className="fa-solid fa-chevron-down account-chevron"
                    aria-hidden="true"
                  />
                </button>

                <div
                  className={`account-dropdown ${isAccountMenuOpen ? "open" : ""}`}
                  role="menu"
                >
                  {accountLinks.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className="account-dropdown-link"
                      role="menuitem"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <i
                        className={`fa-solid ${item.icon}`}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}

                  <button
                    type="button"
                    className="account-dropdown-link"
                    onClick={toggleTheme}
                    role="menuitem"
                  >
                    <i
                      className={`fa-solid ${isDarkMode ? "fa-sun" : "fa-moon"}`}
                      aria-hidden="true"
                    />
                    <span>
                      {isDarkMode ? "Giao diện sáng" : "Giao diện tối"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="account-dropdown-link"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <i
                      className="fa-solid fa-arrow-right-from-bracket"
                      aria-hidden="true"
                    />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="header-link"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    setIsCartMenuOpen(false);
                  }}
                >
                  Đăng nhập
                </NavLink>
                <NavLink
                  to="/register"
                  className="header-link"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    setIsCartMenuOpen(false);
                  }}
                >
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
              end={item.end}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={() => setIsCategoryMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}

          <div
            className="mega-menu-shell"
            onMouseEnter={() => setIsCategoryMenuOpen(true)}
            onMouseLeave={() => setIsCategoryMenuOpen(false)}
          >
            <button
              type="button"
              className={`nav-link nav-link-button ${isCategoryMenuOpen ? "active" : ""}`}
              onClick={() =>
                setIsCategoryMenuOpen((currentState) => !currentState)
              }
              aria-expanded={isCategoryMenuOpen}
            >
              Danh mục
              <i className="fa-solid fa-chevron-down" aria-hidden="true" />
            </button>

            <div
              className={`mega-menu-panel ${isCategoryMenuOpen ? "open" : ""}`}
            >
              <div className="mega-menu-copy">
                <p className="eyebrow">Mega menu</p>
                <h2>Khám phá danh mục nổi bật</h2>
                <p>
                  Từ laptop, điện thoại đến góc làm việc tại nhà, mọi nhóm sản
                  phẩm của Nexora đều được gom rõ ràng để tìm nhanh hơn.
                </p>
              </div>

              <div className="mega-menu-grid">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className="mega-menu-card"
                    onClick={() => handleCategoryNavigate(category)}
                  >
                    <span className="mega-menu-icon" aria-hidden="true">
                      <i className="fa-solid fa-layer-group" />
                    </span>
                    <strong>{category}</strong>
                    <span>Xem danh sách sản phẩm</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </header>

      <div
        className={`mobile-drawer-backdrop ${isMobileMenuOpen ? "open" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <aside
        className={`mobile-drawer ${isMobileMenuOpen ? "open" : ""}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="mobile-drawer-header">
          <img
            src={nexoraLogoPng}
            alt="Nexora"
            className="mobile-drawer-logo"
          />
          <button
            type="button"
            className="icon-button"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Đóng menu"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="mobile-drawer-body">
          <div className="mobile-drawer-group">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? "mobile-drawer-link active" : "mobile-drawer-link"
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="mobile-drawer-group">
            <p className="mobile-drawer-title">Danh mục</p>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className="mobile-drawer-link"
                onClick={() => handleCategoryNavigate(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mobile-drawer-group">
            <p className="mobile-drawer-title">Tài khoản</p>
            {isAuthenticated ? (
              accountLinks.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="mobile-drawer-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="mobile-drawer-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Đăng nhập
                </NavLink>
                <NavLink
                  to="/register"
                  className="mobile-drawer-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Đăng ký
                </NavLink>
              </>
            )}
            <button
              type="button"
              className="mobile-drawer-link"
              onClick={toggleTheme}
            >
              {isDarkMode ? "Giao diện sáng" : "Giao diện tối"}
            </button>
            {isAuthenticated ? (
              <button
                type="button"
                className="mobile-drawer-link"
                onClick={handleLogout}
              >
                Đăng xuất
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      <main
        className={
          isAdminRoute ? "main-content admin-page-content" : "main-content"
        }
      >
        <div
          key={`${location.pathname}${location.search}`}
          className="route-transition-panel"
        >
          <Outlet />
        </div>
      </main>

      {!isAdminRoute ? <CompareTray /> : null}

      <footer className="site-footer">
        <div className="site-footer-inner">
          <section className="footer-service-bar">
            <article className="footer-service-item">
              <i
                className="fa-solid fa-truck-fast footer-service-icon"
                aria-hidden="true"
              />
              <h3>Giao Hàng Toàn Quốc</h3>
              <p>Giao nhanh, theo dõi trạng thái đơn hàng rõ ràng từng bước.</p>
            </article>

            <article className="footer-service-item">
              <i
                className="fa-solid fa-rotate-left footer-service-icon"
                aria-hidden="true"
              />
              <h3>Đổi Trả Dễ Dàng</h3>
              <p>Trải nghiệm đổi trả đơn giản với các hướng dẫn dễ hiểu.</p>
            </article>

            <article className="footer-service-item">
              <i
                className="fa-regular fa-credit-card footer-service-icon"
                aria-hidden="true"
              />
              <h3>Thanh Toán Tiện Lợi</h3>
              <p>COD, chuyển khoản và các kịch bản demo checkout mượt mà.</p>
            </article>

            <article className="footer-service-item">
              <i
                className="fa-solid fa-headset footer-service-icon"
                aria-hidden="true"
              />
              <h3>Hỗ Trợ Nhiệt Tình</h3>
              <p>
                Tư vấn sản phẩm và hỗ trợ đơn hàng theo phong cách storefront
                thật.
              </p>
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
              Không gian mua sắm công nghệ gọn, nhanh và giàu micro-interaction.
            </h2>
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
            <div className="footer-location-list footer-contact-block">
              <div className="footer-address">
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                <p>52B ngõ 4 Hoàng Quốc Việt, Nghĩa Đô, Hà Nội</p>
              </div>
              <div className="footer-address">
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                <p>55 Nghiêm Quý Ngãi, Hàm Rồng, tỉnh Thanh Hóa</p>
              </div>
            </div>
          </section>

          <section className="footer-card footer-panel">
            <p className="footer-card-title">Chính sách</p>
            <div className="footer-policy-list">
              <Link to="/privacy-policy" className="footer-policy-link">
                Chính Sách Bảo Mật
              </Link>
              <Link to="/warranty-policy" className="footer-policy-link">
                Quy Định Bảo Hành
              </Link>
              <Link to="/return-policy" className="footer-policy-link">
                Chính Sách Đổi Trả
              </Link>
              <Link to="/terms-of-use" className="footer-policy-link">
                Điều khoản sử dụng
              </Link>
              <Link to="/shipping-inspection-policy" className="footer-policy-link">
                Chính sách vận chuyển & kiểm hàng
              </Link>
            </div>
          </section>
        </div>

        <div className="site-footer-copyright">
          <p>Copyright © Nexora 2026. All rights reserved.</p>
        </div>
      </footer>

      {!isAdminRoute ? (
        <nav
          className="mobile-bottom-nav"
          aria-label="Điều hướng nhanh trên mobile"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? "mobile-bottom-link active" : "mobile-bottom-link"
            }
          >
            <i className="fa-solid fa-house" aria-hidden="true" />
            <span>Home</span>
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) =>
              isActive ? "mobile-bottom-link active" : "mobile-bottom-link"
            }
          >
            <i className="fa-solid fa-shop" aria-hidden="true" />
            <span>Products</span>
          </NavLink>
          <NavLink
            to="/cart"
            className={({ isActive }) =>
              isActive ? "mobile-bottom-link active" : "mobile-bottom-link"
            }
          >
            <i className="fa-solid fa-cart-shopping" aria-hidden="true" />
            <span>Cart</span>
            {cartItemCount > 0 ? (
              <span className="mobile-bottom-badge">{cartItemCount}</span>
            ) : null}
          </NavLink>
          <NavLink
            to={bottomNavigationAccountPath}
            className={({ isActive }) =>
              isActive ? "mobile-bottom-link active" : "mobile-bottom-link"
            }
          >
            <i className="fa-solid fa-user" aria-hidden="true" />
            <span>{bottomNavigationAccountLabel}</span>
          </NavLink>
        </nav>
      ) : null}

      {!isAdminRoute ? <BackToTopButton /> : null}
      {!isAdminRoute ? <AIConsultantWidget /> : null}
    </div>
  );
}

export default MainLayout;
