import mongoose from 'mongoose'
import Product from '../models/Product.js'
import ProductReview from '../models/ProductReview.js'
import User from '../models/User.js'
import { getReviewSummaryForProduct, markReviewSummaryStale } from './reviewSummaryService.js'

const DEFAULT_PAGE_SIZE = 6
const MAX_PAGE_SIZE = 20

function normalizeText(value = '') {
  return String(value || '').trim()
}

function sanitizeInlineText(value = '', maxLength = 160) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function sanitizeMultilineText(value = '', maxLength = 1600) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

function normalizePositiveInt(value, fallbackValue) {
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallbackValue
  }

  return Math.round(parsedValue)
}

function buildDefaultRatingBreakdown() {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
}

function normalizeProductId(productId = '') {
  return String(productId || '').trim()
}

function normalizeRating(value) {
  const rating = Number(value)

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    const error = new Error('Số sao đánh giá phải nằm trong khoảng từ 1 đến 5.')
    error.statusCode = 400
    throw error
  }

  return Math.round(rating)
}

function buildPaginationMeta(page, limit, totalItems) {
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalItems) / limit))

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

function isAdminUser(user = {}) {
  return String(user?.role || '').trim().toLowerCase() === 'admin'
}

function buildAvatarDataUrl(avatar = {}) {
  const contentType = normalizeText(avatar?.contentType)
  const dataBuffer = avatar?.data

  if (!contentType || !Buffer.isBuffer(dataBuffer) || dataBuffer.length === 0) {
    return ''
  }

  return `data:${contentType};base64,${dataBuffer.toString('base64')}`
}

function mapReviewForResponse(review = {}, currentUser = null) {
  const userId = String(review?.userId || review?.user?._id || '')
  const currentUserId = String(currentUser?.id || '')
  const canEdit = Boolean(currentUserId) && currentUserId === userId
  const canDelete = canEdit || isAdminUser(currentUser)

  return {
    id: String(review?._id || review?.id || ''),
    productId: String(review?.productId || ''),
    userId,
    username: normalizeText(review?.username),
    avatar: normalizeText(review?.avatar),
    rating: Number(review?.rating || 0),
    title: normalizeText(review?.title),
    comment: normalizeText(review?.comment),
    createdAt: review?.createdAt || null,
    updatedAt: review?.updatedAt || null,
    canEdit,
    canDelete,
  }
}

async function ensureProductExists(productId) {
  const normalizedProductId = normalizeProductId(productId)

  if (!mongoose.Types.ObjectId.isValid(normalizedProductId)) {
    const error = new Error('`productId` không hợp lệ.')
    error.statusCode = 400
    throw error
  }

  const product = await Product.findById(normalizedProductId).select(
    'name category averageRating totalReviews ratingBreakdown reviewSummary',
  )

  if (!product) {
    const error = new Error('Không tìm thấy sản phẩm.')
    error.statusCode = 404
    throw error
  }

  return product
}

async function ensureReviewExists(reviewId) {
  const normalizedReviewId = String(reviewId || '').trim()

  if (!mongoose.Types.ObjectId.isValid(normalizedReviewId)) {
    const error = new Error('`reviewId` không hợp lệ.')
    error.statusCode = 400
    throw error
  }

  const review = await ProductReview.findById(normalizedReviewId)

  if (!review) {
    const error = new Error('Không tìm thấy đánh giá.')
    error.statusCode = 404
    throw error
  }

  return review
}

async function buildReviewAuthorSnapshot(userId) {
  const user = await User.findById(userId).select('name avatar')

  if (!user) {
    const error = new Error('Người dùng không tồn tại.')
    error.statusCode = 404
    throw error
  }

  return {
    username: sanitizeInlineText(user.name, 80) || 'Người dùng Nexora',
    avatar: buildAvatarDataUrl(user.avatar),
  }
}

function buildReviewPayload(body = {}) {
  const rating = normalizeRating(body?.rating)
  const title = sanitizeInlineText(body?.title, 140)
  const comment = sanitizeMultilineText(body?.comment, 1600)

  if (!comment) {
    const error = new Error('Vui lòng nhập nội dung đánh giá.')
    error.statusCode = 400
    throw error
  }

  return {
    rating,
    title,
    comment,
  }
}

