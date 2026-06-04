import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const AI_API_URL = `${API_BASE_URL}/ai`
const AI_CLIENT_CACHE_STORAGE_KEY = 'nexora_ai_response_cache_v1'
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000
const SHORT_CACHE_TTL_MS = 5 * 60 * 1000
const AI_REQUEST_TIMEOUT_MS = 30_000
const MAX_CHAT_CONTEXT_MESSAGES = 8
const MAX_CHAT_MESSAGE_CHARS = 320
const MAX_CHAT_INPUT_CHARS = 600
const MAX_CONTEXT_PRODUCTS = 10
const MAX_IDS = 5
const IS_AI_DEBUG_ENABLED = Boolean(import.meta.env.DEV || String(import.meta.env.VITE_AI_DEBUG || '').trim() === '1')

const inflightRequests = new Map()
const memoryCache = new Map()
const endpointStats = new Map()

function extractApiErrorMessage(error, fallbackMessage) {
  const statusCode = Number(error?.response?.status || 0)

  if (statusCode === 429) {
    return 'Hệ thống AI đang bận do giới hạn tần suất. Vui lòng chờ một chút rồi thử lại.'
  }

  return error?.response?.data?.message || error?.message || fallbackMessage
}

function createAiServiceError(error, fallbackMessage) {
  const serviceError = new Error(extractApiErrorMessage(error, fallbackMessage))
  serviceError.status = error?.response?.status || 500
  return serviceError
}

function stableStringify(value) {
  if (value === null || value === undefined) {
    return 'null'
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
}

function createRequestKey(endpoint, payload) {
  return `${endpoint}::${stableStringify(payload || {})}`
}

function readPersistedCache() {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const rawValue = window.localStorage.getItem(AI_CLIENT_CACHE_STORAGE_KEY)
    if (!rawValue) {
      return {}
    }

    const parsed = JSON.parse(rawValue)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writePersistedCache(cacheObject) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(AI_CLIENT_CACHE_STORAGE_KEY, JSON.stringify(cacheObject))
  } catch {
    // Ignore localStorage quota errors.
  }
}

function logAiClientEvent(eventName, payload = {}) {
  if (!IS_AI_DEBUG_ENABLED) {
    return
  }

  console.debug(`[AI_CLIENT] ${eventName}`, payload)
}

function trackEndpointStat(endpoint, extra = {}) {
  const current = endpointStats.get(endpoint) || { calls: 0, cacheHits: 0, deduped: 0, errors: 0 }
  const next = {
    calls: current.calls + 1,
    cacheHits: current.cacheHits + (extra.cacheHit ? 1 : 0),
    deduped: current.deduped + (extra.deduped ? 1 : 0),
    errors: current.errors + (extra.error ? 1 : 0),
  }
  endpointStats.set(endpoint, next)
  logAiClientEvent('endpoint_stat', { endpoint, ...next })
}

function getCachedResponse(requestKey) {
  const now = Date.now()

  const inMemory = memoryCache.get(requestKey)
  if (inMemory && inMemory.expiresAt > now) {
    return inMemory.data
  }

  const persisted = readPersistedCache()
  const persistedEntry = persisted[requestKey]

  if (!persistedEntry || Number(persistedEntry.expiresAt || 0) <= now) {
    if (persistedEntry) {
      delete persisted[requestKey]
      writePersistedCache(persisted)
    }
    return null
  }

  memoryCache.set(requestKey, {
    data: persistedEntry.data,
    expiresAt: Number(persistedEntry.expiresAt),
  })

  return persistedEntry.data
}

function setCachedResponse(requestKey, data, ttlMs = DEFAULT_CACHE_TTL_MS) {
  const expiresAt = Date.now() + Math.max(5_000, Number(ttlMs) || DEFAULT_CACHE_TTL_MS)
  memoryCache.set(requestKey, { data, expiresAt })

  const persisted = readPersistedCache()
  persisted[requestKey] = {
    data,
    expiresAt,
  }

  const entries = Object.entries(persisted)
    .sort((first, second) => Number(second[1]?.expiresAt || 0) - Number(first[1]?.expiresAt || 0))
    .slice(0, 80)
  const limited = Object.fromEntries(entries)

  writePersistedCache(limited)
}

function normalizeTextArray(values, limit = 6) {
  if (!Array.isArray(values)) {
    return []
  }

  return [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, limit)
}

function normalizeIdArray(values, limit = MAX_IDS) {
  if (!Array.isArray(values)) {
    return []
  }

  return [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, limit)
}

