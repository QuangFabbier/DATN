import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import EmptyState from '../components/EmptyState'
import ProductGallery from '../components/ProductGallery'
import { DetailSkeleton } from '../components/Skeleton'
import { ButtonSpinner } from '../components/Spinner'
import StarRating from '../components/StarRating'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useCompare } from '../hooks/useCompare'
import { useFavorites } from '../hooks/useFavorites'
import { useToast } from '../hooks/useToast'
import { explainProductWithAi } from '../services/aiService'
import {
  createProductReview,
  deleteProductReview,
  getProductReviews,
  updateProductReview,
} from '../services/reviewService'
import { getProductById } from '../services/productService'
import { getActiveFlashSaleCampaign } from '../utils/flashSale'
import { formatCurrency } from '../utils/formatCurrency'
import {
  buildProductPricing,
  getProductCategoryLabel,
  getProductId,
  getProductImages,
  getProductStock,
  getProductSpecifications,
  normalizeProduct,
} from '../utils/product'
import { wait, withMinimumDelay } from '../utils/timing'

const DEFAULT_AI_QUESTION = 'Sản phẩm này có đáng mua không? Phù hợp với ai?'
const INITIAL_REVIEW_FORM = {
  rating: 0,
  title: '',
  comment: '',
}

function formatReviewDate(value) {
  if (!value) {
    return ''
  }

  try {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

function buildReviewSummaryPayload(rawSummary = {}) {
  return {
    text: String(rawSummary?.text || ''),
    highlights: Array.isArray(rawSummary?.highlights) ? rawSummary.highlights : [],
    sourceReviewCount: Number(rawSummary?.sourceReviewCount || 0),
  }
}

function buildReviewProductPatch(source = {}) {
  return {
    averageRating: Number(source?.averageRating || 0),
    totalReviews: Number(source?.totalReviews || 0),
    ratingBreakdown:
      source?.ratingBreakdown && typeof source.ratingBreakdown === 'object'
        ? source.ratingBreakdown
        : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    reviewSummary: source?.reviewSummary ? source.reviewSummary : undefined,
  }
}

function buildRatingBreakdown(product = {}) {
  const breakdown =
    product?.ratingBreakdown && typeof product.ratingBreakdown === 'object'
      ? product.ratingBreakdown
      : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  return [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: Number(breakdown?.[star] || breakdown?.[String(star)] || 0),
  }))
}

