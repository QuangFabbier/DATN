import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
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
import { formatCurrency } from '../utils/formatCurrency'
import { getProductId } from '../utils/product'
import {
  formatCountdownUnit,
  getFlashSaleCountdown,
  getOrCreateFlashSaleCampaign,
} from '../utils/flashSale'
import { withMinimumDelay } from '../utils/timing'

const heroSlides = [
  { id: 'nexora-premium', image: heroOverlay1 },
  { id: 'smart-discovery', image: heroOverlay2 },
  { id: 'ai-ready', image: heroOverlay3 },
  { id: 'checkout-flow', image: heroOverlay4 },
  { id: 'admin-scale', image: heroOverlay5 },
  { id: 'student-deal', image: heroOverlay6 },
]

const HOME_FLASH_SALE_LIMIT = 3
const HOME_PRODUCT_LIMIT = 4

function Home() {
  const { searchKeyword } = useSearch()
  const [products, setProducts] = useState([])
  const [flashSaleCampaign, setFlashSaleCampaign] = useState(null)
  const [countdownNow, setCountdownNow] = useState(Date.now())
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
        setProducts(data)
        setFlashSaleCampaign(getOrCreateFlashSaleCampaign(data))
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

  useEffect(() => {
    if (!flashSaleCampaign?.expiresAt) {
      return undefined
    }

    const countdownInterval = window.setInterval(() => {
      setCountdownNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(countdownInterval)
    }
  }, [flashSaleCampaign?.expiresAt])

  useEffect(() => {
    if (products.length === 0) {
      return undefined
    }

    const syncInterval = window.setInterval(() => {
      setFlashSaleCampaign((currentCampaign) => {
        if (currentCampaign && currentCampaign.expiresAt > Date.now()) {
          return currentCampaign
        }

        return getOrCreateFlashSaleCampaign(products)
      })
    }, 1000)

    return () => {
      window.clearInterval(syncInterval)
    }
  }, [products])

  const flashSaleCountdown = useMemo(
    () => getFlashSaleCountdown(flashSaleCampaign?.expiresAt, countdownNow),
    [countdownNow, flashSaleCampaign?.expiresAt],
  )

  const keyword = searchKeyword.trim().toLowerCase()

  const filteredProducts = useMemo(
    () => (keyword ? products.filter((product) => product.name.toLowerCase().includes(keyword)) : products),
    [keyword, products],
  )

  const flashSaleIdSet = useMemo(
    () => new Set((flashSaleCampaign?.featuredProductIds || []).map((productId) => String(productId))),
    [flashSaleCampaign?.featuredProductIds],
  )

  const flashSaleProducts = useMemo(
    () => {
      if (!flashSaleCampaign?.featuredProductIds?.length) {
        return []
      }

      const productById = new Map(filteredProducts.map((product) => [getProductId(product), product]))

      return flashSaleCampaign.featuredProductIds
        .map((productId) => productById.get(String(productId)))
        .filter(Boolean)
        .slice(0, HOME_FLASH_SALE_LIMIT)
    },
    [filteredProducts, flashSaleCampaign?.featuredProductIds],
  )

  const regularProducts = useMemo(
    () =>
      filteredProducts
        .filter((product) => !flashSaleIdSet.has(getProductId(product)))
        .slice(0, HOME_PRODUCT_LIMIT),
    [filteredProducts, flashSaleIdSet],
  )

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

          {flashSaleCampaign && flashSaleProducts.length > 0 ? (
            <section className="home-flash-sale-section" aria-label="Khu vực flash sale">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Flash Sale Đang Diễn Ra</p>
                  <h2>Giảm giá trong thời gian ngắn</h2>
                </div>
              </div>

              <div className="flash-sale-banner" aria-label="Flash sale countdown">
                <div className="flash-sale-copy">
                  <strong>Cơ hội cuối cùng để mua sản phẩm với giá hời.</strong>
                </div>

                <div className="flash-sale-countdown">
                  <div className="flash-sale-unit">
                    <span>{formatCountdownUnit(flashSaleCountdown.hours)}</span>
                    <small>Giờ</small>
                  </div>
                  <span className="flash-sale-separator">:</span>
                  <div className="flash-sale-unit">
                    <span>{formatCountdownUnit(flashSaleCountdown.minutes)}</span>
                    <small>Phút</small>
                  </div>
                  <span className="flash-sale-separator">:</span>
                  <div className="flash-sale-unit">
                    <span>{formatCountdownUnit(flashSaleCountdown.seconds)}</span>
                    <small>Giây</small>
                  </div>
                </div>
              </div>

              <div className="product-grid product-grid-flash-sale">
                {flashSaleProducts.map((product) => (
                  <ProductCard
                    key={product._id || product.id}
                    product={product}
                    flashSaleCampaign={flashSaleCampaign}
                  />
                ))}
              </div>
            </section>
          ) : null}

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

          {!error && regularProducts.length > 0 ? (
            <section className="home-product-section">
              <div className="section-heading home-product-heading">
                <h2>Sản phẩm mới</h2>
                <Link to="/products" className="section-action-link">
                  Xem tất cả
                  <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </Link>
              </div>

              <div className="product-grid home-product-grid">
                {regularProducts.map((product) => (
                  <Link
                    key={product._id || product.id}
                    to={`/products/${getProductId(product)}`}
                    className="home-product-tile"
                    aria-label={`Xem chi tiết ${product.name}`}
                  >
                    <div className="home-product-tile-media">
                      <img src={product.image} alt={product.name} className="home-product-tile-image" />
                    </div>
                    <div className="home-product-tile-copy">
                      <h3>{product.name}</h3>
                      <p>{formatCurrency(product.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {!error && flashSaleProducts.length === 0 && regularProducts.length === 0 ? (
            <EmptyState
              title="Không có sản phẩm phù hợp"
              description="Từ khóa hiện tại chưa khớp với sản phẩm nào. Bạn có thể mở toàn bộ danh mục để tìm thêm lựa chọn."
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
