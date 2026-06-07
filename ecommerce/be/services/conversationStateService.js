import { normalizeTextFold, sanitizeStringArray } from './aiJsonUtils.js'

const VALID_STAGES = new Set([
  'greeting',
  'needs_discovery',
  'clarification',
  'recommendation',
  'comparison',
  'follow_up',
])

const EMPTY_CONTEXT = {
  category: '',
  budget: {
    min: null,
    max: null,
    currency: 'VND',
  },
  useCase: '',
  priorities: [],
  preferredBrands: [],
  preferredProductFamilies: [],
  avoidBrands: [],
  lastRecommendedProductIds: [],
  conversationStage: 'greeting',
}

const CATEGORY_HINT_RULES = [
  { category: 'Tablet', keywords: ['may tinh bang', 'tablet', 'ipad'] },
  { category: 'Laptop', keywords: ['laptop', 'notebook', 'may tinh xach tay', 'may tinh', 'pc', 'computer', 'macbook', 'gaming pc'] },
  { category: 'Phone', keywords: ['dien thoai', 'phone', 'smartphone', 'mobile', 'iphone', 'galaxy', 'redmi'] },
  { category: 'Headphones', keywords: ['tai nghe', 'headphone', 'earbud', 'airpods', 'audio', 'chong on'] },
  { category: 'Monitor', keywords: ['man hinh', 'monitor', 'display'] },
  { category: 'Mouse', keywords: ['chuot', 'mouse'] },
  { category: 'Keyboard', keywords: ['ban phim', 'keyboard'] },
  { category: 'SSD', keywords: ['ssd', 'ocung', 'o cung', 'storage'] },
  { category: 'RAM', keywords: ['ram', 'bo nho'] },
  { category: 'Power Bank', keywords: ['sac du phong', 'power bank'] },
  { category: 'Charging Cable', keywords: ['cap sac', 'charging cable', 'usb c', 'usb-c'] },
  { category: 'Charger', keywords: ['charger', 'sac', 'adapter', 'cu sac', 'bo sac'] },
  { category: 'Router', keywords: ['router', 'wifi', 'modem'] },
  { category: 'Smartwatch', keywords: ['smartwatch', 'dong ho thong minh'] },
]

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizePositiveNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null
  }

  return Math.round(parsedValue)
}

function uniqueValues(values = [], limit = 8) {
  return sanitizeStringArray(values, limit)
}

function mergeUniqueValues(...valueGroups) {
  return uniqueValues(valueGroups.flat().filter(Boolean), 8)
}

function normalizeBudget(input, fallback = EMPTY_CONTEXT.budget) {
  const source = input && typeof input === 'object' ? input : {}
  const fallbackSource = fallback && typeof fallback === 'object' ? fallback : EMPTY_CONTEXT.budget

  const min = normalizePositiveNumber(source.min)
  const max = normalizePositiveNumber(source.max)
  const fallbackMin = normalizePositiveNumber(fallbackSource.min)
  const fallbackMax = normalizePositiveNumber(fallbackSource.max)

  return {
    min: min ?? fallbackMin,
    max: max ?? fallbackMax,
    currency: 'VND',
  }
}

function normalizeStage(stage) {
  const normalizedStage = normalizeText(stage)
  return VALID_STAGES.has(normalizedStage) ? normalizedStage : EMPTY_CONTEXT.conversationStage
}

function includesAny(normalizedMessage = '', keywords = []) {
  return keywords.some((keyword) => normalizedMessage.includes(keyword))
}

function normalizeOrderToken(token = '') {
  const value = normalizeTextFold(token)
  const map = {
    mot: 1,
    hai: 2,
    ba: 3,
    bon: 4,
    tu: 4,
    nam: 5,
    sau: 6,
  }

  if (/^\d+$/.test(value)) {
    return Number(value)
  }

  return map[value] || null
}