function normalizeContextProducts(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items.slice(0, MAX_CONTEXT_PRODUCTS).map((item) => ({
    id: String(item?.id || item?._id || '').trim(),
    name: String(item?.name || '').trim(),
    category: String(item?.category || '').trim(),
    price: Number(item?.price || 0),
    quantity: Math.max(1, Number(item?.quantity || 1)),
  }))
}

function normalizeRecentMessages(messages = [], limit = MAX_CHAT_CONTEXT_MESSAGES) {
  if (!Array.isArray(messages)) {
    return []
  }

  return messages
    .slice(-Math.max(3, limit))
    .map((item) => ({
      role: item?.role === 'user' ? 'user' : 'assistant',
      content: String(item?.content || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, MAX_CHAT_MESSAGE_CHARS),
    }))
    .filter((item) => item.content)
}

function buildConversationSummary(messages = []) {
  if (!Array.isArray(messages) || messages.length <= MAX_CHAT_CONTEXT_MESSAGES) {
    return ''
  }

  const olderMessages = messages.slice(0, Math.max(0, messages.length - MAX_CHAT_CONTEXT_MESSAGES))
  const userHighlights = olderMessages
    .filter((item) => item?.role === 'user')
    .map((item) => String(item?.content || '').trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .slice(-3)

  if (userHighlights.length === 0) {
    return ''
  }

  return `Tóm tắt yêu cầu trước đó: ${userHighlights.join(' | ').slice(0, 420)}`
}

async function requestWithDedupeAndCache({
  endpoint,
  payload,
  fallbackMessage,
  ttlMs = DEFAULT_CACHE_TTL_MS,
  useCache = true,
}) {
  const requestKey = createRequestKey(endpoint, payload)
  trackEndpointStat(endpoint)

  if (useCache) {
    const cachedData = getCachedResponse(requestKey)
    if (cachedData) {
      trackEndpointStat(endpoint, { cacheHit: true })
      logAiClientEvent('cache_hit', { endpoint })
      return cachedData
    }
  }

  if (inflightRequests.has(requestKey)) {
    trackEndpointStat(endpoint, { deduped: true })
    logAiClientEvent('dedupe_inflight', { endpoint })
    return inflightRequests.get(requestKey)
  }

  const startedAt = Date.now()
  const requestPromise = axios
    .post(`${AI_API_URL}/${endpoint}`, payload, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      timeout: AI_REQUEST_TIMEOUT_MS,
    })
    .then((response) => {
      const responseData = response?.data || {}
      if (useCache) {
        setCachedResponse(requestKey, responseData, ttlMs)
      }
      logAiClientEvent('request_success', {
        endpoint,
        durationMs: Date.now() - startedAt,
      })
      return responseData
    })
    .catch((error) => {
      trackEndpointStat(endpoint, { error: true })
      logAiClientEvent('request_error', {
        endpoint,
        durationMs: Date.now() - startedAt,
        status: Number(error?.response?.status || 0),
      })
      throw createAiServiceError(error, fallbackMessage)
    })
    .finally(() => {
      inflightRequests.delete(requestKey)
    })

  inflightRequests.set(requestKey, requestPromise)
  return requestPromise
}

function normalizeRecommendedProducts(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => ({
      id: String(item?.id || item?._id || ''),
      name: String(item?.name || '').trim(),
      category: String(item?.category || '').trim(),
      brand: String(item?.brand || '').trim(),
      description: String(item?.description || '').trim(),
      price: Number(item?.price || 0),
      stock: Number(item?.stock || 0),
      image: String(item?.image || '').trim(),
      tags: Array.isArray(item?.tags) ? item.tags.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 12) : [],
      useCases: Array.isArray(item?.useCases)
        ? item.useCases.map((useCase) => String(useCase || '').trim()).filter(Boolean).slice(0, 8)
        : [],
      specs: Array.isArray(item?.specs)
        ? item.specs
            .map((spec) => ({
              label: String(spec?.label || '').trim(),
              value: String(spec?.value || '').trim(),
            }))
            .filter((spec) => spec.label || spec.value)
            .slice(0, 12)
        : [],
    }))
    .filter((item) => item.id && item.name)
}

