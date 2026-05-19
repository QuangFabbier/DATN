import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ProductCard from '../components/ProductCard'
import { HeroSkeleton, ProductGridSkeleton } from '../components/Skeleton'
import heroOverlay1 from '../assets/hero-overlay-1.png'
import heroOverlay2 from '../assets/hero-overlay-2.png'
import heroOverlay3 from '../assets/hero-overlay-3.png'
import heroOverlay4 from '../assets/hero-overlay-4.png'
import heroOverlay5 from '../assets/hero-overlay-5.png'
import heroOverlay6 from '../assets/hero-overlay-6.png'
import { useSearch } from '../hooks/useSearch'
import { getProducts } from '../services/productService'
import { withMinimumDelay } from '../utils/timing'

const heroSlides = [
  {
    id: 'nexora-premium',
    image: heroOverlay1,
  },
  {
    id: 'smart-discovery',
    image: heroOverlay2,
  },
  {
    id: 'ai-ready',
    image: heroOverlay3,
  },
  {
    id: 'checkout-flow',
    image: heroOverlay4,
  },
  {
    id: 'admin-scale',
    image: heroOverlay5,
  },
  {
    id: 'student-deal',
    image: heroOverlay6,
  },
]

function getFeaturedProducts(products, limit = 8) {
  return [...products]
    .sort((firstProduct, secondProduct) => secondProduct.price - firstProduct.price)
    .slice(0, limit)
}

function Home() {
  const { searchKeyword } = useSearch()
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
    }, 5000)

    return () => {
      window.clearInterval(slideInterval)
    }
  }, [])

  const keyword = searchKeyword.trim().toLowerCase()
  const filteredProducts = keyword
    ? featuredProducts.filter((product) => product.name.toLowerCase().includes(keyword))
    : featuredProducts

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
                  className={`hero-slide ${index === activeHeroSlideIndex ? 'active' : ''}`}
                  aria-hidden={index !== activeHeroSlideIndex}
                  style={{ backgroundImage: `url(${slide.image})` }}
                />
              ))}

              <div className="hero-slider-dots hero-slider-dots-floating" aria-label="Slide indicators">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={`hero-slider-dot ${index === activeHeroSlideIndex ? 'active' : ''}`}
                    onClick={() => setActiveHeroSlideIndex(index)}
                    aria-label={`Chuyển tới ảnh ${index + 1}`}
                  />
                ))}
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
