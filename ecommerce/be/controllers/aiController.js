import Product from '../models/Product.js'
import { generateAiConsultation } from '../services/geminiService.js'

const MAX_PRODUCTS_FOR_AI = 10
const MAX_PRODUCTS_QUERY = 48

const VIETNAMESE_STOP_WORDS = new Set([
  'toi',
  'tôi',
  'la',
  'là',
  'can',
  'cần',
  'muon',
  'muốn',
  'voi',
  'với',
  'cho',
  'để',
  'de',
  'duoi',
  'dưới',
  'tren',
  'trên',
  'khoang',
  'khoảng',
  'tam',
  'tầm',
  'gia',
  'giá',
  'trieu',
  'triệu',
  'vnd',
  'dong',
  'đồng',
  'san',
  'sản',
  'pham',
  'phẩm',
  'nexora',
  'shop',
  'xin',
  'chao',
  'chào',
])

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseMessageTokens(message = '') {
  return normalizeText(message)
    .split(/[\s,.;:!?()[\]{}"'/\\|+-]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !VIETNAMESE_STOP_WORDS.has(token))
}

function parseBudgetMax(message = '', context = {}) {
  const normalizedMessage = normalizeText(message)

  const explicitPattern =
    /(?:duoi|dưới|toi da|tối đa|khong qua|không quá|under|less than)\s*(\d+(?:[.,]\d+)?)\s*(trieu|triệu|tr|k|nghin|nghìn|ngan|ngàn|vnd|d|đ)?/i
  const explicitMatch = normalizedMessage.match(explicitPattern)

  const aiBudgetRaw = normalizeText(context?.aiPreferences?.budgetPreference || '')
  const aiBudgetMatch = aiBudgetRaw.match(/(\d+(?:[.,]\d+)?)\s*(trieu|triệu|tr|k|nghin|nghìn|ngan|ngàn|vnd|d|đ)?/i)

  const matchedValue = explicitMatch?.[1] || aiBudgetMatch?.[1]
  const matchedUnit = explicitMatch?.[2] || aiBudgetMatch?.[2]

  if (!matchedValue) {
    return null
  }

  const numericValue = Number(String(matchedValue).replace(',', '.'))
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null
  }

  const normalizedUnit = normalizeText(matchedUnit)

  if (['trieu', 'triệu', 'tr'].includes(normalizedUnit)) {
    return Math.round(numericValue * 1_000_000)
  }

  if (['k', 'nghin', 'nghìn', 'ngan', 'ngàn'].includes(normalizedUnit)) {
    return Math.round(numericValue * 1_000)
  }

  if (['vnd', 'd', 'đ'].includes(normalizedUnit)) {
    return Math.round(numericValue)
  }

  // Không có đơn vị: nếu số nhỏ, hiểu theo triệu để khớp ngữ cảnh mua sắm.
  if (numericValue <= 500) {
    return Math.round(numericValue * 1_000_000)
  }

  return Math.round(numericValue)
}

function collectContextKeywords(context = {}) {
  const aiPreferences = context?.aiPreferences || {}
  const cartItems = Array.isArray(context?.cartItems) ? context.cartItems : []
  const favoriteItems = Array.isArray(context?.favoriteItems) ? context.favoriteItems : []

  const productContextKeywords = [...cartItems, ...favoriteItems]
    .flatMap((item) => [item?.name, item?.category])
    .filter(Boolean)

  const rawKeywords = [
    ...(Array.isArray(aiPreferences?.interests) ? aiPreferences.interests : []),
    ...(Array.isArray(aiPreferences?.favoriteCategories) ? aiPreferences.favoriteCategories : []),
    ...(Array.isArray(aiPreferences?.shoppingPriorities) ? aiPreferences.shoppingPriorities : []),
    ...productContextKeywords,
  ]

  return rawKeywords
    .flatMap((item) => parseMessageTokens(String(item || '')))
    .filter(Boolean)
}

function scoreProductRelevance(product, keywords = [], maxBudget = null, context = {}) {
  const searchableText = [
    normalizeText(product?.name),
    normalizeText(product?.category),
    normalizeText(product?.description),
  ].join(' ')

  const categoryText = normalizeText(product?.category)
  const preferredCategories = Array.isArray(context?.aiPreferences?.favoriteCategories)
    ? context.aiPreferences.favoriteCategories.map((value) => normalizeText(value)).filter(Boolean)
    : []

  let score = 0

  for (const keyword of keywords) {
    if (!keyword) {
      continue
    }

    if (normalizeText(product?.name).includes(keyword)) {
      score += 3
    } else if (categoryText.includes(keyword)) {
      score += 2
    } else if (searchableText.includes(keyword)) {
      score += 1
    }
  }

  if (preferredCategories.some((category) => category && categoryText.includes(category))) {
    score += 2
  }

  const price = Number(product?.price || 0)
  if (maxBudget && Number.isFinite(price)) {
    if (price <= maxBudget) {
      score += 2
    } else {
      score -= 6
    }
  }

  if (Number(product?.stock || 0) > 0) {
    score += 1
  }

  return score
}

function mapProductForAi(product) {
  return {
    id: String(product?._id || ''),
    name: String(product?.name || ''),
    category: String(product?.category || ''),
    description: String(product?.description || ''),
    price: Number(product?.price || 0),
    stock: Number(product?.stock || 0),
    image: String(product?.image || ''),
  }
}

function mapProductForResponse(product) {
  return {
    id: String(product?._id || ''),
    name: String(product?.name || ''),
    category: String(product?.category || ''),
    description: String(product?.description || ''),
    price: Number(product?.price || 0),
    stock: Number(product?.stock || 0),
    image: String(product?.image || ''),
  }
}

async function findCandidateProducts(message, context = {}) {
  const messageKeywords = parseMessageTokens(message)
  const contextKeywords = collectContextKeywords(context)
  const keywords = [...new Set([...messageKeywords, ...contextKeywords])].slice(0, 12)
  const maxBudget = parseBudgetMax(message, context)

  const queryFilters = []

  if (keywords.length > 0) {
    const keywordPattern = keywords.map((keyword) => escapeRegex(keyword)).join('|')
    const keywordRegex = new RegExp(keywordPattern, 'i')
    queryFilters.push({
      $or: [{ name: keywordRegex }, { category: keywordRegex }, { description: keywordRegex }],
    })
  }

  if (maxBudget) {
    queryFilters.push({ price: { $lte: maxBudget } })
  }

  const query = queryFilters.length > 0 ? { $and: queryFilters } : {}
  const products = await Product.find(query)
    .select('name category description price stock image createdAt')
    .limit(MAX_PRODUCTS_QUERY)
    .lean()

  const scoredProducts = products
    .map((product) => ({
      product,
      score: scoreProductRelevance(product, keywords, maxBudget, context),
    }))
    .filter((item) => item.score > 0 || keywords.length === 0)
    .sort((firstItem, secondItem) => {
      if (secondItem.score !== firstItem.score) {
        return secondItem.score - firstItem.score
      }

      return Number(secondItem.product?.stock || 0) - Number(firstItem.product?.stock || 0)
    })
    .slice(0, MAX_PRODUCTS_FOR_AI)
    .map((item) => item.product)

  return scoredProducts
}

function buildNoMatchReply() {
  return 'Mình chưa tìm thấy sản phẩm phù hợp trong kho hiện tại theo yêu cầu của bạn. Bạn có thể nới ngân sách hoặc mô tả rõ hơn nhu cầu để mình gợi ý lại.'
}

export async function chatWithAi(req, res) {
  try {
    const message = String(req.body?.message || '').trim()
    const context = req.body?.context && typeof req.body.context === 'object' ? req.body.context : {}

    if (!message) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung cần tư vấn.' })
    }

    const candidateProducts = await findCandidateProducts(message, context)

    if (candidateProducts.length === 0) {
      return res.json({
        reply: buildNoMatchReply(),
        recommendedProducts: [],
      })
    }

    const aiInputProducts = candidateProducts.map(mapProductForAi)
    const aiResponse = await generateAiConsultation({
      message,
      context,
      candidateProducts: aiInputProducts,
    })

    const productById = new Map(candidateProducts.map((product) => [String(product._id), product]))
    const recommendedProducts = aiResponse.recommendedProductIds
      .map((productId) => productById.get(String(productId)))
      .filter(Boolean)
      .slice(0, 5)
      .map(mapProductForResponse)

    const reply = aiResponse.reply || buildNoMatchReply()

    return res.json({
      reply,
      recommendedProducts,
    })
  } catch (error) {
    const statusCode = error.statusCode || 500

    if (statusCode >= 500) {
      return res.status(statusCode).json({ message: 'Không thể xử lý tư vấn AI lúc này.' })
    }

    return res.status(statusCode).json({ message: error.message || 'Yêu cầu tư vấn không hợp lệ.' })
  }
}
