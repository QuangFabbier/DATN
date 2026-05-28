const DEFAULT_RESPONSE_CACHE_TTL_MS = 8 * 60 * 1000
const SAME_REQUEST_WINDOW_MS = 10_000
const SPAM_WINDOW_MS = 30_000
const SPAM_MAX_REQUESTS = 20
const INFLIGHT_WAIT_TIMEOUT_MS = 35_000

const responseCache = new Map()
const inflightRequests = new Map()
const recentRequestMap = new Map()
const ipRequestWindowMap = new Map()
const routeStats = new Map()

function nowMs() {
  return Date.now()
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

function normalizeMessageBody(body = {}) {
  const source = body && typeof body === 'object' ? body : {}
  return {
    message: String(source?.message || '').trim().slice(0, 600),
    productId: String(source?.productId || '').trim(),
    userNeed: String(source?.userNeed || '').trim().slice(0, 320),
    question: String(source?.question || '').trim().slice(0, 320),
    conversationContext: source?.conversationContext && typeof source.conversationContext === 'object' ? source.conversationContext : {},
    recentMessages: Array.isArray(source?.recentMessages)
      ? source.recentMessages
          .slice(-8)
          .map((item) => ({
            role: item?.role === 'user' ? 'user' : 'assistant',
            content: String(item?.content || '').trim().slice(0, 320),
          }))
      : [],
    productIds: Array.isArray(source?.productIds)
      ? source.productIds.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
      : [],
    cartItems: Array.isArray(source?.cartItems)
      ? source.cartItems
          .slice(0, 15)
          .map((item) => ({
            productId: String(item?.productId || item?.id || '').trim(),
            quantity: Math.max(1, Number(item?.quantity || 1)),
          }))
          .filter((item) => item.productId)
      : [],
    focus: source?.focus && typeof source.focus === 'object' ? source.focus : {},
  }
}

function buildRequestKey(req) {
  const normalizedBody = normalizeMessageBody(req.body)
  return `${req.method}:${req.path}:${stableStringify(normalizedBody)}`
}

function trimExpiredCacheEntries() {
  const now = nowMs()
  for (const [cacheKey, entry] of responseCache.entries()) {
    if (Number(entry?.expiresAt || 0) <= now) {
      responseCache.delete(cacheKey)
    }
  }
}

function getCachedResponse(cacheKey) {
  trimExpiredCacheEntries()
  return responseCache.get(cacheKey) || null
}

function setCachedResponse(cacheKey, payload, ttlMs = DEFAULT_RESPONSE_CACHE_TTL_MS) {
  responseCache.set(cacheKey, {
    ...payload,
    expiresAt: nowMs() + Math.max(5_000, Number(ttlMs) || DEFAULT_RESPONSE_CACHE_TTL_MS),
  })

  if (responseCache.size <= 180) {
    return
  }

  const oldestEntries = [...responseCache.entries()]
    .sort((first, second) => Number(first[1]?.expiresAt || 0) - Number(second[1]?.expiresAt || 0))
    .slice(0, Math.max(0, responseCache.size - 180))
  for (const [oldKey] of oldestEntries) {
    responseCache.delete(oldKey)
  }
}

function updateRouteStats(pathname, event = 'call') {
  const route = String(pathname || '/api/ai')
  const current = routeStats.get(route) || {
    calls: 0,
    cacheHits: 0,
    inflightDeduped: 0,
    sameRequest: 0,
    spamBlocked: 0,
  }

  const next = {
    calls: current.calls + (event === 'call' ? 1 : 0),
    cacheHits: current.cacheHits + (event === 'cache_hit' ? 1 : 0),
    inflightDeduped: current.inflightDeduped + (event === 'inflight_dedupe' ? 1 : 0),
    sameRequest: current.sameRequest + (event === 'same_request' ? 1 : 0),
    spamBlocked: current.spamBlocked + (event === 'spam_blocked' ? 1 : 0),
  }

  routeStats.set(route, next)
  return next
}

function shouldLogDebug() {
  return String(process.env.AI_DEBUG_LOGS || '').trim() === '1'
}

function logDebug(eventName, payload = {}) {
  if (!shouldLogDebug()) {
    return
  }

  console.log(`[AI_ROUTER] ${eventName}`, payload)
}

function buildIpWindowKey(req) {
  return `${String(req.ip || req.headers['x-forwarded-for'] || 'unknown').trim()}::${req.path}`
}

function isSpamRequest(req) {
  const now = nowMs()
  const ipKey = buildIpWindowKey(req)
  const rawTimestamps = ipRequestWindowMap.get(ipKey) || []
  const validTimestamps = rawTimestamps.filter((timestamp) => now - timestamp <= SPAM_WINDOW_MS)
  validTimestamps.push(now)
  ipRequestWindowMap.set(ipKey, validTimestamps)
  return validTimestamps.length > SPAM_MAX_REQUESTS
}

function rememberRecentRequest(cacheKey) {
  recentRequestMap.set(cacheKey, nowMs())
  const now = nowMs()
  for (const [key, timestamp] of recentRequestMap.entries()) {
    if (now - timestamp > SAME_REQUEST_WINDOW_MS) {
      recentRequestMap.delete(key)
    }
  }
}

function isSameRecentRequest(cacheKey) {
  const timestamp = Number(recentRequestMap.get(cacheKey) || 0)
  return timestamp > 0 && nowMs() - timestamp <= SAME_REQUEST_WINDOW_MS
}

function waitInflight(inflightPromise) {
  return Promise.race([
    inflightPromise,
    new Promise((resolve) => {
      setTimeout(() => resolve(null), INFLIGHT_WAIT_TIMEOUT_MS)
    }),
  ])
}

export async function optimizeAiRequests(req, res, next) {
  updateRouteStats(req.path, 'call')
  const startedAt = nowMs()
  const cacheKey = buildRequestKey(req)

  if (isSpamRequest(req)) {
    updateRouteStats(req.path, 'spam_blocked')
    return res.status(429).json({
      message: 'Hệ thống AI đang nhận quá nhiều yêu cầu trong thời gian ngắn. Vui lòng chờ một chút rồi thử lại.',
    })
  }

  if (isSameRecentRequest(cacheKey)) {
    updateRouteStats(req.path, 'same_request')
    logDebug('same_request_detected', { path: req.path })
  }

  const cached = getCachedResponse(cacheKey)
  if (cached) {
    updateRouteStats(req.path, 'cache_hit')
    logDebug('response_cache_hit', { path: req.path, durationMs: nowMs() - startedAt })
    res.setHeader('x-ai-cache', 'HIT')
    return res.status(cached.statusCode).json(cached.body)
  }

  if (inflightRequests.has(cacheKey)) {
    updateRouteStats(req.path, 'inflight_dedupe')
    logDebug('inflight_dedupe', { path: req.path })
    const sharedResponse = await waitInflight(inflightRequests.get(cacheKey))
    if (sharedResponse) {
      res.setHeader('x-ai-cache', 'INFLIGHT')
      return res.status(sharedResponse.statusCode).json(sharedResponse.body)
    }
  }

  let resolveInflight = null
  const inflightPromise = new Promise((resolve) => {
    resolveInflight = resolve
  })
  inflightRequests.set(cacheKey, inflightPromise)
  rememberRecentRequest(cacheKey)
  res.setHeader('x-ai-cache', 'MISS')

  const originalJson = res.json.bind(res)
  res.json = (body) => {
    const statusCode = Number(res.statusCode || 200)
    const sharedPayload = { statusCode, body }

    if (statusCode >= 200 && statusCode < 300) {
      setCachedResponse(cacheKey, sharedPayload)
    }

    if (typeof resolveInflight === 'function') {
      resolveInflight(sharedPayload)
      resolveInflight = null
    }
    inflightRequests.delete(cacheKey)

    logDebug('request_done', {
      path: req.path,
      durationMs: nowMs() - startedAt,
      statusCode,
      stats: routeStats.get(req.path),
    })

    return originalJson(body)
  }

  res.on('close', () => {
    if (typeof resolveInflight === 'function') {
      resolveInflight(null)
      resolveInflight = null
    }
    inflightRequests.delete(cacheKey)
  })

  return next()
}
