import axios from 'axios'
import { normalizeProduct } from '../utils/product'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const REVIEWS_API_URL = `${API_BASE_URL}/reviews`

function buildAuthRequestConfig(token = '') {
  const normalizedToken = String(token || '').trim()

  if (!normalizedToken) {
    return undefined
  }

  return {
    headers: {
      Authorization: `Bearer ${normalizedToken}`,
    },
  }
}

function createReviewServiceError(error, fallbackMessage) {
  const serviceError = new Error(error?.response?.data?.message || error?.message || fallbackMessage)
  serviceError.status = error?.response?.status || 500
  return serviceError
}

function normalizeReview(rawReview = {}) {
  return {
    id: String(rawReview?.id || rawReview?._id || ''),
    productId: String(rawReview?.productId || ''),
    userId: String(rawReview?.userId || ''),
    username: String(rawReview?.username || ''),
    avatar: String(rawReview?.avatar || ''),
    rating: Number(rawReview?.rating || 0),
    title: String(rawReview?.title || ''),
    comment: String(rawReview?.comment || ''),
    createdAt: rawReview?.createdAt || null,
    updatedAt: rawReview?.updatedAt || null,
    canEdit: Boolean(rawReview?.canEdit),
    canDelete: Boolean(rawReview?.canDelete),
    product: rawReview?.product ? normalizeProduct(rawReview.product) : null,
  }
}

function normalizeReviewPayload(responseData = {}) {
  return {
    message: String(responseData?.message || ''),
    product: responseData?.product ? normalizeProduct(responseData.product) : null,
    aggregate: responseData?.aggregate ? normalizeProduct(responseData.aggregate) : null,
    review: responseData?.review ? normalizeReview(responseData.review) : null,
    reviews: Array.isArray(responseData?.reviews) ? responseData.reviews.map((review) => normalizeReview(review)) : [],
    viewerReview: responseData?.viewerReview ? normalizeReview(responseData.viewerReview) : null,
    reviewSummary:
      responseData?.reviewSummary && typeof responseData.reviewSummary === 'object'
        ? {
            text: String(responseData.reviewSummary?.text || ''),
            highlights: Array.isArray(responseData.reviewSummary?.highlights)
              ? responseData.reviewSummary.highlights.map((item) => String(item || '')).filter(Boolean)
              : [],
            sourceReviewCount: Number(responseData.reviewSummary?.sourceReviewCount || 0),
          }
        : { text: '', highlights: [], sourceReviewCount: 0 },
    pagination:
      responseData?.pagination && typeof responseData.pagination === 'object'
        ? responseData.pagination
        : {
            page: 1,
            limit: 0,
            totalItems: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
    deletedReviewId: String(responseData?.deletedReviewId || ''),
  }
}

export async function getProductReviews(productId, { page = 1, limit = 6, token = '' } = {}) {
  try {
    const response = await axios.get(`${REVIEWS_API_URL}/product/${productId}`, {
      ...buildAuthRequestConfig(token),
      params: {
        page,
        limit,
      },
    })

    return normalizeReviewPayload(response.data)
  } catch (error) {
    throw createReviewServiceError(error, 'Không thể tải danh sách đánh giá.')
  }
}

export async function createProductReview(productId, payload, token = '') {
  try {
    const response = await axios.post(`${REVIEWS_API_URL}/product/${productId}`, payload, buildAuthRequestConfig(token))
    return normalizeReviewPayload(response.data)
  } catch (error) {
    throw createReviewServiceError(error, 'Không thể gửi đánh giá.')
  }
}

export async function updateProductReview(reviewId, payload, token = '') {
  try {
    const response = await axios.put(`${REVIEWS_API_URL}/${reviewId}`, payload, buildAuthRequestConfig(token))
    return normalizeReviewPayload(response.data)
  } catch (error) {
    throw createReviewServiceError(error, 'Không thể cập nhật đánh giá.')
  }
}

export async function deleteProductReview(reviewId, token = '') {
  try {
    const response = await axios.delete(`${REVIEWS_API_URL}/${reviewId}`, buildAuthRequestConfig(token))
    return normalizeReviewPayload(response.data)
  } catch (error) {
    throw createReviewServiceError(error, 'Không thể xóa đánh giá.')
  }
}

export async function getAdminReviews({ page = 1, limit = 10, rating = '', productId = '', search = '', token = '' } = {}) {
  try {
    const response = await axios.get(REVIEWS_API_URL, {
      ...buildAuthRequestConfig(token),
      params: {
        page,
        limit,
        rating: rating || undefined,
        productId: productId || undefined,
        search: search || undefined,
      },
    })

    return normalizeReviewPayload(response.data)
  } catch (error) {
    throw createReviewServiceError(error, 'Không thể tải danh sách review quản trị.')
  }
}