function normalizeConversationContext(context) {
  if (!context || typeof context !== 'object') {
    return null
  }

  const source = context
  const budgetSource = source?.budget && typeof source.budget === 'object' ? source.budget : {}

  function normalizeBudgetNumber(value) {
    if (value === null || value === undefined || value === '') {
      return null
    }

    const parsedValue = Number(value)
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return null
    }

    return Math.round(parsedValue)
  }

  return {
    category: String(source?.category || '').trim(),
    budget: {
      min: normalizeBudgetNumber(budgetSource?.min),
      max: normalizeBudgetNumber(budgetSource?.max),
      currency: 'VND',
    },
    useCase: String(source?.useCase || '').trim(),
    priorities: normalizeTextArray(source?.priorities, 8),
    preferredBrands: normalizeTextArray(source?.preferredBrands, 8),
    avoidBrands: normalizeTextArray(source?.avoidBrands, 8),
    lastRecommendedProductIds: normalizeIdArray(source?.lastRecommendedProductIds, 10),
    conversationStage: String(source?.conversationStage || 'greeting').trim() || 'greeting',
  }
}

function normalizePick(item) {
  if (typeof item === 'string') {
    return {
      productId: '',
      reason: String(item || '').trim(),
    }
  }

  return {
    productId: String(item?.productId || '').trim(),
    reason: String(item?.reason || '').trim(),
  }
}

function normalizeIdReasonItems(values, keyMap = { id: 'productId', reason: 'reason' }) {
  if (!Array.isArray(values)) {
    return []
  }

  return values
    .map((item) => ({
      [keyMap.id]: String(item?.[keyMap.id] || '').trim(),
      [keyMap.reason]: String(item?.[keyMap.reason] || '').trim(),
    }))
    .filter((item) => item[keyMap.id] || item[keyMap.reason])
}

function normalizeChatPayload(payload = {}) {
  const recentMessages = Array.isArray(payload?.allMessagesForSummary)
    ? payload.allMessagesForSummary
    : Array.isArray(payload?.recentMessages)
      ? payload.recentMessages
      : []
  const normalizedRecentMessages = normalizeRecentMessages(recentMessages, MAX_CHAT_CONTEXT_MESSAGES)
  const message = String(payload?.message || '').trim().slice(0, MAX_CHAT_INPUT_CHARS)

  return {
    message,
    context: {
      cartItems: normalizeContextProducts(payload?.context?.cartItems),
      favoriteItems: normalizeContextProducts(payload?.context?.favoriteItems),
      aiPreferences:
        payload?.context?.aiPreferences && typeof payload.context.aiPreferences === 'object' ? payload.context.aiPreferences : {},
    },
    conversationContext: normalizeConversationContext(payload?.conversationContext),
    recentMessages: normalizedRecentMessages,
    conversationSummary:
      String(payload?.conversationSummary || '').trim().slice(0, 420) || buildConversationSummary(recentMessages),
  }
}

function normalizeComparePayload(payload = {}) {
  return {
    productIds: normalizeIdArray(payload?.productIds, MAX_IDS),
    useCase: String(payload?.useCase || '').trim().slice(0, 120),
    focus:
      payload?.focus && typeof payload.focus === 'object'
        ? {
            question: String(payload.focus.question || '').trim().slice(0, 280),
            useCase: String(payload.focus.useCase || '').trim().slice(0, 120),
          }
        : {},
  }
}

function normalizeProductExplainPayload(payload = {}) {
  return {
    productId: String(payload?.productId || '').trim(),
    question: String(payload?.question || '').trim().slice(0, 320),
  }
}

function normalizeCartAnalyzePayload(payload = {}) {
  return {
    cartItems: Array.isArray(payload?.cartItems)
      ? payload.cartItems
          .slice(0, 15)
          .map((item) => ({
            productId: String(item?.productId || item?.id || '').trim(),
            quantity: Math.max(1, Number(item?.quantity || 1)),
          }))
          .filter((item) => item.productId)
      : [],
    userNeed: String(payload?.userNeed || '').trim().slice(0, 320),
  }
}

export async function chatWithAi(payload = {}) {
  const normalizedPayload = normalizeChatPayload(payload)
  const responseData = await requestWithDedupeAndCache({
    endpoint: 'chat',
    payload: normalizedPayload,
    fallbackMessage: 'Không thể gọi tư vấn AI lúc này.',
    ttlMs: SHORT_CACHE_TTL_MS,
    useCache: true,
  })

  return {
    type: String(responseData?.type || 'general').trim() || 'general',
    reply: String(responseData?.reply || '').trim(),
    questions: normalizeTextArray(responseData?.questions, 6),
    conversationContext: normalizeConversationContext(responseData?.conversationContext),
    quickReplies: normalizeTextArray(responseData?.quickReplies, 6),
    intent: responseData?.intent && typeof responseData.intent === 'object' ? responseData.intent : null,
    bestProductId: String(responseData?.bestProductId || '').trim(),
    needMoreInfo: Boolean(responseData?.needMoreInfo),
    followUpQuestion: String(responseData?.followUpQuestion || '').trim(),
    recommendedProducts: normalizeRecommendedProducts(responseData?.recommendedProducts),
  }
}