function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, isAuthenticated } = useAuth()
  const { addToCart } = useCart()
  const { isCompared, toggleCompare } = useCompare()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { showToast } = useToast()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const [isBuyingNow, setIsBuyingNow] = useState(false)
  const [aiQuestion, setAiQuestion] = useState(DEFAULT_AI_QUESTION)
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false)
  const [aiExplainError, setAiExplainError] = useState('')
  const [aiExplainResult, setAiExplainResult] = useState(null)

  const [reviews, setReviews] = useState([])
  const [reviewSummary, setReviewSummary] = useState(buildReviewSummaryPayload())
  const [reviewPagination, setReviewPagination] = useState({
    page: 1,
    limit: 6,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [viewerReview, setViewerReview] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(true)
  const [reviewError, setReviewError] = useState('')
  const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false)
  const [reviewDraft, setReviewDraft] = useState(null)
  const [reviewFormErrors, setReviewFormErrors] = useState({})
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [deletingReviewId, setDeletingReviewId] = useState('')

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true)
        setError('')
        const data = await withMinimumDelay(getProductById(id), 220)
        setProduct(normalizeProduct(data))
        setQuantity(1)
        setAiExplainError('')
        setAiExplainResult(null)
        setAiQuestion(DEFAULT_AI_QUESTION)
      } catch (requestError) {
        setError(requestError.status === 404 ? 'Không tìm thấy sản phẩm' : 'Không thể tải chi tiết sản phẩm')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  async function loadReviews(page = 1, { append = false, silent = false } = {}) {
    if (!id) {
      return
    }

    try {
      if (!silent) {
        if (append) {
          setIsLoadingMoreReviews(true)
        } else {
          setReviewLoading(true)
        }
      }

      setReviewError('')
      const response = await getProductReviews(id, { page, limit: 6, token })

      setProduct((currentProduct) =>
        currentProduct
          ? normalizeProduct({
              ...currentProduct,
              ...buildReviewProductPatch(response.product),
              reviewSummary: response.reviewSummary,
            })
          : currentProduct,
      )
      setReviewSummary(buildReviewSummaryPayload(response.reviewSummary))
      setReviewPagination(response.pagination)
      setViewerReview(response.viewerReview)
      setReviews((currentReviews) => (append ? [...currentReviews, ...response.reviews] : response.reviews))
    } catch (requestError) {
      setReviewError(requestError.message || 'Không thể tải đánh giá sản phẩm.')
    } finally {
      if (!silent) {
        setReviewLoading(false)
        setIsLoadingMoreReviews(false)
      }
    }
  }

  useEffect(() => {
    async function syncInitialReviews() {
      if (!id) {
        return
      }

      try {
        setReviewLoading(true)
        setReviewError('')

        const response = await getProductReviews(id, { page: 1, limit: 6, token })
        setProduct((currentProduct) =>
          currentProduct
            ? normalizeProduct({
                ...currentProduct,
                ...buildReviewProductPatch(response.product),
                reviewSummary: response.reviewSummary,
              })
            : currentProduct,
        )
        setReviewSummary(buildReviewSummaryPayload(response.reviewSummary))
        setReviewPagination(response.pagination)
        setViewerReview(response.viewerReview)
        setReviewDraft(null)
        setReviews(response.reviews)
      } catch (requestError) {
        setReviewError(requestError.message || 'Không thể tải đánh giá sản phẩm.')
      } finally {
        setReviewLoading(false)
        setIsLoadingMoreReviews(false)
      }
    }

    syncInitialReviews()
  }, [id, token])

  const productId = getProductId(product)
  const flashSaleCampaign = useMemo(() => getActiveFlashSaleCampaign(), [])
  const stock = getProductStock(product)
  const isOutOfStock = stock === 0
  const isProductFavorite = productId ? isFavorite(productId) : false
  const isProductCompared = productId ? isCompared(productId) : false
  const productImages = useMemo(() => getProductImages(product), [product])
  const productSpecifications = useMemo(() => getProductSpecifications(product), [product])
  const { discountPercent, originalPrice, discountAmount } = buildProductPricing(product, flashSaleCampaign)
  const hasDiscount = discountPercent > 0
  const ratingBreakdown = useMemo(() => buildRatingBreakdown(product), [product])
  const reviewForm = useMemo(() => {
    if (reviewDraft) {
      return reviewDraft
    }

    if (viewerReview) {
      return {
        rating: Number(viewerReview.rating || 0),
        title: String(viewerReview.title || ''),
        comment: String(viewerReview.comment || ''),
      }
    }

    return INITIAL_REVIEW_FORM
  }, [reviewDraft, viewerReview])

  const breadcrumbs = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Sản phẩm', to: '/products' },
    product?.category
      ? {
          label: getProductCategoryLabel(product.category),
          to: `/products?category=${encodeURIComponent(product.category)}`,
        }
      : null,
    { label: product?.name || 'Chi tiết sản phẩm' },
  ].filter(Boolean)

  function handleQuantityChange(nextQuantity) {
    const parsedQuantity = Number(nextQuantity)

    if (!Number.isFinite(parsedQuantity)) {
      return
    }

    if (stock === null) {
      setQuantity(Math.max(1, parsedQuantity))
      return
    }

    setQuantity(Math.min(Math.max(1, parsedQuantity), Math.max(1, stock)))
  }

  async function handleAddToCart() {
    if (!product || isAddingToCart) {
      return
    }

    setIsAddingToCart(true)
    await wait(300)
    const added = addToCart(product, quantity)
    setIsAddingToCart(false)

    showToast({
      type: added ? 'success' : 'warning',
      title: added ? 'Đã thêm vào giỏ hàng' : 'Không thể thêm sản phẩm',
      message: added
        ? `${quantity} ${product.name} đã được thêm vào giỏ hàng.`
        : 'Sản phẩm đang hết hàng hoặc đã chạm giới hạn số lượng.',
    })
  }

  async function handleFavorite() {
    if (!product || isTogglingFavorite) {
      return
    }

    setIsTogglingFavorite(true)
    await wait(220)
    const added = toggleFavorite(product)
    setIsTogglingFavorite(false)

    showToast({
      type: added ? 'success' : 'info',
      title: added ? 'Đã thêm vào yêu thích' : 'Đã bỏ yêu thích',
      message: added
        ? `${product.name} đã được lưu trong danh sách yêu thích.`
        : `${product.name} đã được xóa khỏi danh sách yêu thích.`,
    })
  }

  function handleCompare() {
    const result = toggleCompare(product)

    showToast({
      type: result.status === 'limit' ? 'warning' : 'info',
      title:
        result.status === 'added'
          ? 'Đã thêm để so sánh'
          : result.status === 'removed'
            ? 'Đã bỏ khỏi so sánh'
            : 'Không thể thêm sản phẩm',
      message:
        result.status === 'limit'
          ? 'Bạn chỉ có thể so sánh tối đa 3 sản phẩm cùng lúc.'
          : `${product.name} ${result.status === 'added' ? 'đã sẵn sàng để so sánh.' : 'không còn trong danh sách so sánh.'}`,
    })
  }

  async function handleBuyNow() {
    if (!product || isBuyingNow) {
      return
    }

    setIsBuyingNow(true)
    addToCart(product, quantity)
    await wait(380)
    setIsBuyingNow(false)
    navigate('/orders')
  }

  async function handleAskAiAboutProduct() {
    if (!productId || isAiAnalyzing) {
      return
    }

    setIsAiAnalyzing(true)
    setAiExplainError('')

    try {
      const result = await explainProductWithAi({
        productId,
        question: aiQuestion.trim() || DEFAULT_AI_QUESTION,
      })
      setAiExplainResult(result)
    } catch (requestError) {
      setAiExplainError(requestError?.message || 'Không thể phân tích sản phẩm bằng AI lúc này.')
    } finally {
      setIsAiAnalyzing(false)
    }
  }

  function handleReviewFormChange(field, value) {
    setReviewDraft((currentDraft) => ({
      ...(currentDraft || reviewForm),
      [field]: field === 'rating' ? Number(value) : value,
    }))
    setReviewFormErrors((currentErrors) => ({
      ...currentErrors,
      [field]: '',
    }))
  }

  function validateReviewForm() {
    const nextErrors = {}

    if (!Number(reviewForm.rating)) {
      nextErrors.rating = 'Vui lòng chọn số sao đánh giá.'
    }

    if (!String(reviewForm.comment || '').trim()) {
      nextErrors.comment = 'Vui lòng nhập nhận xét của bạn.'
    } else if (String(reviewForm.comment || '').trim().length < 8) {
      nextErrors.comment = 'Nội dung đánh giá nên chi tiết hơn một chút.'
    }

    if (String(reviewForm.title || '').trim().length > 140) {
      nextErrors.title = 'Tiêu đề không nên vượt quá 140 ký tự.'
    }

    setReviewFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function applyAggregateUpdate(nextAggregate) {
    if (!nextAggregate) {
      return
    }

    setProduct((currentProduct) =>
      currentProduct
        ? normalizeProduct({
            ...currentProduct,
            ...buildReviewProductPatch(nextAggregate),
          })
        : currentProduct,
    )
  }

  async function handleSubmitReview(event) {
    event.preventDefault()

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${id}` } })
      return
    }

    if (!validateReviewForm() || isSubmittingReview) {
      return
    }

    try {
      setIsSubmittingReview(true)
      setReviewError('')

      const payload = {
        rating: Number(reviewForm.rating || 0),
        title: String(reviewForm.title || '').trim(),
        comment: String(reviewForm.comment || '').trim(),
      }

      const response = viewerReview?.id
        ? await updateProductReview(viewerReview.id, payload, token)
        : await createProductReview(productId, payload, token)

      if (response.review) {
        setViewerReview(response.review)
        setReviewDraft(null)
        setReviews((currentReviews) => {
          const existingIndex = currentReviews.findIndex((review) => review.id === response.review.id)

          if (existingIndex >= 0) {
            const nextReviews = [...currentReviews]
            nextReviews[existingIndex] = response.review
            return nextReviews
          }

          return [response.review, ...currentReviews]
        })
      }

      applyAggregateUpdate(response.aggregate)
      await loadReviews(1, { silent: true })

      showToast({
        type: 'success',
        title: viewerReview?.id ? 'Đã cập nhật đánh giá' : 'Đã gửi đánh giá',
        message: viewerReview?.id
          ? 'Nhận xét của bạn đã được cập nhật.'
          : 'Cảm ơn bạn đã chia sẻ trải nghiệm về sản phẩm này.',
      })
    } catch (requestError) {
      const errorMessage = requestError.message || 'Không thể lưu đánh giá lúc này.'
      setReviewError(errorMessage)
      showToast({
        type: 'error',
        title: 'Không thể lưu đánh giá',
        message: errorMessage,
      })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  async function handleDeleteReview(reviewId) {
    if (!reviewId || !token || deletingReviewId) {
      return
    }

    try {
      setDeletingReviewId(reviewId)
      const response = await deleteProductReview(reviewId, token)

      setReviews((currentReviews) => currentReviews.filter((review) => review.id !== reviewId))
      if (viewerReview?.id === reviewId) {
        setViewerReview(null)
        setReviewDraft(null)
      }

      applyAggregateUpdate(response.aggregate)
      await loadReviews(1, { silent: true })

      showToast({
        type: 'success',
        title: 'Đã xóa đánh giá',
        message: 'Đánh giá đã được gỡ khỏi sản phẩm.',
      })
    } catch (requestError) {
      const errorMessage = requestError.message || 'Không thể xóa đánh giá lúc này.'
      setReviewError(errorMessage)
      showToast({
        type: 'error',
        title: 'Không thể xóa đánh giá',
        message: errorMessage,
      })
    } finally {
      setDeletingReviewId('')
    }
  }

  async function handleLoadMoreReviews() {
    if (!reviewPagination.hasNextPage || isLoadingMoreReviews) {
      return
    }

    await loadReviews(reviewPagination.page + 1, { append: true })
  }

  if (loading) {
    return (
      <section className="page-section">
        <Breadcrumbs items={breadcrumbs} />
        <DetailSkeleton />
      </section>
    )
  }

  if (error || !product) {
    return (
      <section className="page-section">
        <Breadcrumbs items={breadcrumbs} />
        <EmptyState
          title={error || 'Không tìm thấy sản phẩm'}
          description="Sản phẩm có thể đã bị xóa khỏi hệ thống hoặc đường dẫn không còn hợp lệ."
          icon="fa-circle-exclamation"
          tone="warning"
          action={
            <Link to="/products" className="button">
              Quay lại danh sách sản phẩm
            </Link>
          }
        />
      </section>
    )
  }

  return (
    <section className="page-section">
      <Breadcrumbs items={breadcrumbs} />

      <div className="product-detail">
        <ProductGallery images={productImages} enableZoom name={product.name} />

        <div className="detail-content">
          <p className="eyebrow">{getProductCategoryLabel(product.category)}</p>
          <h1>{product.name}</h1>

          <div className="product-rating-inline">
            <StarRating
              value={product.averageRating}
              reviewCount={product.totalReviews}
              readonly
              size="md"
              showValue={product.totalReviews > 0}
              ariaLabel={`Đánh giá trung bình của ${product.name}`}
            />
            <span className="product-rating-inline-note">
              {product.totalReviews > 0 ? `${product.totalReviews} đánh giá` : 'Chưa có đánh giá nào'}
            </span>
          </div>

          <div className="detail-price-stack">
            <p className="detail-price">{formatCurrency(product.price)}</p>
            {hasDiscount ? <p className="product-original-price">{formatCurrency(originalPrice)}</p> : null}
            {hasDiscount ? <span className="product-discount-badge inline">-{discountPercent}%</span> : null}
          </div>

          {hasDiscount ? (
            <p className="detail-savings">Tiết kiệm {formatCurrency(discountAmount)} so với giá niêm yết.</p>
          ) : null}
          <p className="detail-description">{product.description}</p>

          {productSpecifications.length > 0 ? (
            <div className="product-specs-card">
              <div className="section-heading compact product-specs-heading">
                <div>
                  <p className="eyebrow">Specifications</p>
                  <h2>Thông số kỹ thuật</h2>
                </div>
              </div>

              <div className="product-specs-grid">
                {productSpecifications.map((spec, index) => (
                  <div key={`${spec.label || 'spec'}-${spec.value || index}`} className="product-spec-item">
                    <span>{spec.label || 'Thông số'}</span>
                    <strong>{spec.value || 'Đang cập nhật'}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="detail-meta-grid">
            <div>
              <span>Tồn kho</span>
              <strong>{isOutOfStock ? 'Hết hàng' : `${stock} sản phẩm`}</strong>
            </div>
            <div>
              <span>Danh mục</span>
              <strong>{getProductCategoryLabel(product.category)}</strong>
            </div>
            <div>
              <span>Trạng thái</span>
              <strong>{isOutOfStock ? 'Tạm hết hàng' : 'Sẵn sàng giao nhanh'}</strong>
            </div>
            <div>
              <span>Điểm đánh giá</span>
              <strong>{product.totalReviews > 0 ? `${product.averageRating.toFixed(1)}/5` : 'Đang chờ review đầu tiên'}</strong>
            </div>
          </div>

          <p className={`stock-status ${isOutOfStock ? 'out-of-stock' : ''}`}>
            {isOutOfStock ? 'Sản phẩm hiện đang tạm hết hàng.' : 'Sản phẩm còn sẵn trong kho.'}
          </p>

          <div className="detail-quantity">
            <span>Số lượng</span>
            <div className="quantity-control">
              <button type="button" onClick={() => handleQuantityChange(quantity - 1)} disabled={quantity <= 1}>
                -
              </button>
              <input
                type="number"
                min="1"
                max={stock === null ? undefined : Math.max(1, stock)}
                value={quantity}
                onChange={(event) => handleQuantityChange(event.target.value)}
                disabled={isOutOfStock}
              />
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={stock !== null && quantity >= stock}
              >
                +
              </button>
            </div>
          </div>

          <div className="detail-actions">
            <button type="button" className="button button-pressable" onClick={handleBuyNow} disabled={isOutOfStock || isBuyingNow}>
              {isBuyingNow ? (
                <>
                  <ButtonSpinner size="sm" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-bolt" aria-hidden="true" />
                  <span>Mua ngay</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={`button button-light button-pressable ${isAddingToCart ? 'is-success-pending' : ''}`}
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAddingToCart}
            >
              {isAddingToCart ? (
                <>
                  <ButtonSpinner size="sm" />
                  <span>Đang thêm...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cart-plus" aria-hidden="true" />
                  <span>{isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={`button button-light button-pressable favorite-toggle ${isProductFavorite ? 'active' : ''}`}
              onClick={handleFavorite}
              disabled={isTogglingFavorite}
            >
              {isTogglingFavorite ? (
                <>
                  <ButtonSpinner size="sm" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-heart" aria-hidden="true" />
                  <span>{isProductFavorite ? 'Đã yêu thích' : 'Yêu thích'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={`button button-outline button-pressable ${isProductCompared ? 'active' : ''}`}
              onClick={handleCompare}
            >
              <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
              <span>{isProductCompared ? 'Đang so sánh' : 'So sánh'}</span>
            </button>
          </div>

          <div className="consultant-card detail-ai-card">
            <div className="form-card-header">
              <p className="eyebrow">AI Product Explainer</p>
              <h3>Hỏi AI về sản phẩm này</h3>
            </div>

            <label htmlFor="detail-ai-question">
              Câu hỏi cho AI
              <textarea
                id="detail-ai-question"
                rows={3}
                value={aiQuestion}
                onChange={(event) => setAiQuestion(event.target.value)}
                placeholder={DEFAULT_AI_QUESTION}
                disabled={isAiAnalyzing}
              />
            </label>

            <div className="summary-actions">
              <button type="button" className="button" onClick={handleAskAiAboutProduct} disabled={isAiAnalyzing}>
                {isAiAnalyzing ? 'AI đang phân tích...' : 'Hỏi AI về sản phẩm này'}
              </button>
            </div>

            {aiExplainError ? <p className="field-error">{aiExplainError}</p> : null}

            {aiExplainResult?.answer ? (
              <div className="ai-answer detail-ai-answer">
                {aiExplainResult.answer.summary ? <p>{aiExplainResult.answer.summary}</p> : null}
                {aiExplainResult.answer.suitableFor ? (
                  <p>
                    <strong>Phù hợp với:</strong> {aiExplainResult.answer.suitableFor}
                  </p>
                ) : null}
                {aiExplainResult.answer.isWorthBuying ? (
                  <p>
                    <strong>Đáng mua không:</strong> {aiExplainResult.answer.isWorthBuying}
                  </p>
                ) : null}
                {aiExplainResult.answer.fitForStudy ? (
                  <p>
                    <strong>Học tập:</strong> {aiExplainResult.answer.fitForStudy}
                  </p>
                ) : null}
                {aiExplainResult.answer.fitForGaming ? (
                  <p>
                    <strong>Gaming:</strong> {aiExplainResult.answer.fitForGaming}
                  </p>
                ) : null}
                {aiExplainResult.answer.fitForOffice ? (
                  <p>
                    <strong>Văn phòng:</strong> {aiExplainResult.answer.fitForOffice}
                  </p>
                ) : null}
                {aiExplainResult.answer.strengths?.length ? (
                  <div className="ai-list-group">
                    <strong>Điểm mạnh</strong>
                    <ul>
                      {aiExplainResult.answer.strengths.map((item) => (
                        <li key={`strength-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiExplainResult.answer.weaknesses?.length ? (
                  <div className="ai-list-group">
                    <strong>Điểm cần cân nhắc</strong>
                    <ul>
                      {aiExplainResult.answer.weaknesses.map((item) => (
                        <li key={`weakness-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiExplainResult.answer.betterAlternatives?.length ? (
                  <div className="ai-list-group">
                    <strong>Gợi ý thay thế</strong>
                    <ul>
                      {aiExplainResult.answer.betterAlternatives.map((item, index) => (
                        <li key={`${item.productId || 'alternative'}-${index}`}>
                          {item.reason || item.productId}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiExplainResult.answer.finalRecommendation ? <p>{aiExplainResult.answer.finalRecommendation}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="product-review-section">
        <div className="product-review-summary-card">
          <div className="product-review-summary-head">
            <div>
              <p className="eyebrow">Đánh giá sản phẩm</p>
              <h2>Đánh giá từ người mua</h2>
            </div>
            <div className="product-review-summary-score">
              <strong>{product.totalReviews > 0 ? product.averageRating.toFixed(1) : '0.0'}</strong>
              <StarRating
                value={product.averageRating}
                reviewCount={product.totalReviews}
                readonly
                size="lg"
                showValue={false}
                ariaLabel={`Tổng điểm đánh giá của ${product.name}`}
              />
            </div>
          </div>

          <div className="product-review-overview-grid">
            <div className="product-review-breakdown">
              {ratingBreakdown.map((item) => {
                const ratio = product.totalReviews > 0 ? (item.count / product.totalReviews) * 100 : 0

                return (
                  <div key={`breakdown-${item.star}`} className="product-review-breakdown-row">
                    <span>{item.star} sao</span>
                    <div className="product-review-breakdown-track" aria-hidden="true">
                      <span className="product-review-breakdown-fill" style={{ width: `${ratio}%` }} />
                    </div>
                    <strong>{item.count}</strong>
                  </div>
                )
              })}
            </div>

            <div className="product-review-ai-summary">
              <h3>AI review summary</h3>
              {reviewSummary.text ? (
                <>
                  <p>{reviewSummary.text}</p>
                  {reviewSummary.highlights.length > 0 ? (
                    <div className="product-review-highlight-list">
                      {reviewSummary.highlights.map((highlight) => (
                        <span key={highlight} className="product-review-highlight-chip">
                          {highlight}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <p>AI sẽ tổng hợp nhận xét sau khi sản phẩm có đủ review để phân tích.</p>
              )}
            </div>
          </div>
        </div>

        <div className="product-review-layout">
          <div className="consultant-card product-review-form-card">
            <div className="form-card-header">
              <p className="eyebrow">Review & Rating</p>
              <h3>{viewerReview ? 'Chỉnh sửa đánh giá của bạn' : 'Viết đánh giá cho sản phẩm này'}</h3>
              <p>
                {isAuthenticated
                  ? 'Chia sẻ trải nghiệm thực tế để giúp những người mua sau ra quyết định nhanh hơn.'
                  : 'Đăng nhập để đánh giá sản phẩm và đóng góp vào độ tin cậy của hệ thống gợi ý.'}
              </p>
            </div>

            {isAuthenticated ? (
              <form className="product-review-form" onSubmit={handleSubmitReview}>
                <div className="product-review-rating-field">
                  <span>Số sao đánh giá</span>
                  <StarRating
                    value={reviewForm.rating}
                    onChange={(nextValue) => handleReviewFormChange('rating', nextValue)}
                    readonly={isSubmittingReview}
                    size="lg"
                    ariaLabel="Chọn số sao đánh giá"
                  />
                  {reviewFormErrors.rating ? <span className="field-error">{reviewFormErrors.rating}</span> : null}
                </div>

                <label>
                  Tiêu đề (tùy chọn)
                  <input
                    type="text"
                    maxLength="140"
                    value={reviewForm.title}
                    onChange={(event) => handleReviewFormChange('title', event.target.value)}
                    placeholder="Ví dụ: Dùng ổn trong tầm giá"
                    disabled={isSubmittingReview}
                  />
                  {reviewFormErrors.title ? <span className="field-error">{reviewFormErrors.title}</span> : null}
                </label>

                <label>
                  Nhận xét của bạn
                  <textarea
                    rows="5"
                    value={reviewForm.comment}
                    onChange={(event) => handleReviewFormChange('comment', event.target.value)}
                    placeholder="Hãy chia sẻ điểm bạn hài lòng, điểm cần cân nhắc và nhu cầu sử dụng thực tế."
                    disabled={isSubmittingReview}
                  />
                  <div className="product-review-form-meta">
                    <span>{String(reviewForm.comment || '').length}/1600 ký tự</span>
                    {reviewFormErrors.comment ? <span className="field-error">{reviewFormErrors.comment}</span> : null}
                  </div>
                </label>

                {reviewError ? <p className="field-error">{reviewError}</p> : null}

                <div className="summary-actions">
                  <button type="submit" className="button" disabled={isSubmittingReview}>
                    {isSubmittingReview ? (
                      <>
                        <ButtonSpinner size="sm" />
                        <span>{viewerReview ? 'Đang cập nhật...' : 'Đang gửi review...'}</span>
                      </>
                    ) : (
                      <span>{viewerReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}</span>
                    )}
                  </button>

                  {viewerReview?.canDelete ? (
                    <button
                      type="button"
                      className="button button-light"
                      onClick={() => handleDeleteReview(viewerReview.id)}
                      disabled={deletingReviewId === viewerReview.id}
                    >
                      {deletingReviewId === viewerReview.id ? 'Đang xóa...' : 'Xóa đánh giá của tôi'}
                    </button>
                  ) : null}
                </div>
              </form>
            ) : (
              <div className="product-review-login-cta">
                <p>Bạn cần đăng nhập để gửi review, chỉnh sửa review cũ và nhận thông báo xác nhận.</p>
                <button type="button" className="button" onClick={() => navigate('/login', { state: { from: `/products/${id}` } })}>
                  Đăng nhập để đánh giá
                </button>
              </div>
            )}
          </div>

          <div className="product-review-list-card">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Review list</p>
                <h2>{product.totalReviews > 0 ? `${product.totalReviews} nhận xét` : 'Chưa có nhận xét nào'}</h2>
              </div>
            </div>

            {reviewLoading ? (
              <div className="product-review-empty">Đang tải review...</div>
            ) : reviewError && reviews.length === 0 ? (
              <div className="product-review-empty">{reviewError}</div>
            ) : reviews.length === 0 ? (
              <div className="product-review-empty">
                Chưa có review nào cho sản phẩm này. Bạn có thể trở thành người đầu tiên chia sẻ trải nghiệm.
              </div>
            ) : (
              <>
                <div className="product-review-list">
                  {reviews.map((review) => (
                    <article key={review.id} className="product-review-item">
                      <div className="product-review-item-head">
                        <div className="product-review-author">
                          {review.avatar ? (
                            <img src={review.avatar} alt={review.username} className="product-review-avatar" />
                          ) : (
                            <span className="product-review-avatar product-review-avatar-fallback">
                              {String(review.username || 'N').slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <strong>{review.username || 'Người dùng Nexora'}</strong>
                            <span>{formatReviewDate(review.createdAt)}</span>
                          </div>
                        </div>

                        <div className="product-review-item-actions">
                          <StarRating
                            value={review.rating}
                            readonly
                            size="sm"
                            ariaLabel={`Đánh giá ${review.rating} sao`}
                          />
                          {review.canDelete ? (
                            <button
                              type="button"
                              className="text-button button-danger"
                              onClick={() => handleDeleteReview(review.id)}
                              disabled={deletingReviewId === review.id}
                            >
                              {deletingReviewId === review.id ? 'Đang xóa...' : 'Xóa'}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {review.title ? <h4>{review.title}</h4> : null}
                      <p>{review.comment}</p>
                    </article>
                  ))}
                </div>

                {reviewPagination.hasNextPage ? (
                  <div className="product-review-load-more">
                    <button type="button" className="button button-light" onClick={handleLoadMoreReviews} disabled={isLoadingMoreReviews}>
                      {isLoadingMoreReviews ? 'Đang tải thêm...' : 'Xem thêm review'}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProductDetail
