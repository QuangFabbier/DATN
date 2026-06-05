import Product from '../models/Product.js'
import { normalizeTextFold } from './aiJsonUtils.js'

const SCORE_WEIGHTS = {
  category: 30,
  budget: 25,
  useCase: 20,
  inStock: 15,
  priorities: 10,
  preferredBrand: 5,
  rating: 10,
}

const CANONICAL_CATEGORY_BY_FOLD = {
  laptop: 'Laptop',
  'dien thoai': 'Điện thoại',
  'may tinh bang': 'Máy tính bảng',
  'am thanh': 'Âm thanh',
  'man hinh': 'Màn hình',
  'phu kien': 'Phụ kiện',
  'noi that': 'Nội thất',
}

function normalizeText(value = '') {
  return String(value || '').trim()
}

function resolveCanonicalCategory(rawCategory = '') {
  const foldedCategory = normalizeTextFold(rawCategory)
  if (!foldedCategory) {
    return ''
  }

  return CANONICAL_CATEGORY_BY_FOLD[foldedCategory] || normalizeText(rawCategory)
}

function isCategoryMatch(productCategory = '', targetCategory = '') {
  const normalizedProductCategory = normalizeTextFold(productCategory)
  const normalizedTargetCategory = normalizeTextFold(targetCategory)

  if (!normalizedProductCategory || !normalizedTargetCategory) {
    return false
  }

  return (
    normalizedProductCategory === normalizedTargetCategory ||
    normalizedProductCategory.includes(normalizedTargetCategory) ||
    normalizedTargetCategory.includes(normalizedProductCategory)
  )
}

function tokenizeText(text = '') {
  return normalizeTextFold(text)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
}

function buildProductSearchText(product = {}) {
  const specsText = Array.isArray(product.specs)
    ? product.specs
        .map((spec) => `${String(spec?.label || '')} ${String(spec?.value || '')}`)
        .join(' ')
    : ''

  return normalizeTextFold(
    [product?.name, product?.category, product?.description, specsText].filter(Boolean).join(' '),
  )
}

function hasAnyKeyword(text, keywords = []) {
  if (!text || !Array.isArray(keywords) || keywords.length === 0) {
    return false
  }

  return keywords.some((keyword) => keyword && text.includes(normalizeTextFold(keyword)))
}

function findBrandInProductName(name = '') {
  const normalized = normalizeTextFold(name)
  const firstToken = normalized.split(/[^a-z0-9]+/g).find(Boolean)
  return firstToken || ''
}

function resolveProductBrand(product = {}) {
  const normalizedBrand = normalizeTextFold(product?.brand || '')
  if (normalizedBrand) {
    return normalizedBrand
  }

  return findBrandInProductName(product?.name || '')
}

function calculateRatingScore(product = {}) {
  const averageRating = Math.max(0, Math.min(5, Number(product?.averageRating || 0)))
  const totalReviews = Math.max(0, Number(product?.totalReviews || 0))

  if (averageRating <= 0 || totalReviews <= 0) {
    return 0
  }

  const normalizedAverage = averageRating / 5
  const confidence = Math.min(1, totalReviews / 12)
  const blendedScore = normalizedAverage * 0.8 + confidence * 0.2

  return Number((blendedScore * SCORE_WEIGHTS.rating).toFixed(2))
}

function scoreProduct(product, intent = {}) {
  const productCategory = normalizeTextFold(product?.category || '')
  const productText = buildProductSearchText(product)
  const budgetMax = Number(intent?.budget?.max)
  const useCaseTokens = tokenizeText(intent?.useCase || '')
  const priorityTokens = Array.isArray(intent?.priorities)
    ? intent.priorities.flatMap((item) => tokenizeText(item))
    : []

  const preferredBrands = Array.isArray(intent?.preferredBrands)
    ? intent.preferredBrands.map((value) => normalizeTextFold(value)).filter(Boolean)
    : []

  const avoidBrands = Array.isArray(intent?.avoidBrands)
    ? intent.avoidBrands.map((value) => normalizeTextFold(value)).filter(Boolean)
    : []

  const scoreBreakdown = {
    category: 0,
    budget: 0,
    useCase: 0,
    inStock: 0,
    priorities: 0,
    brand: 0,
    rating: 0,
    penalty: 0,
  }

  if (intent?.category && productCategory.includes(normalizeTextFold(intent.category))) {
    scoreBreakdown.category = SCORE_WEIGHTS.category
  } else if (intent?.category) {
    scoreBreakdown.penalty -= 20
  }

  if (Number.isFinite(budgetMax) && budgetMax > 0) {
    if (Number(product?.price || 0) <= budgetMax) {
      scoreBreakdown.budget = SCORE_WEIGHTS.budget
    } else {
      scoreBreakdown.penalty -= 12
    }
  }

  if (useCaseTokens.length > 0 && hasAnyKeyword(productText, useCaseTokens)) {
    scoreBreakdown.useCase = SCORE_WEIGHTS.useCase
  }

  if (Number(product?.stock || 0) > 0) {
    scoreBreakdown.inStock = SCORE_WEIGHTS.inStock
  } else {
    scoreBreakdown.penalty -= 20
  }

  if (priorityTokens.length > 0 && hasAnyKeyword(productText, priorityTokens)) {
    scoreBreakdown.priorities = SCORE_WEIGHTS.priorities
  }

  scoreBreakdown.rating = calculateRatingScore(product)

  const productBrand = findBrandInProductName(product?.name || '')
  if (preferredBrands.length > 0 && preferredBrands.includes(productBrand)) {
    scoreBreakdown.brand += SCORE_WEIGHTS.preferredBrand
  }

  if (avoidBrands.length > 0 && avoidBrands.includes(productBrand)) {
    scoreBreakdown.penalty -= 20
  }

  const totalScore = Object.values(scoreBreakdown).reduce((sum, current) => sum + Number(current || 0), 0)

  return {
    totalScore,
    scoreBreakdown,
  }
}