function extractOrdinalPair(normalizedMessage = '') {
  const ordinalPattern =
    /(?:thu|mau|cai|san pham)?\s*(\d+|mot|hai|ba|bon|tu|nam|sau)\s*(?:va|voi|,|-|&)\s*(?:thu|mau|cai|san pham)?\s*(\d+|mot|hai|ba|bon|tu|nam|sau)/i
  const match = normalizedMessage.match(ordinalPattern)

  if (!match) {
    return []
  }

  const first = normalizeOrderToken(match[1])
  const second = normalizeOrderToken(match[2])

  if (!first || !second) {
    return []
  }

  return [first, second]
}

function hasAnyMeaningfulConstraint(context = {}) {
  return Boolean(
    normalizeText(context?.useCase) ||
      normalizePositiveNumber(context?.budget?.max) ||
      (Array.isArray(context?.priorities) && context.priorities.length > 0),
  )
}

function shouldTightenBudget(message = '') {
  const normalizedMessage = normalizeTextFold(message)
  return includesAny(normalizedMessage, [
    're hon',
    'gia mem hon',
    'thap hon',
    'giam gia hon',
    'tiet kiem hon',
    'co cai nao re',
  ])
}

function isGreetingMessage(message = '') {
  const normalizedMessage = normalizeTextFold(message)
  return includesAny(normalizedMessage, ['xin chao', 'chao', 'hello', 'hi', 'hey'])
}

function isRefinementMessage(message = '') {
  const normalizedMessage = normalizeTextFold(message)
  return includesAny(normalizedMessage, [
    'uu tien',
    're hon',
    'nhung',
    'con cai nao',
    'co cai nao',
    'toi muon doi',
    'toi can',
    'co ban nao',
  ])
}

function isFreshSearchMessage(message = '', intent = {}) {
  const normalizedMessage = normalizeTextFold(message)
  const hasSearchVerb = includesAny(normalizedMessage, [
    'toi muon xem',
    'muon xem',
    'toi muon mua',
    'muon mua',
    'toi tim',
    'tim giup',
    'tu van',
    'goi y',
  ])

  const hasStrongTarget = Boolean(normalizeText(intent?.category))

  return hasSearchVerb && hasStrongTarget
}

function detectExplicitCategoryFromMessage(message = '') {
  const normalizedMessage = normalizeTextFold(message)
  const matchedRule = CATEGORY_HINT_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalizedMessage.includes(normalizeTextFold(keyword))),
  )

  return matchedRule?.category || ''
}

function normalizeAIPreferences(rawPreferences = {}) {
  const source = rawPreferences && typeof rawPreferences === 'object' ? rawPreferences : {}

  return {
    budgetPreference: normalizeText(source.budgetPreference),
    shoppingPriorities: uniqueValues(source.shoppingPriorities || [], 8),
    preferredBrands: uniqueValues(source.preferredBrands || [], 8),
  }
}

export function normalizeConversationContext(input = {}) {
  const source = input && typeof input === 'object' ? input : {}

  return {
    category: normalizeText(source.category),
    budget: normalizeBudget(source.budget),
    useCase: normalizeText(source.useCase),
    priorities: uniqueValues(source.priorities || [], 8),
    preferredBrands: uniqueValues(source.preferredBrands || [], 8),
    preferredProductFamilies: uniqueValues(source.preferredProductFamilies || [], 8),
    avoidBrands: uniqueValues(source.avoidBrands || [], 8),
    lastRecommendedProductIds: uniqueValues(source.lastRecommendedProductIds || [], 10),
    conversationStage: normalizeStage(source.conversationStage),
  }
}

export function hasMinimumRecommendationData(context = {}) {
  const safeContext = normalizeConversationContext(context)
  return Boolean(safeContext.category && (safeContext.useCase || safeContext.budget.max))
}

export function detectComparisonRequest(message = '') {
  const normalizedMessage = normalizeTextFold(message)
  return includesAny(normalizedMessage, ['so sanh', 'compare'])
}

