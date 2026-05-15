import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AI_WIDGET_OPEN_EVENT } from '../components/AIConsultantWidget'
import EmptyState from '../components/EmptyState'
import ProductCard from '../components/ProductCard'
import { HeroSkeleton, ProductGridSkeleton } from '../components/Skeleton'
import { useSearch } from '../hooks/useSearch'
import { getProducts } from '../services/productService'
import { withMinimumDelay } from '../utils/timing'

const heroSlides = [
  {
    id: 'nexora-premium',
    eyebrow: 'Premium Demo Storefront',
    title: 'Mua sắm công nghệ theo trải nghiệm mượt như app production.',
    description:
      'Hero, quick view, compare, mini cart, dark mode và toàn bộ feedback được tối ưu cho cảm giác ecommerce hiện đại.',
    toneClassName: 'hero-slide-black',
  },
  {
    id: 'smart-discovery',
    eyebrow: 'Khám phá nhanh hơn',
    title: 'Từ search, filter đến checkout đều được làm rõ từng bước.',
    description:
      'Danh mục rõ ràng, breadcrumb, sticky filter và gợi ý sản phẩm giúp người dùng không bị lạc trong flow mua sắm.',
    toneClassName: 'hero-slide-red',
  },
  {
    id: 'ai-ready',
    eyebrow: 'Frontend Demo Ready',
    title: 'Nền tảng đủ sạch để mở rộng AI tư vấn và backend thật sau này.',
    description:
      'Kiến trúc vẫn giữ Context API và localStorage source, nhưng UX đã được nâng lên mức DATN senior level.',
    toneClassName: 'hero-slide-purple',
  },
]

function getFeaturedProducts(products, limit = 8) {
  return [...products]
    .sort((firstProduct, secondProduct) => secondProduct.price - firstProduct.price)
    .slice(0, limit)
}

function Home() {
  const { searchKeyword } = useSearch()
  const [allProducts, setAllProducts] = useState([])
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [activeHeroSlideIndex, setActiveHeroSlideIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const touchStartXRef = useRef(0)

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError('')
        const data = await withMinimumDelay(getProducts(), 260)
        setAllProducts(data)
        setFeaturedProducts(getFeaturedProducts(data))
      } catch {
        setError('Không thể tải sản phẩm nổi bật.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const advanceSlide = useEffectEvent(() => {
    setActiveHeroSlideIndex((currentIndex) => (currentIndex + 1) % heroSlides.length)
  })

  useEffect(() => {
    const slideInterval = window.setInterval(() => {
      advanceSlide()
    }, 4200)

    return () => {
      window.clearInterval(slideInterval)
    }
  }, [])

  const keyword = searchKeyword.trim().toLowerCase()
  const filteredProducts = keyword
    ? featuredProducts.filter((product) => product.name.toLowerCase().includes(keyword))
    : featuredProducts

  const categories = useMemo(
    () => [...new Set(allProducts.map((product) => product.category).filter(Boolean))].slice(0, 5),
    [allProducts],
  )

  function handleOpenAIWidget() {
    window.dispatchEvent(new Event(AI_WIDGET_OPEN_EVENT))
  }

  function handleTouchStart(event) {
    touchStartXRef.current = event.changedTouches[0]?.clientX || 0
  }

  function handleTouchEnd(event) {
    const deltaX = touchStartXRef.current - (event.changedTouches[0]?.clientX || 0)

    if (Math.abs(deltaX) < 42) {
      return
    }

    if (deltaX > 0) {
      setActiveHeroSlideIndex((currentIndex) => (currentIndex + 1) % heroSlides.length)
      return
    }

    setActiveHeroSlideIndex((currentIndex) => (currentIndex - 1 + heroSlides.length) % heroSlides.length)
  }

  return (
    <section className="page-section">
      {loading ? (
        <>
          <HeroSkeleton />
          <ProductGridSkeleton count={8} />
        </>
      ) : (
        <>
          <div
            className="hero-section"
            aria-label="Hero slider"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="hero-slider-stage">
              {heroSlides.map((slide, index) => (
                <article
                  key={slide.id}
                  className={`hero-slide ${slide.toneClassName} ${index === activeHeroSlideIndex ? 'active' : ''}`}
                  aria-hidden={index !== activeHeroSlideIndex}
                >
                  <div className="hero-slide-glow" />
                </article>
              ))}

              <div className="hero-overlay">
                <div className="hero-content">
                  <p className="eyebrow hero-eyebrow">{heroSlides[activeHeroSlideIndex].eyebrow}</p>
                  <h1>{heroSlides[activeHeroSlideIndex].title}</h1>
                  <p className="hero-text">{heroSlides[activeHeroSlideIndex].description}</p>

                  <div className="hero-actions">
                    <Link to="/products" className="button button-pressable">
                      Xem sản phẩm
                    </Link>
                    <button
                      type="button"
                      className="button button-outline hero-outline-button button-pressable"
                      onClick={handleOpenAIWidget}
                    >
                      Tư vấn AI
                    </button>
                  </div>

                  <div className="hero-highlight-list">
                    <span>Quick View</span>
                    <span>Mini Cart</span>
                    <span>Compare</span>
                    <span>Dark Mode</span>
                  </div>
                </div>

                <div className="hero-slider-footer">
                  <div className="hero-slider-dots" aria-label="Slide indicators">
                    {heroSlides.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        className={`hero-slider-dot ${index === activeHeroSlideIndex ? 'active' : ''}`}
                        onClick={() => setActiveHeroSlideIndex(index)}
                        aria-label={`Chuyển tới slide ${index + 1}`}
                      />
                    ))}
                  </div>

                  <div className="hero-slide-meta">
                    <span>Danh mục nổi bật</span>
                    <strong>{categories.join(' · ')}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="section-heading">
            <div>
              <p className="eyebrow">Curated selection</p>
              <h2>Sản phẩm nổi bật</h2>
            </div>
          </div>

          {error ? (
            <EmptyState
              title="Chưa thể tải sản phẩm nổi bật"
              description={error}
              icon="fa-circle-exclamation"
              action={
                <Link to="/products" className="button">
                  Đi tới danh sách sản phẩm
                </Link>
              }
              tone="warning"
            />
          ) : null}

          {!error && filteredProducts.length > 0 ? (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <ProductCard key={product._id || product.id} product={product} />
              ))}
            </div>
          ) : null}

          {!error && filteredProducts.length === 0 ? (
            <EmptyState
              title="Không có sản phẩm phù hợp"
              description="Keyword hiện tại chưa khớp với nhóm sản phẩm nổi bật. Bạn có thể mở toàn bộ danh mục để tìm thêm lựa chọn."
              icon="fa-magnifying-glass"
              action={
                <Link to="/products" className="button">
                  Xem toàn bộ sản phẩm
                </Link>
              }
            />
          ) : null}
        </>
      )}
    </section>
  )
}

export default Home