export async function recalculateProductReviewAggregate(productId) {
  const normalizedProductId = normalizeProductId(productId)
  const ratingBreakdown = buildDefaultRatingBreakdown()
  const reviewStats = await ProductReview.find({ productId: normalizedProductId }).select('rating').lean()
  const totalReviews = reviewStats.length
  const ratingSum = reviewStats.reduce((sum, review) => sum + Number(review?.rating || 0), 0)

  for (const review of reviewStats) {
    const ratingKey = String(Math.max(1, Math.min(5, Number(review?.rating || 0))))
    ratingBreakdown[ratingKey] += 1
  }

  const averageRating =
    totalReviews > 0 ? Number((Math.round((ratingSum / totalReviews) * 10) / 10).toFixed(1)) : 0

  const updatedProduct = await Product.findByIdAndUpdate(
    normalizedProductId,
    {
      $set: {
        averageRating,
        totalReviews,
        ratingBreakdown,
        'reviewSummary.stale': true,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
      select: 'name category averageRating totalReviews ratingBreakdown reviewSummary',
    },
  )

  return updatedProduct?.toObject ? updatedProduct.toObject() : updatedProduct
}

export async function getProductReviews(productId, { page = 1, limit = DEFAULT_PAGE_SIZE, currentUser = null } = {}) {
  const product = await ensureProductExists(productId)
  const normalizedPage = Math.max(1, normalizePositiveInt(page, 1))
  const normalizedLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, normalizePositiveInt(limit, DEFAULT_PAGE_SIZE)))
  const totalItems = Number(product.totalReviews || 0)
  const pagination = buildPaginationMeta(normalizedPage, normalizedLimit, totalItems)
  const skip = (normalizedPage - 1) * normalizedLimit

  const [reviewDocs, viewerReviewDoc, reviewSummary] = await Promise.all([
    ProductReview.find({ productId: product._id }).sort({ createdAt: -1 }).skip(skip).limit(normalizedLimit).lean(),
    currentUser?.id
      ? ProductReview.findOne({ productId: product._id, userId: currentUser.id }).lean()
      : Promise.resolve(null),
    getReviewSummaryForProduct(product._id),
  ])

  return {
    product: {
      id: String(product._id),
      name: product.name,
      averageRating: Number(product.averageRating || 0),
      totalReviews: Number(product.totalReviews || 0),
      ratingBreakdown: product.ratingBreakdown || buildDefaultRatingBreakdown(),
    },
    reviews: reviewDocs.map((review) => mapReviewForResponse(review, currentUser)),
    viewerReview: viewerReviewDoc ? mapReviewForResponse(viewerReviewDoc, currentUser) : null,
    reviewSummary,
    pagination,
  }
}

export async function createProductReview(productId, body = {}, currentUser = null) {
  if (!currentUser?.id) {
    const error = new Error('Yêu cầu đăng nhập để gửi đánh giá.')
    error.statusCode = 401
    throw error
  }

  const product = await ensureProductExists(productId)
  const existingReview = await ProductReview.findOne({
    productId: product._id,
    userId: currentUser.id,
  })

  if (existingReview) {
    const error = new Error('Bạn đã đánh giá sản phẩm này rồi. Hãy chỉnh sửa đánh giá cũ.')
    error.statusCode = 409
    throw error
  }

  const payload = buildReviewPayload(body)
  const author = await buildReviewAuthorSnapshot(currentUser.id)
  const createdReview = await ProductReview.create({
    productId: product._id,
    userId: currentUser.id,
    username: author.username,
    avatar: author.avatar,
    ...payload,
  })

  const aggregate = await recalculateProductReviewAggregate(product._id)
  await markReviewSummaryStale(product._id)

  return {
    review: mapReviewForResponse(createdReview.toObject(), currentUser),
    aggregate,
  }
}