export function selectComparisonProductIds(message = '', lastRecommendedProductIds = []) {
  const safeIds = uniqueValues(lastRecommendedProductIds, 10)

  if (safeIds.length < 2) {
    return []
  }

  const normalizedMessage = normalizeTextFold(message)
  const explicitOrdinals = extractOrdinalPair(normalizedMessage)

  if (explicitOrdinals.length === 2) {
    const pickedByOrder = explicitOrdinals
      .map((ordinal) => safeIds[ordinal - 1])
      .filter(Boolean)

    if (pickedByOrder.length >= 2) {
      return [...new Set(pickedByOrder)].slice(0, 2)
    }
  }

  if (
    includesAny(normalizedMessage, [
      '2 cai dau',
      'hai cai dau',
      '2 mau dau',
      'hai mau dau',
      '2 san pham dau',
      'hai san pham dau',
    ])
  ) {
    return safeIds.slice(0, 2)
  }

  if (
    includesAny(normalizedMessage, [
      '2 cai cuoi',
      'hai cai cuoi',
      '2 mau cuoi',
      'hai mau cuoi',
      '2 san pham cuoi',
      'hai san pham cuoi',
    ])
  ) {
    return safeIds.slice(Math.max(0, safeIds.length - 2))
  }

  if (
    includesAny(normalizedMessage, [
      '2 cai giua',
      'hai cai giua',
      '2 mau giua',
      'hai mau giua',
      '2 san pham giua',
      'hai san pham giua',
    ])
  ) {
    if (safeIds.length <= 2) {
      return safeIds.slice(0, 2)
    }

    if (safeIds.length === 3) {
      return safeIds.slice(1, 3)
    }

    const middleStart = Math.floor((safeIds.length - 2) / 2)
    return safeIds.slice(middleStart, middleStart + 2)
  }

  return safeIds.slice(0, Math.min(3, safeIds.length))
}

export function mergeConversationContext({ baseContext, intent, message, auxiliaryContext = {} }) {
  const previousContext = normalizeConversationContext(baseContext)
  const safeIntent = intent && typeof intent === 'object' ? intent : {}
  const aiPreferences = normalizeAIPreferences(auxiliaryContext?.aiPreferences || {})
  const freshSearch = isFreshSearchMessage(message, safeIntent)
  const explicitCategoryFromMessage = detectExplicitCategoryFromMessage(message)
  const shouldOverrideCategory =
    freshSearch || !previousContext.category || Boolean(explicitCategoryFromMessage)

  const preferredBrandsFromMemory = aiPreferences.preferredBrands
  const prioritiesFromMemory = aiPreferences.shoppingPriorities

  const nextContext = {
    ...previousContext,
    category: shouldOverrideCategory
      ? normalizeText(explicitCategoryFromMessage || safeIntent.category) || previousContext.category
      : previousContext.category,
    budget: freshSearch
      ? normalizeBudget(safeIntent.budget, EMPTY_CONTEXT.budget)
      : normalizeBudget(safeIntent.budget, previousContext.budget),
    useCase: freshSearch
      ? normalizeText(safeIntent.useCase)
      : normalizeText(safeIntent.useCase) || previousContext.useCase,
    priorities: freshSearch
      ? uniqueValues([...prioritiesFromMemory, ...(safeIntent.priorities || [])], 8)
      : mergeUniqueValues(previousContext.priorities, prioritiesFromMemory, safeIntent.priorities),
    preferredBrands: freshSearch
      ? uniqueValues([...preferredBrandsFromMemory, ...(safeIntent.preferredBrands || [])], 8)
      : mergeUniqueValues(previousContext.preferredBrands, preferredBrandsFromMemory, safeIntent.preferredBrands),
    preferredProductFamilies: mergeUniqueValues(
      previousContext.preferredProductFamilies,
      safeIntent.preferredProductFamilies,
    ),
    avoidBrands: freshSearch
      ? uniqueValues(safeIntent.avoidBrands || [], 8)
      : mergeUniqueValues(previousContext.avoidBrands, safeIntent.avoidBrands),
    lastRecommendedProductIds: freshSearch ? [] : previousContext.lastRecommendedProductIds,
    conversationStage: previousContext.conversationStage,
  }

  const hasNewBudget = normalizePositiveNumber(safeIntent?.budget?.max)
  if (!hasNewBudget && shouldTightenBudget(message) && nextContext.budget.max) {
    nextContext.budget.max = Math.max(500_000, Math.round(nextContext.budget.max * 0.85))
  }

  const hasPreviousRecommendations =
    Array.isArray(previousContext.lastRecommendedProductIds) && previousContext.lastRecommendedProductIds.length > 0

  if (isGreetingMessage(message) && !nextContext.category && !hasAnyMeaningfulConstraint(nextContext)) {
    nextContext.conversationStage = 'greeting'
    return nextContext
  }

  if (!nextContext.category) {
    nextContext.conversationStage = 'needs_discovery'
    return nextContext
  }

  if (!nextContext.useCase && !nextContext.budget.max) {
    nextContext.conversationStage = 'clarification'
    return nextContext
  }

  if (hasPreviousRecommendations && isRefinementMessage(message)) {
    nextContext.conversationStage = 'follow_up'
    return nextContext
  }

  nextContext.conversationStage = 'recommendation'
  return nextContext
}

