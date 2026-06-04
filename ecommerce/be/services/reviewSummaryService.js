import mongoose from 'mongoose'
import Product from '../models/Product.js'
import ProductReview from '../models/ProductReview.js'
import { generateGeminiJson } from './geminiService.js'

const REVIEW_SUMMARY_CACHE_TTL_MS = 20 * 60 * 1000

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeSummaryHighlights(items = []) {
  if (!Array.isArray(items)) {
    return []
  }

  return [...new Set(items.map((item) => normalizeText(item)).filter(Boolean))].slice(0, 4)
}

function buildDefaultSummaryPayload() {
  return {
    text: '',
    highlights: [],
    sourceReviewCount: 0,
    stale: false,
    updatedAt: new Date(),
  }
}

function hasFreshSummary(summary = {}, totalReviews = 0) {
  const updatedAtMs = new Date(summary?.updatedAt || 0).getTime()
  const isFreshEnough = updatedAtMs > 0 && Date.now() - updatedAtMs <= REVIEW_SUMMARY_CACHE_TTL_MS

  return (
    Boolean(summary?.text) &&
    !summary?.stale &&
    Number(summary?.sourceReviewCount || 0) === Number(totalReviews || 0) &&
    isFreshEnough
  )
}

function buildFallbackReviewSummary(product = {}, reviews = []) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return buildDefaultSummaryPayload()
  }

  const positiveReviews = reviews.filter((review) => Number(review?.rating || 0) >= 4)
  const negativeReviews = reviews.filter((review) => Number(review?.rating || 0) <= 2)
  const topPositiveComment = normalizeText(positiveReviews[0]?.comment || positiveReviews[0]?.title)
  const topNegativeComment = normalizeText(negativeReviews[0]?.comment || negativeReviews[0]?.title)
  const averageRating = Number(product?.averageRating || 0)
  const totalReviews = Number(product?.totalReviews || reviews.length || 0)

  const summaryParts = [
    `${product?.name || 'Sản phẩm này'} đang có điểm trung bình ${averageRating.toFixed(1)}/5 từ ${totalReviews} đánh giá.`,
  ]

  if (topPositiveComment) {
    summaryParts.push(`Người dùng đánh giá cao về: ${topPositiveComment}.`)
  }

  if (topNegativeComment) {
    summaryParts.push(`Điểm cần lưu ý: ${topNegativeComment}.`)
  }

  return {
    text: summaryParts.join(' ').trim(),
    highlights: normalizeSummaryHighlights([
      averageRating >= 4 ? 'Nhận xét tích cực' : '',
      topPositiveComment ? 'Khen về trải nghiệm sử dụng' : '',
      topNegativeComment ? 'Có điểm cần cân nhắc' : '',
    ]),
    sourceReviewCount: totalReviews,
    stale: false,
    updatedAt: new Date(),
  }
}

function toReviewSnippet(review = {}) {
  return {
    rating: Number(review?.rating || 0),
    title: normalizeText(review?.title),
    comment: normalizeText(review?.comment).slice(0, 260),
    username: normalizeText(review?.username),
    createdAt: review?.createdAt || null,
  }
}

function buildReviewSummaryPrompt(product = {}, reviews = []) {
  return `
Bạn là AI Review Analyst của Nexora.
Chỉ được tổng hợp từ các review thật được cung cấp.

Mục tiêu:
- Tổng hợp trung thực, ngắn gọn, dễ hiểu.
- Nếu có điểm yếu lặp lại trong review thì phải nói rõ.
- Không được suy diễn quá mức hoặc thêm thông tin ngoài review.

Trả về JSON hợp lệ:
{
  "summary": "string",
  "highlights": ["string"]
}

Thông tin sản phẩm:
${JSON.stringify(
    {
      name: normalizeText(product?.name),
      category: normalizeText(product?.category),
      averageRating: Number(product?.averageRating || 0),
      totalReviews: Number(product?.totalReviews || 0),
    },
    null,
    2,
  )}

Top review mẫu:
${JSON.stringify(reviews.map(toReviewSnippet), null, 2)}
  `.trim()
}

async function loadSummarySourceReviews(productId) {
  return ProductReview.find({ productId })
    .select('username rating title comment createdAt')
    .sort({ rating: -1, createdAt: -1 })
    .limit(8)
    .lean()
}

export async function markReviewSummaryStale(productId) {
  if (!mongoose.Types.ObjectId.isValid(String(productId || ''))) {
    return null
  }

  return Product.findByIdAndUpdate(
    productId,
    {
      $set: {
        'reviewSummary.stale': true,
      },
    },
    { returnDocument: 'after' },
  )
}

export async function getReviewSummaryForProduct(productId, { forceRefresh = false } = {}) {
  const normalizedProductId = String(productId || '').trim()
  if (!mongoose.Types.ObjectId.isValid(normalizedProductId)) {
    const error = new Error('`productId` không hợp lệ.')
    error.statusCode = 400
    throw error
  }

  const product = await Product.findById(normalizedProductId)
    .select('name category averageRating totalReviews reviewSummary ratingBreakdown')
    .lean()

  if (!product) {
    const error = new Error('Không tìm thấy sản phẩm.')
    error.statusCode = 404
    throw error
  }

  if (Number(product.totalReviews || 0) === 0) {
    const emptySummary = buildDefaultSummaryPayload()
    await Product.findByIdAndUpdate(normalizedProductId, {
      $set: {
        reviewSummary: emptySummary,
      },
    })
    return emptySummary
  }

  if (!forceRefresh && hasFreshSummary(product.reviewSummary, product.totalReviews)) {
    return {
      text: normalizeText(product.reviewSummary?.text),
      highlights: normalizeSummaryHighlights(product.reviewSummary?.highlights),
      sourceReviewCount: Number(product.reviewSummary?.sourceReviewCount || product.totalReviews || 0),
      stale: false,
      updatedAt: product.reviewSummary?.updatedAt || new Date(),
    }
  }

  const sourceReviews = await loadSummarySourceReviews(normalizedProductId)
  const fallbackSummary = buildFallbackReviewSummary(product, sourceReviews)

  try {
    const prompt = buildReviewSummaryPrompt(product, sourceReviews)
    const aiJson = await generateGeminiJson(prompt, { temperature: 0.1, route: 'review.summary' })
    const nextSummary = {
      text: normalizeText(aiJson?.summary || fallbackSummary.text) || fallbackSummary.text,
      highlights: normalizeSummaryHighlights(aiJson?.highlights || fallbackSummary.highlights),
      sourceReviewCount: Number(product.totalReviews || sourceReviews.length || 0),
      stale: false,
      updatedAt: new Date(),
    }

    await Product.findByIdAndUpdate(normalizedProductId, {
      $set: {
        reviewSummary: nextSummary,
      },
    })

    return nextSummary
  } catch {
    await Product.findByIdAndUpdate(normalizedProductId, {
      $set: {
        reviewSummary: fallbackSummary,
      },
    })

    return fallbackSummary
  }
}