export async function compareProductsWithAi(payload = {}) {
  const normalizedPayload = normalizeComparePayload(payload)
  const responseData = await requestWithDedupeAndCache({
    endpoint: 'compare',
    payload: normalizedPayload,
    fallbackMessage: 'Không thể gọi so sánh AI lúc này.',
    ttlMs: DEFAULT_CACHE_TTL_MS,
    useCache: true,
  })

  return {
    comparedProducts: normalizeRecommendedProducts(responseData?.comparedProducts),
    summary: String(responseData?.summary || '').trim(),
    bestForStudy: normalizePick(responseData?.bestForStudyPick || responseData?.bestForStudy),
    bestForGaming: normalizePick(responseData?.bestForGamingPick || responseData?.bestForGaming),
    bestValue: normalizePick(responseData?.bestValuePick || responseData?.bestValue),
    bestForStudyText: String(responseData?.bestForStudy || '').trim(),
    bestForGamingText: String(responseData?.bestForGaming || '').trim(),
    bestValueText: String(responseData?.bestValue || '').trim(),
    recommendation: String(responseData?.recommendation || '').trim(),
  }
}

export async function explainProductWithAi(payload = {}) {
  const normalizedPayload = normalizeProductExplainPayload(payload)
  const responseData = await requestWithDedupeAndCache({
    endpoint: 'product-explain',
    payload: normalizedPayload,
    fallbackMessage: 'Không thể gọi AI product explainer lúc này.',
    ttlMs: DEFAULT_CACHE_TTL_MS,
    useCache: true,
  })

  const answer = responseData?.answer && typeof responseData.answer === 'object' ? responseData.answer : {}

  return {
    product: responseData?.product || null,
    alternativeProducts: normalizeRecommendedProducts(responseData?.alternativeProducts),
    answer: {
      summary: String(answer?.summary || '').trim(),
      suitableFor: String(answer?.suitableFor || '').trim(),
      strengths: normalizeTextArray(answer?.strengths, 6),
      weaknesses: normalizeTextArray(answer?.weaknesses, 6),
      isWorthBuying: String(answer?.isWorthBuying || '').trim(),
      fitForStudy: String(answer?.fitForStudy || '').trim(),
      fitForGaming: String(answer?.fitForGaming || '').trim(),
      fitForOffice: String(answer?.fitForOffice || '').trim(),
      betterAlternatives: normalizeIdReasonItems(answer?.betterAlternatives, { id: 'productId', reason: 'reason' }),
      finalRecommendation: String(answer?.finalRecommendation || '').trim(),
    },
  }
}

export async function analyzeCartWithAi(payload = {}) {
  const normalizedPayload = normalizeCartAnalyzePayload(payload)
  const responseData = await requestWithDedupeAndCache({
    endpoint: 'cart-analyze',
    payload: normalizedPayload,
    fallbackMessage: 'Không thể gọi AI cart analyzer lúc này.',
    ttlMs: DEFAULT_CACHE_TTL_MS,
    useCache: false,
  })

  const analysis = responseData?.analysis && typeof responseData.analysis === 'object' ? responseData.analysis : {}

  return {
    cartProducts: normalizeRecommendedProducts(responseData?.cartProducts),
    suggestionProducts: normalizeRecommendedProducts(responseData?.suggestionProducts),
    referencedSuggestions: normalizeRecommendedProducts(responseData?.referencedSuggestions),
    totalAmount: Number(responseData?.totalAmount || 0),
    analysis: {
      summary: String(analysis?.summary || '').trim(),
      fitAssessment: String(analysis?.fitAssessment || '').trim(),
      redundantItems: normalizeIdReasonItems(analysis?.redundantItems, { id: 'productId', reason: 'reason' }),
      missingAccessories: normalizeIdReasonItems(analysis?.missingAccessories, { id: 'productId', reason: 'reason' }),
      swapSuggestions: Array.isArray(analysis?.swapSuggestions)
        ? analysis.swapSuggestions
            .map((item) => ({
              fromProductId: String(item?.fromProductId || '').trim(),
              toProductId: String(item?.toProductId || '').trim(),
              reason: String(item?.reason || '').trim(),
            }))
            .filter((item) => item.fromProductId || item.toProductId || item.reason)
        : [],
      budgetAssessment: String(analysis?.budgetAssessment || '').trim(),
      finalRecommendation: String(analysis?.finalRecommendation || '').trim(),
    },
  }
}