function buildProductQuery(intent = {}) {
  const query = {}

  if (intent?.category) {
    const rawCategory = normalizeText(intent.category)
    const normalizedCategory = normalizeTextFold(rawCategory)
    const canonicalCategory = resolveCanonicalCategory(rawCategory)
    query.$or = [
      { category: { $regex: rawCategory, $options: 'i' } },
      { category: { $regex: canonicalCategory, $options: 'i' } },
      { searchableText: { $regex: normalizedCategory, $options: 'i' } },
    ]
  }

  const budgetMax = Number(intent?.budget?.max)
  if (Number.isFinite(budgetMax) && budgetMax > 0) {
    query.price = { $lte: Math.round(budgetMax * 1.35) }
  }

  return query
}

export function mapProductForResponse(product) {
  return {
    id: String(product?._id || product?.id || ''),
    name: normalizeText(product?.name),
    category: normalizeText(product?.category),
    brand: normalizeText(product?.brand),
    description: normalizeText(product?.description),
    price: Number(product?.price || 0),
    stock: Number(product?.stock || 0),
    image: normalizeText(product?.image),
    images: Array.isArray(product?.images)
      ? product.images.map((image) => normalizeText(image)).filter(Boolean)
      : [],
    averageRating: Number(product?.averageRating || 0),
    totalReviews: Number(product?.totalReviews || 0),
    ratingBreakdown:
      product?.ratingBreakdown && typeof product.ratingBreakdown === 'object'
        ? product.ratingBreakdown
        : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    reviewSummary:
      product?.reviewSummary && typeof product.reviewSummary === 'object'
        ? {
            text: normalizeText(product.reviewSummary?.text),
            highlights: Array.isArray(product.reviewSummary?.highlights)
              ? product.reviewSummary.highlights.map((item) => normalizeText(item)).filter(Boolean).slice(0, 4)
              : [],
          }
        : { text: '', highlights: [] },
    specs: Array.isArray(product?.specs)
      ? product.specs
          .map((spec) => ({
            label: normalizeText(spec?.label),
            value: normalizeText(spec?.value),
          }))
          .filter((spec) => spec.label || spec.value)
      : [],
    tags: Array.isArray(product?.tags) ? product.tags.map((item) => normalizeText(item)).filter(Boolean) : [],
    useCases: Array.isArray(product?.useCases)
      ? product.useCases.map((item) => normalizeText(item)).filter(Boolean)
      : [],
  }
}

export async function matchProductsByIntent(intent, { limit = 5 } = {}) {
  const safeLimit = Math.min(5, Math.max(3, Number(limit) || 5))
  const requestedCategory = normalizeText(intent?.category)
  const hasCategoryConstraint = Boolean(requestedCategory)
  const budgetMax = Number(intent?.budget?.max)
  const hasBudgetLimit = Number.isFinite(budgetMax) && budgetMax > 0
  const query = buildProductQuery(intent)
  const candidates = await Product.find(query)
    .select('name category brand description price stock image specs searchableText createdAt averageRating totalReviews ratingBreakdown reviewSummary')
    .sort({ createdAt: -1 })
    .limit(120)
    .lean()

  const fallbackCandidates =
    candidates.length > 0
      ? candidates
      : hasCategoryConstraint
      ? await Product.find({})
          .select('name category brand description price stock image specs searchableText createdAt averageRating totalReviews ratingBreakdown reviewSummary')
          .sort({ createdAt: -1 })
          .limit(120)
          .lean()
        : await Product.find({})
          .select('name category brand description price stock image specs searchableText createdAt averageRating totalReviews ratingBreakdown reviewSummary')
          .sort({ createdAt: -1 })
          .limit(120)
          .lean()

  const scoredProducts = fallbackCandidates
    .map((product) => {
      const scored = scoreProduct(product, intent)
      return {
        product,
        totalScore: scored.totalScore,
        scoreBreakdown: scored.scoreBreakdown,
      }
    })
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore
      }

      if (Number(b.product?.stock || 0) !== Number(a.product?.stock || 0)) {
        return Number(b.product?.stock || 0) - Number(a.product?.stock || 0)
      }

      return Number(a.product?.price || 0) - Number(b.product?.price || 0)
    })

  const categoryMatchedProducts = hasCategoryConstraint
    ? scoredProducts.filter((item) => isCategoryMatch(item?.product?.category, requestedCategory))
    : []

  const rankedProducts = hasCategoryConstraint
    ? categoryMatchedProducts
    : scoredProducts

  const avoidBrandSet = new Set(
    Array.isArray(intent?.avoidBrands)
      ? intent.avoidBrands.map((brand) => normalizeTextFold(brand)).filter(Boolean)
      : [],
  )

  const avoidFilteredProducts =
    avoidBrandSet.size > 0
      ? rankedProducts.filter((item) => !avoidBrandSet.has(resolveProductBrand(item?.product)))
      : rankedProducts

  const avoidAwareProducts = avoidFilteredProducts.length > 0 ? avoidFilteredProducts : rankedProducts

  const budgetMatchedProducts = hasBudgetLimit
    ? avoidAwareProducts.filter((item) => Number(item?.product?.price || 0) <= budgetMax)
    : []

  // If there are products within budget, only return those.
  const budgetAwareProducts = budgetMatchedProducts.length > 0 ? budgetMatchedProducts : avoidAwareProducts
  const topScoredProducts = budgetAwareProducts.slice(0, safeLimit)

  return {
    query,
    matches: topScoredProducts,
  }
}
