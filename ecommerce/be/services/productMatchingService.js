import Product from '../models/Product.js'
import { normalizeTextFold } from './aiJsonUtils.js'

const SCORE_WEIGHTS = {
  category: 30,
  budget: 25,
  useCase: 20,
  inStock: 15,
  priorities: 10,
  preferredBrand: 5,
}

function normalizeText(value = '') {
  return String(value || '').trim()
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
    query.category = { $regex: normalizeText(intent.category), $options: 'i' }
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
    description: normalizeText(product?.description),
    price: Number(product?.price || 0),
    stock: Number(product?.stock || 0),
    image: normalizeText(product?.image),
    specs: Array.isArray(product?.specs)
      ? product.specs
          .map((spec) => ({
            label: normalizeText(spec?.label),
            value: normalizeText(spec?.value),
          }))
          .filter((spec) => spec.label || spec.value)
      : [],
  }
}

export async function matchProductsByIntent(intent, { limit = 5 } = {}) {
  const safeLimit = Math.min(5, Math.max(3, Number(limit) || 5))
  const budgetMax = Number(intent?.budget?.max)
  const hasBudgetLimit = Number.isFinite(budgetMax) && budgetMax > 0
  const query = buildProductQuery(intent)
  const candidates = await Product.find(query)
    .select('name category description price stock image specs createdAt')
    .sort({ createdAt: -1 })
    .limit(120)
    .lean()

  const fallbackCandidates =
    candidates.length > 0
      ? candidates
      : await Product.find({})
          .select('name category description price stock image specs createdAt')
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

  const categoryMatchedProducts = intent?.category
    ? scoredProducts.filter((item) => Number(item?.scoreBreakdown?.category || 0) > 0)
    : []

  const rankedProducts = categoryMatchedProducts.length > 0 ? categoryMatchedProducts : scoredProducts

  const budgetMatchedProducts = hasBudgetLimit
    ? rankedProducts.filter((item) => Number(item?.product?.price || 0) <= budgetMax)
    : []

  // If there are products within budget, only return those.
  const budgetAwareProducts = budgetMatchedProducts.length > 0 ? budgetMatchedProducts : rankedProducts
  const topScoredProducts = budgetAwareProducts.slice(0, safeLimit)

  return {
    query,
    matches: topScoredProducts,
  }
}
