import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import StarRating from '../../components/StarRating'
import { ButtonSpinner } from '../../components/Spinner'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { deleteProductReview, getAdminReviews } from '../../services/reviewService'
import { getProducts } from '../../services/productService'
import { formatCurrency } from '../../utils/formatCurrency'

function AdminReviews() {
  const { token, isAuthenticated, user } = useAuth()
  const { showToast } = useToast()
  const [reviews, setReviews] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    search: '',
    rating: '',
    productId: '',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [deletingReviewId, setDeletingReviewId] = useState('')
  const hasAdminAccess = isAuthenticated && user?.role === 'admin'

  async function loadAdminReviews(page = 1, nextFilters = filters) {
    try {
      setLoading(true)
      setError('')

      const response = await getAdminReviews({
        page,
        limit: pagination.limit,
        rating: nextFilters.rating,
        productId: nextFilters.productId,
        search: nextFilters.search,
        token,
      })

      setReviews(response.reviews)
      setPagination(response.pagination)
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải danh sách review quản trị.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function syncInitialReviewList() {
      try {
        setLoading(true)
        setError('')

        const response = await getAdminReviews({
          page: 1,
          limit: 10,
          token,
        })

        setReviews(response.reviews)
        setPagination(response.pagination)
      } catch (requestError) {
        setError(requestError.message || 'Không thể tải danh sách review quản trị.')
      } finally {
        setLoading(false)
      }
    }

    syncInitialReviewList()
  }, [token])

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await getProducts()
        setProducts(response)
      } catch {
        setProducts([])
      }
    }

    loadProducts()
  }, [])

  const availableProducts = useMemo(() => products.filter((product) => product?.id), [products])

  async function handleDeleteReview(review) {
    if (!review?.id || deletingReviewId) {
      return
    }

    try {
      setDeletingReviewId(review.id)
      await deleteProductReview(review.id, token)

      setReviews((currentReviews) => currentReviews.filter((item) => item.id !== review.id))
      setPagination((currentPagination) => ({
        ...currentPagination,
        totalItems: Math.max(0, Number(currentPagination.totalItems || 0) - 1),
      }))

      showToast({
        type: 'success',
        title: 'Đã gỡ review',
        message: 'Review vi phạm đã được xóa khỏi hệ thống.',
      })
    } catch (requestError) {
      setError(requestError.message || 'Không thể xóa review.')
      showToast({
        type: 'error',
        title: 'Không thể xóa review',
        message: requestError.message || 'Vui lòng thử lại.',
      })
    } finally {
      setDeletingReviewId('')
    }
  }

  function handleFilterChange(field, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }))
  }

  async function handleApplyFilters(event) {
    event.preventDefault()
    await loadAdminReviews(1, filters)
  }

  async function handleResetFilters() {
    const nextFilters = {
      search: '',
      rating: '',
      productId: '',
    }

    setFilters(nextFilters)
    await loadAdminReviews(1, nextFilters)
  }

  async function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) {
      return
    }

    await loadAdminReviews(nextPage, filters)
  }

  if (loading) {
    return <div className="admin-table-card">Đang tải review...</div>
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Cần đăng nhập để quản lý review"
        description="Bạn cần đăng nhập bằng tài khoản quản trị để duyệt và xóa review vi phạm."
        icon="fa-user-lock"
      />
    )
  }

  if (!hasAdminAccess) {
    return (
      <EmptyState
        title="Không có quyền quản trị"
        description="Tài khoản hiện tại không có quyền duyệt và xóa review."
        icon="fa-lock"
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">Kiểm duyệt review</p>
          <h2>Admin Reviews</h2>
        </div>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}

      <form className="admin-toolbar" onSubmit={handleApplyFilters}>
        <input
          type="search"
          value={filters.search}
          onChange={(event) => handleFilterChange('search', event.target.value)}
          placeholder="Tìm theo username, tiêu đề hoặc nội dung"
        />
        <select value={filters.rating} onChange={(event) => handleFilterChange('rating', event.target.value)}>
          <option value="">Tất cả số sao</option>
          <option value="5">5 sao</option>
          <option value="4">4 sao</option>
          <option value="3">3 sao</option>
          <option value="2">2 sao</option>
          <option value="1">1 sao</option>
        </select>
        <select value={filters.productId} onChange={(event) => handleFilterChange('productId', event.target.value)}>
          <option value="">Tất cả sản phẩm</option>
          {availableProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <button type="submit" className="button">
          Lọc review
        </button>
        <button type="button" className="button button-light" onClick={handleResetFilters}>
          Đặt lại
        </button>
      </form>

      {reviews.length === 0 ? (
        <EmptyState
          title="Không có review phù hợp"
          description="Bộ lọc hiện tại chưa trả về review nào cần xử lý."
          icon="fa-comments"
        />
      ) : (
        <div className="admin-table-card admin-review-list-card">
          <div className="admin-table-meta">
            <span>{pagination.totalItems} review</span>
          </div>

          <div className="admin-review-list">
            {reviews.map((review) => (
              <article key={review.id} className="admin-review-item">
                <div className="admin-review-item-head">
                  <div>
                    <p className="eyebrow">{review.product?.category || 'Sản phẩm'}</p>
                    <h3>{review.product?.name || 'Sản phẩm đã bị xóa'}</h3>
                  </div>

                  <button
                    type="button"
                    className="button admin-danger-button"
                    onClick={() => handleDeleteReview(review)}
                    disabled={deletingReviewId === review.id}
                  >
                    {deletingReviewId === review.id ? (
                      <>
                        <ButtonSpinner size="sm" />
                        <span>Đang xóa...</span>
                      </>
                    ) : (
                      'Xóa review'
                    )}
                  </button>
                </div>

                <div className="admin-review-item-meta">
                  <div>
                    <strong>{review.username}</strong>
                    <span>{new Date(review.createdAt).toLocaleString('vi-VN')}</span>
                  </div>

                  <StarRating
                    value={review.rating}
                    readonly
                    size="sm"
                    ariaLabel={`Review ${review.rating} sao`}
                  />
                </div>

                {review.product ? (
                  <div className="admin-review-product-meta">
                    <img src={review.product.image} alt={review.product.name} />
                    <div>
                      <p>{review.product.category}</p>
                      <span>{formatCurrency(review.product.price || 0)}</span>
                      <StarRating
                        value={review.product.averageRating}
                        reviewCount={review.product.totalReviews}
                        readonly
                        size="xs"
                        showValue={review.product.totalReviews > 0}
                        ariaLabel={`Tổng điểm đánh giá của ${review.product.name}`}
                      />
                    </div>
                  </div>
                ) : null}

                {review.title ? <h4>{review.title}</h4> : null}
                <p>{review.comment}</p>
              </article>
            ))}
          </div>

          <div className="admin-pagination">
            <button
              type="button"
              className="button button-light"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPreviousPage}
            >
              Trang trước
            </button>
            <span>
              Trang {pagination.page}/{pagination.totalPages}
            </span>
            <button
              type="button"
              className="button button-light"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
            >
              Trang sau
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReviews
