import Product from '../models/Product.js'
import { normalizeCategory } from '../utils/productDataset.js'
import { normalizeTextFold } from './aiJsonUtils.js'
import { detectUseCaseProfile, scoreUseCaseFit } from './aiUseCaseCriteriaService.js'

const SCORE_WEIGHTS = {
  category: 30,
  budget: 25,
  useCase: 20,
  inStock: 15,
  priorities: 10,
  preferredBrand: 18,
  rating: 10,
}

function normalizeText(value = '') {
  return String(value || '').trim()
}

function resolveCanonicalCategory(rawCategory = '') {
  return normalizeCategory(rawCategory)
}

function isCategoryMatch(productCategory = '', targetCategory = '') {
  const normalizedProductCategory = normalizeTextFold(resolveCanonicalCategory(productCategory))
  const normalizedTargetCategory = normalizeTextFold(resolveCanonicalCategory(targetCategory))

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

function getFamilyRules() {
  return [
    { queryKeywords: ['macbook', 'mac book', 'macos'], productKeywords: ['macbook', 'mac os', 'macos'] },
    { queryKeywords: ['iphone', 'ios'], productKeywords: ['iphone', 'ios'] },
    { queryKeywords: ['airpods'], productKeywords: ['airpods'] },
    { queryKeywords: ['apple watch', 'watch se', 'watch series', 'watch ultra'], productKeywords: ['apple watch'] },
    { queryKeywords: ['thinkpad'], productKeywords: ['thinkpad'] },
    { queryKeywords: ['legion'], productKeywords: ['legion'] },
    { queryKeywords: ['loq'], productKeywords: ['loq'] },
    { queryKeywords: ['yoga'], productKeywords: ['yoga'] },
    { queryKeywords: ['xps'], productKeywords: ['xps'] },
    { queryKeywords: ['inspiron'], productKeywords: ['inspiron'] },
    { queryKeywords: ['vostro'], productKeywords: ['vostro'] },
    { queryKeywords: ['zenbook'], productKeywords: ['zenbook'] },
    { queryKeywords: ['vivobook'], productKeywords: ['vivobook'] },
    { queryKeywords: ['rog', 'rog strix'], productKeywords: ['rog'] },
    { queryKeywords: ['tuf'], productKeywords: ['tuf'] },
    { queryKeywords: ['aspire'], productKeywords: ['aspire'] },
    { queryKeywords: ['nitro'], productKeywords: ['nitro'] },
    { queryKeywords: ['predator'], productKeywords: ['predator'] },
    { queryKeywords: ['pavilion'], productKeywords: ['pavilion'] },
    { queryKeywords: ['envy'], productKeywords: ['envy'] },
    { queryKeywords: ['omen'], productKeywords: ['omen'] },
    { queryKeywords: ['victus'], productKeywords: ['victus'] },
    { queryKeywords: ['galaxy watch', 'samsung watch', 'watch 7', 'watch ultra'], productKeywords: ['galaxy watch', 'watch'] },
    { queryKeywords: ['galaxy', 'samsung galaxy', 'galaxy s', 'galaxy z', 'galaxy a'], productKeywords: ['galaxy'] },
    { queryKeywords: ['pixel', 'google pixel'], productKeywords: ['pixel'] },
    { queryKeywords: ['redmi', 'redmi note'], productKeywords: ['redmi'] },
    { queryKeywords: ['poco'], productKeywords: ['poco'] },
    { queryKeywords: ['xiaomi', 'mi phone'], productKeywords: ['xiaomi'] },
    { queryKeywords: ['oppo find', 'find x'], productKeywords: ['find'] },
    { queryKeywords: ['reno'], productKeywords: ['reno'] },
    { queryKeywords: ['oppo a', 'a series'], productKeywords: ['oppo a'] },
    { queryKeywords: ['vivo x'], productKeywords: ['vivo x'] },
    { queryKeywords: ['vivo v'], productKeywords: ['vivo v'] },
    { queryKeywords: ['vivo y'], productKeywords: ['vivo y'] },
    { queryKeywords: ['sony wh', 'wh-1000xm', 'wh 1000xm', 'wh1000xm'], productKeywords: ['sony', 'wh-1000xm'] },
    { queryKeywords: ['sony wf', 'wf-1000xm', 'wf 1000xm', 'wf1000xm'], productKeywords: ['sony', 'wf-1000xm'] },
    { queryKeywords: ['jbl'], productKeywords: ['jbl'] },
    { queryKeywords: ['logitech mx', 'mx master', 'mx anywhere'], productKeywords: ['logitech mx', 'mx master', 'mx anywhere'] },
    { queryKeywords: ['logitech g', 'g pro', 'g102', 'g304', 'lightspeed', 'superlight'], productKeywords: ['logitech g', 'g pro', 'g102', 'g304', 'lightspeed', 'superlight'] },
    { queryKeywords: ['keychron'], productKeywords: ['keychron'] },
  ]
}

function buildQuerySignalText(intent = {}) {
  return normalizeTextFold(
    [
      intent?.queryText,
      intent?.category,
      intent?.useCase,
      Array.isArray(intent?.priorities) ? intent.priorities.join(' ') : '',
      Array.isArray(intent?.preferredBrands) ? intent.preferredBrands.join(' ') : '',
      Array.isArray(intent?.preferredProductFamilies) ? intent.preferredProductFamilies.join(' ') : '',
      Array.isArray(intent?.avoidBrands) ? intent.avoidBrands.join(' ') : '',
    ]
      .filter(Boolean)
      .join(' '),
  )
}

function getUseCaseScoreProfile(intent = {}, queryText = '') {
  return detectUseCaseProfile(intent, queryText)
}

function hasProductFamilyMatch(queryText = '', productText = '') {
  if (!queryText || !productText) {
    return false
  }

  return getFamilyRules().some(
    (rule) => rule.queryKeywords.some((keyword) => queryText.includes(keyword)) && hasAnyKeyword(productText, rule.productKeywords),
  )
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
  const queryText = buildQuerySignalText(intent)
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
    study: 0,
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

  const useCaseProfile = getUseCaseScoreProfile(intent, queryText)
  if (useCaseProfile) {
    const useCaseFit = scoreUseCaseFit(product, useCaseProfile)
    scoreBreakdown.useCase = Math.max(scoreBreakdown.useCase, Math.round(useCaseFit.score * 0.5))
    if (useCaseProfile === 'study') {
      scoreBreakdown.study = Math.round(useCaseFit.score * 0.4)
    }
  }

  scoreBreakdown.rating = calculateRatingScore(product)

  const productBrand = findBrandInProductName(product?.name || '')
  if (preferredBrands.length > 0 && preferredBrands.includes(productBrand)) {
    scoreBreakdown.brand += SCORE_WEIGHTS.preferredBrand
  }

  if (hasProductFamilyMatch(queryText, productText)) {
    scoreBreakdown.brand += SCORE_WEIGHTS.preferredBrand + 10
    if (preferredBrands.length === 0) {
      scoreBreakdown.priorities += 4
    }
  }

  const familyRules = getFamilyRules()
  const hasFamilyQuery = familyRules.some((rule) => rule.queryKeywords.some((keyword) => queryText.includes(keyword)))
  const hasFamilyMismatch = hasFamilyQuery && !hasProductFamilyMatch(queryText, productText)
  if (hasFamilyMismatch) {
    scoreBreakdown.penalty -= 15
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
  const queryText = buildQuerySignalText(intent)
  const familyRules = getFamilyRules()
  const hasFamilyQuery = familyRules.some((rule) => rule.queryKeywords.some((keyword) => queryText.includes(keyword)))
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

  const familyMatchedProducts = hasFamilyQuery
    ? scoredProducts.filter((item) => hasProductFamilyMatch(queryText, buildProductSearchText(item?.product)))
    : []

  const categoryMatchedProducts = hasCategoryConstraint
    ? scoredProducts.filter((item) => isCategoryMatch(item?.product?.category, requestedCategory))
    : []

  const rankedProducts = familyMatchedProducts.length > 0
    ? familyMatchedProducts
    : hasCategoryConstraint
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