export function buildClarificationPayload(context = {}) {
  const safeContext = normalizeConversationContext(context)
  const missingCategory = !safeContext.category
  const missingUseCase = !safeContext.useCase
  const missingBudget = !safeContext.budget.max

  if (missingCategory) {
    return {
      type: 'clarification',
      stage: 'needs_discovery',
      reply: 'Mình có thể tư vấn rất sát. Bạn đang cần nhóm sản phẩm nào trước?',
      questions: ['Bạn cần nhóm sản phẩm nào?'],
      quickReplies: ['Laptop', 'Điện thoại', 'Tai nghe', 'Máy tính bảng'],
    }
  }

  if (missingUseCase && missingBudget) {
    return {
      type: 'clarification',
      stage: 'clarification',
      reply: `Mình đã hiểu bạn đang tìm ${safeContext.category}. Bạn muốn chốt mục đích sử dụng hay ngân sách trước?`,
      questions: ['Bạn dùng cho nhu cầu gì?', 'Bạn dự kiến ngân sách bao nhiêu?'],
      quickReplies: ['Học lập trình', 'Gaming', 'Văn phòng', 'Dưới 15 triệu', '15-25 triệu', 'Trên 25 triệu'],
    }
  }

  if (missingUseCase) {
    return {
      type: 'clarification',
      stage: 'clarification',
      reply: `Để chọn chuẩn hơn cho ${safeContext.category}, bạn dùng chủ yếu cho mục đích gì?`,
      questions: ['Bạn dùng cho nhu cầu gì?'],
      quickReplies: ['Học lập trình', 'Gaming', 'Văn phòng', 'Chụp ảnh'],
    }
  }

  if (missingBudget) {
    return {
      type: 'clarification',
      stage: 'clarification',
      reply: `Ok, mình đã nắm nhu cầu ${safeContext.useCase || 'của bạn'}. Bạn có ngân sách khoảng bao nhiêu?`,
      questions: ['Bạn dự kiến ngân sách bao nhiêu?'],
      quickReplies: ['Dưới 15 triệu', '15-25 triệu', 'Trên 25 triệu'],
    }
  }

  return {
    type: 'general',
    stage: 'needs_discovery',
    reply: 'Bạn chia sẻ thêm 1-2 tiêu chí ưu tiên để mình lọc chính xác hơn nhé.',
    questions: [],
    quickReplies: ['Ưu tiên pin', 'Ưu tiên hiệu năng', 'Nhẹ', 'Giá tốt'],
  }
}

export function buildRecommendationQuickReplies() {
  return ['Ưu tiên pin', 'Ưu tiên hiệu năng', 'So sánh 2 cái đầu', 'Có mẫu nào rẻ hơn không']
}

export function buildComparisonQuickReplies() {
  return ['Ưu tiên pin', 'Có mẫu nào rẻ hơn không', 'Giá 3 mẫu khác']
}

export function updateRecommendedProductsInContext(context = {}, products = []) {
  const safeContext = normalizeConversationContext(context)
  const recommendedIds = uniqueValues(
    Array.isArray(products) ? products.map((product) => product?.id || product?._id) : [],
    10,
  )
  const nextStage = safeContext.conversationStage === 'follow_up' ? 'follow_up' : 'recommendation'

  return {
    ...safeContext,
    lastRecommendedProductIds: recommendedIds,
    conversationStage: recommendedIds.length > 0 ? nextStage : safeContext.conversationStage,
  }
}
