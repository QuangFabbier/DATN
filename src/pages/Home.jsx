import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AI_WIDGET_OPEN_EVENT } from "../components/AIConsultantWidget";
import ProductCard from "../components/ProductCard";
import { useSearch } from "../hooks/useSearch";
import { getProducts } from "../services/productService";

const heroSlides = [
  {
    id: "shadow-black",
    label: "Shadow Black",
    note: "Placeholder slide",
    toneClassName: "hero-slide-black",
  },
  {
    id: "pulse-red",
    label: "Pulse Red",
    note: "Placeholder slide",
    toneClassName: "hero-slide-red",
  },
  {
    id: "neon-purple",
    label: "Neon Purple",
    note: "Placeholder slide",
    toneClassName: "hero-slide-purple",
  },
];

function getRandomFeaturedProducts(products, limit = 12) {
  const shuffledProducts = [...products];

  for (let index = shuffledProducts.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentProduct = shuffledProducts[index];

    shuffledProducts[index] = shuffledProducts[randomIndex];
    shuffledProducts[randomIndex] = currentProduct;
  }

  return shuffledProducts.slice(0, limit);
}

function Home() {
  const { searchKeyword } = useSearch();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [activeHeroSlideIndex, setActiveHeroSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError("");
        const data = await getProducts();
        setFeaturedProducts(getRandomFeaturedProducts(data));
      } catch {
        setError("Không thể tải sản phẩm nổi bật.");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  useEffect(() => {
    const slideInterval = window.setInterval(() => {
      setActiveHeroSlideIndex(
        (currentIndex) => (currentIndex + 1) % heroSlides.length,
      );
    }, 3000);

    return () => {
      window.clearInterval(slideInterval);
    };
  }, []);

  const keyword = searchKeyword.trim().toLowerCase();

  // Header search lọc nhóm sản phẩm nổi bật ngay trên trang Home.
  const filteredProducts = keyword
    ? featuredProducts.filter((product) =>
        product.name.toLowerCase().includes(keyword),
      )
    : featuredProducts;

  function handleOpenAIWidget() {
    window.dispatchEvent(new Event(AI_WIDGET_OPEN_EVENT));
  }

  return (
    <section className="page-section">
      <div className="hero-section" aria-label="Hero slider">
        <div className="hero-slider-stage">
          {heroSlides.map((slide, index) => (
            <article
              key={slide.id}
              className={`hero-slide ${slide.toneClassName} ${
                index === activeHeroSlideIndex ? "active" : ""
              }`}
              aria-hidden={index !== activeHeroSlideIndex}
            >
              <div className="hero-slide-glow" />
            </article>
          ))}

          <div className="hero-overlay">
            <div className="hero-content">
              <p className="eyebrow hero-eyebrow">Đồ án tốt nghiệp</p>
              <h1>Website thương mại điện tử bằng ReactJS</h1>
              <p className="hero-text">
                Cấu trúc project gọn gàng, dữ liệu sản phẩm dùng JSON và sẵn
                sàng mở rộng thêm tư vấn sản phẩm bằng AI.
              </p>
              <div className="hero-actions">
                <Link to="/products" className="button">
                  Xem sản phẩm
                </Link>
                <button
                  type="button"
                  className="button button-outline hero-outline-button"
                  onClick={handleOpenAIWidget}
                >
                  Tư vấn AI
                </button>
              </div>
            </div>

            <div className="hero-slider-footer">
              <div className="hero-slider-dots" aria-label="Slide indicators">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={`hero-slider-dot ${index === activeHeroSlideIndex ? "active" : ""}`}
                    onClick={() => setActiveHeroSlideIndex(index)}
                    aria-label={`Chuyển tới slide ${slide.label}`}
                  />
                ))}
              </div>
              <div className="hero-slide-meta">
                <span>{heroSlides[activeHeroSlideIndex].note}</span>
                <strong>{heroSlides[activeHeroSlideIndex].label}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-heading">
        <h2>Sản phẩm nổi bật</h2>
        <Link to="/products" className="section-action-link">
          Xem tất cả
        </Link>
      </div>

      {loading && <div className="empty-state">Đang tải sản phẩm...</div>}
      {error && <div className="empty-state">{error}</div>}

      {!loading && !error && filteredProducts.length > 0 ? (
        <div className="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      ) : null}

      {!loading && !error && filteredProducts.length === 0 && (
        <div className="empty-state">Không tìm thấy sản phẩm phù hợp</div>
      )}
    </section>
  );
}

export default Home;