export async function updateProductReview(reviewId, body = {}, currentUser = null) {
  if (!currentUser?.id) {
    const error = new Error('Yêu cầu đăng nhập để cập nhật đánh giá.')
    error.statusCode = 401
    throw error
  }

  const review = await ensureReviewExists(reviewId)
  const isOwner = String(review.userId) === String(currentUser.id)

  if (!isOwner) {
    const error = new Error('Bạn chỉ có thể sửa đánh giá của chính mình.')
    error.statusCode = 403
    throw error
  }

  const payload = buildReviewPayload(body)
  const author = await buildReviewAuthorSnapshot(currentUser.id)

  review.rating = payload.rating
  review.title = payload.title
  review.comment = payload.comment
  review.username = author.username
  review.avatar = author.avatar

  await review.save()

  const aggregate = await recalculateProductReviewAggregate(review.productId)
  await markReviewSummaryStale(review.productId)

  return {
    review: mapReviewForResponse(review.toObject(), currentUser),
    aggregate,
  }
}

export async function deleteProductReview(reviewId, currentUser = null) {
  if (!currentUser?.id) {
    const error = new Error('Yêu cầu đăng nhập để xóa đánh giá.')
    error.statusCode = 401
    throw error
  }

  const review = await ensureReviewExists(reviewId)
  const isOwner = String(review.userId) === String(currentUser.id)
  const canDelete = isOwner || isAdminUser(currentUser)

  if (!canDelete) {
    const error = new Error('Bạn không có quyền xóa đánh giá này.')
    error.statusCode = 403
    throw error
  }

  await review.deleteOne()

  const aggregate = await recalculateProductReviewAggregate(review.productId)
  await markReviewSummaryStale(review.productId)

  return {
    deletedReviewId: String(review._id),
    productId: String(review.productId),
    aggregate,
  }
}

export async function deleteReviewsByProductId(productId) {
  const normalizedProductId = normalizeProductId(productId)

  if (!mongoose.Types.ObjectId.isValid(normalizedProductId)) {
    return { deletedCount: 0 }
  }

  return ProductReview.deleteMany({ productId: normalizedProductId })
}

export async function getAdminReviewList({
  page = 1,
  limit = 10,
  rating = '',
  productId = '',
  search = '',
  currentUser = null,
} = {}) {
  if (!isAdminUser(currentUser)) {
    const error = new Error('Bạn không có quyền xem danh sách review quản trị.')
    error.statusCode = 403
    throw error
  }

  const normalizedPage = Math.max(1, normalizePositiveInt(page, 1))
  const normalizedLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, normalizePositiveInt(limit, 10)))
  const normalizedRating = String(rating || '').trim()
  const normalizedProductId = String(productId || '').trim()
  const normalizedSearch = sanitizeInlineText(search, 120)
  const query = {}

  if (normalizedRating) {
    const parsedRating = normalizeRating(normalizedRating)
    query.rating = parsedRating
  }

  if (normalizedProductId) {
    if (!mongoose.Types.ObjectId.isValid(normalizedProductId)) {
      const error = new Error('`productId` không hợp lệ.')
      error.statusCode = 400
      throw error
    }
    query.productId = normalizedProductId
  }

  if (normalizedSearch) {
    query.$or = [
      { username: { $regex: normalizedSearch, $options: 'i' } },
      { title: { $regex: normalizedSearch, $options: 'i' } },
      { comment: { $regex: normalizedSearch, $options: 'i' } },
    ]
  }

  const totalItems = await ProductReview.countDocuments(query)
  const pagination = buildPaginationMeta(normalizedPage, normalizedLimit, totalItems)
  const skip = (normalizedPage - 1) * normalizedLimit
  const reviewDocs = await ProductReview.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(normalizedLimit)
    .lean()

  const productIds = [...new Set(reviewDocs.map((review) => String(review.productId || '')).filter(Boolean))]
  const productDocs = await Product.find({ _id: { $in: productIds } })
    .select('name category image averageRating totalReviews')
    .lean()
  const productMap = new Map(productDocs.map((product) => [String(product._id), product]))

  return {
    reviews: reviewDocs.map((review) => {
      const mappedReview = mapReviewForResponse(review, currentUser)
      const product = productMap.get(String(review.productId || ''))

      return {
        ...mappedReview,
        product: product
          ? {
              id: String(product._id),
              name: product.name,
              category: product.category,
              image: product.image,
              averageRating: Number(product.averageRating || 0),
              totalReviews: Number(product.totalReviews || 0),
            }
          : null,
      }
    }),
    pagination,
  }
}
