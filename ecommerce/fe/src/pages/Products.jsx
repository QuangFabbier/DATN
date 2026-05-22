import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ProductCard from '../components/ProductCard'
import { ProductGridSkeleton } from '../components/Skeleton'
import { useSearch } from '../hooks/useSearch'
import { getProducts } from '../services/productService'
import { getOrCreateFlashSaleCampaign } from '../utils/flashSale'
import { getProductId } from '../utils/product'
import { withMinimumDelay } from '../utils/timing'

const PRODUCTS_PAGE_SIZE = 8
const ALL_CATEGORIES_LABEL = 'Tất cả'
const SORT_OPTIONS = [
  { value: 'featured', label: 'Nổi bật' },
  { value: 'priceAsc', label: 'Giá tăng dần' },
  { value: 'priceDesc', label: 'Giá giảm dần' },
  { value: 'nameAsc', label: 'Tên A-Z' },
]

function Products() {
  const [products, setProducts] = useState([])
  const [flashSaleCampaign, setFlashSaleCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('featured')
  const [currentPage, setCurrentPage] = useState(1)
  const [openDropdown, setOpenDropdown] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryDropdownRef = useRef(null)
  const sortDropdownRef = useRef(null)
  const { searchKeyword, setSearchKeyword } = useSearch()
  const rawSelectedCategory = String(searchParams.get('category') || '').trim()
  const aiIdsParam = String(searchParams.get('aiIds') || '').trim()
  const aiQuery = String(searchParams.get('aiQuery') || '').trim()
  const isAiResultMode = aiIdsParam.length > 0
  const aiIdList = useMemo(
    () =>
      aiIdsParam
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    [aiIdsParam],
  )

  useEffect(() => {
    setSearchKeyword(searchParams.get('search') || '')
  }, [searchParams, setSearchKeyword])

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError('')
        const data = await withMinimumDelay(getProducts(), 240)
        setProducts(data)
        setFlashSaleCampaign(getOrCreateFlashSaleCampaign(data))
      } catch {
        setError('Không thể tải danh sách sản phẩm.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

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
    }, 5000)

    return () => {
      window.clearInterval(syncInterval)
    }
  }, [products])

  const categories = useMemo(() => {
    const normalizedCategories = products
      .map((product) => String(product?.category || '').trim())
      .filter(Boolean)

    return [ALL_CATEGORIES_LABEL, ...new Set(normalizedCategories)]
  }, [products])

  const selectedCategory = categories.includes(rawSelectedCategory)
    ? rawSelectedCategory
    : ALL_CATEGORIES_LABEL

  const keyword = searchKeyword.trim().toLowerCase()
  const pageTitle = isAiResultMode
    ? 'Kết quả từ AI'
    : selectedCategory === ALL_CATEGORIES_LABEL
      ? 'Sản phẩm'
      : selectedCategory

  const filteredProducts = useMemo(() => {
    if (isAiResultMode) {
      const aiOrderMap = new Map(aiIdList.map((id, index) => [id, index]))
      const aiProducts = products
        .filter((product) => aiOrderMap.has(getProductId(product)))
        .sort((firstProduct, secondProduct) => {
          const firstProductOrder = aiOrderMap.get(getProductId(firstProduct)) ?? Number.MAX_SAFE_INTEGER
          const secondProductOrder = aiOrderMap.get(getProductId(secondProduct)) ?? Number.MAX_SAFE_INTEGER
          return firstProductOrder - secondProductOrder
        })

      return aiProducts
    }

    const nextProducts = products
      .filter((product) => (keyword ? product.name.toLowerCase().includes(keyword) : true))
      .filter((product) => (selectedCategory === ALL_CATEGORIES_LABEL ? true : product.category === selectedCategory))

    return [...nextProducts].sort((firstProduct, secondProduct) => {
      if (sortBy === 'priceAsc') {
        return firstProduct.price - secondProduct.price
      }

      if (sortBy === 'priceDesc') {
        return secondProduct.price - firstProduct.price
      }

      if (sortBy === 'nameAsc') {
        return firstProduct.name.localeCompare(secondProduct.name)
      }

      return secondProduct.price - firstProduct.price
    })
  }, [aiIdList, isAiResultMode, keyword, products, selectedCategory, sortBy])

  const suggestedProducts = useMemo(
    () =>
      products
        .filter(
          (product) =>
            !filteredProducts.some(
              (filteredProduct) => getProductId(filteredProduct) === getProductId(product),
            ),
        )
        .slice(0, 4),
    [filteredProducts, products],
  )

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PAGE_SIZE)),
    [filteredProducts.length],
  )

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PAGE_SIZE
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PAGE_SIZE)
  }, [currentPage, filteredProducts])

  const paginationItems = useMemo(() => {
    if (totalPages <= 1) {
      return []
    }

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => ({
        type: 'page',
        value: index + 1,
      }))
    }

    const items = [{ type: 'page', value: 1 }]
    const startPage = Math.max(2, currentPage - 1)
    const endPage = Math.min(totalPages - 1, currentPage + 1)

    if (startPage > 2) {
      items.push({ type: 'ellipsis', value: `ellipsis-left-${currentPage}` })
    }

    for (let page = startPage; page <= endPage; page += 1) {
      items.push({ type: 'page', value: page })
    }

    if (endPage < totalPages - 1) {
      items.push({ type: 'ellipsis', value: `ellipsis-right-${currentPage}` })
    }

    items.push({ type: 'page', value: totalPages })

    return items
  }, [currentPage, totalPages])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchKeyword, selectedCategory, sortBy, aiIdsParam, aiQuery])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  useEffect(() => {
    if (loading) {
      return
    }

    if (!rawSelectedCategory || categories.includes(rawSelectedCategory)) {
      return
    }

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('category')
    setSearchParams(nextParams, { replace: true })
  }, [categories, loading, rawSelectedCategory, searchParams, setSearchParams])

  useEffect(() => {
    function handlePointerDown(event) {
      if (!openDropdown) {
        return
      }

      const categoryWrapper = categoryDropdownRef.current
      const sortWrapper = sortDropdownRef.current
      const eventTarget = event.target
      const isInsideCategory = categoryWrapper?.contains(eventTarget)
      const isInsideSort = sortWrapper?.contains(eventTarget)

      if (!isInsideCategory && !isInsideSort) {
        setOpenDropdown('')
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpenDropdown('')
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openDropdown])

  function updateParams(nextCategory, nextSearch) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('aiIds')
    nextParams.delete('aiQuery')
    nextParams.delete('fromAI')

    if (nextCategory && nextCategory !== ALL_CATEGORIES_LABEL) {
      nextParams.set('category', nextCategory)
    } else {
      nextParams.delete('category')
    }

    if (nextSearch.trim()) {
      nextParams.set('search', nextSearch.trim())
    } else {
      nextParams.delete('search')
    }

    setSearchParams(nextParams)
  }

  function getSortLabel(value) {
    return SORT_OPTIONS.find((option) => option.value === value)?.label || SORT_OPTIONS[0].label
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Danh sách sản phẩm</p>
          <h1>{pageTitle}</h1>
          {isAiResultMode ? (
            <p className="section-heading-description">
              {aiQuery ? `Từ tư vấn AI: "${aiQuery}"` : 'Các sản phẩm được AI đề xuất từ kho hiện có.'}
            </p>
          ) : null}
        </div>
        <span className="section-heading-meta">{filteredProducts.length} sản phẩm</span>
      </div>

      <div className="toolbar products-toolbar sticky-filter-bar">
        <label className="filter-field">
          <span>Tìm kiếm</span>
          <input
            type="search"
            value={searchKeyword}
            onChange={(event) => {
              setSearchKeyword(event.target.value)
              updateParams(selectedCategory, event.target.value)
            }}
            placeholder="Tìm theo tên sản phẩm"
          />
        </label>

        <label className="filter-field">
          <span>Danh mục</span>
          <div className="filter-dropdown" ref={categoryDropdownRef}>
            <button
              type="button"
              className="filter-dropdown-trigger"
              onClick={() => setOpenDropdown((current) => (current === 'category' ? '' : 'category'))}
              aria-expanded={openDropdown === 'category'}
              aria-label="Lọc theo danh mục"
            >
              <span>{selectedCategory}</span>
              <i className="fa-solid fa-chevron-down" aria-hidden="true" />
            </button>

            {openDropdown === 'category' ? (
              <div className="filter-dropdown-menu" role="listbox" aria-label="Danh mục sản phẩm">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`filter-dropdown-option ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => {
                      updateParams(category, searchKeyword)
                      setOpenDropdown('')
                    }}
                    role="option"
                    aria-selected={selectedCategory === category}
                  >
                    {category}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </label>

        <label className="filter-field">
          <span>Sắp xếp</span>
          <div className="filter-dropdown" ref={sortDropdownRef}>
            <button
              type="button"
              className="filter-dropdown-trigger"
              onClick={() => setOpenDropdown((current) => (current === 'sort' ? '' : 'sort'))}
              aria-expanded={openDropdown === 'sort'}
              aria-label="Sắp xếp sản phẩm"
            >
              <span>{getSortLabel(sortBy)}</span>
              <i className="fa-solid fa-chevron-down" aria-hidden="true" />
            </button>

            {openDropdown === 'sort' ? (
              <div className="filter-dropdown-menu" role="listbox" aria-label="Sắp xếp sản phẩm">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`filter-dropdown-option ${sortBy === option.value ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy(option.value)
                      setOpenDropdown('')
                    }}
                    role="option"
                    aria-selected={sortBy === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </label>
      </div>

      {loading ? <ProductGridSkeleton count={8} /> : null}

      {error ? (
        <EmptyState
          title="Không thể tải danh sách sản phẩm"
          description={error}
          icon="fa-circle-exclamation"
          tone="warning"
          action={
            <Link to="/" className="button">
              Quay lại trang chủ
            </Link>
          }
        />
      ) : null}

      {!loading && !error && filteredProducts.length > 0 ? (
        <>
          <div className="product-grid">
            {paginatedProducts.map((product) => (
              <ProductCard
                key={product._id || product.id}
                product={product}
                flashSaleCampaign={flashSaleCampaign}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <nav className="home-pagination" aria-label="Phân trang danh sách sản phẩm">
              <button
                type="button"
                className="home-pagination-button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                aria-label="Trang trước"
              >
                <i className="fa-solid fa-angle-left" aria-hidden="true" />
              </button>

              {paginationItems.map((item) =>
                item.type === 'ellipsis' ? (
                  <span key={item.value} className="home-pagination-ellipsis" aria-hidden="true">
                    ...
                  </span>
                ) : (
                  <button
                    key={item.value}
                    type="button"
                    className={`home-pagination-button ${currentPage === item.value ? 'active' : ''}`}
                    onClick={() => setCurrentPage(item.value)}
                    aria-current={currentPage === item.value ? 'page' : undefined}
                    aria-label={`Trang ${item.value}`}
                  >
                    {item.value}
                  </button>
                ),
              )}

              <button
                type="button"
                className="home-pagination-button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                aria-label="Trang sau"
              >
                <i className="fa-solid fa-angle-right" aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </>
      ) : null}

      {!loading && !error && filteredProducts.length === 0 ? (
        <>
          <EmptyState
            title="Không tìm thấy sản phẩm phù hợp"
            description="Hãy thử từ khóa khác, quay lại danh mục tổng hoặc xem các gợi ý bên dưới."
            icon="fa-magnifying-glass"
            action={
              <button
                type="button"
                className="button button-danger"
                onClick={() => {
                  setSearchKeyword('')
                  setSearchParams(new URLSearchParams())
                }}
              >
                Xóa bộ lọc
              </button>
            }
          />

          {suggestedProducts.length > 0 ? (
            <div className="suggested-products-section">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">Gợi ý thêm</p>
                  <h2>Sản phẩm bạn có thể quan tâm</h2>
                </div>
              </div>

              <div className="product-grid">
                {suggestedProducts.map((product) => (
                  <ProductCard
                    key={getProductId(product)}
                    product={product}
                    flashSaleCampaign={flashSaleCampaign}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

export default Products
