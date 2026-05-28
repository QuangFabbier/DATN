import { GoogleGenerativeAI } from '@google/generative-ai'
import { safeJsonParseFromText } from './aiJsonUtils.js'

const DEFAULT_RETRY_COUNT = 1
const DEFAULT_RETRY_BASE_DELAY_MS = 700
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000
const DEFAULT_CACHE_MAX_ENTRIES = 120
const geminiInflight = new Map()
const geminiCache = new Map()
const geminiRouteStats = new Map()

function buildError(message, statusCode = 500) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function getGeminiConfig() {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim()
  const model = String(process.env.GEMINI_MODEL || 'gemini-1.5-flash').trim()

  if (!apiKey) {
    throw buildError('GEMINI_API_KEY chưa được cấu hình', 500)
  }

  return { apiKey, model }
}

function getGenerativeModel() {
  const { apiKey, model } = getGeminiConfig()
  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({ model })
}

function getTemperature(explicitTemperature) {
  const fromEnv = Number(process.env.GEMINI_TEMPERATURE)

  if (Number.isFinite(explicitTemperature)) {
    return explicitTemperature
  }

  if (Number.isFinite(fromEnv)) {
    return Math.min(1, Math.max(0, fromEnv))
  }

  return 0.2
}

function getCacheTtlMs() {
  const envValue = Number(process.env.GEMINI_CACHE_TTL_MS)
  if (Number.isFinite(envValue) && envValue >= 5_000) {
    return Math.round(envValue)
  }

  return DEFAULT_CACHE_TTL_MS
}

function getRetryCount() {
  const envValue = Number(process.env.GEMINI_RETRY_COUNT)
  if (Number.isFinite(envValue) && envValue >= 0) {
    return Math.min(2, Math.round(envValue))
  }

  return DEFAULT_RETRY_COUNT
}

function shouldEnableDebugLogs() {
  return String(process.env.AI_DEBUG_LOGS || '').trim() === '1'
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(ms) || 0))
  })
}

function normalizeRoute(route = '') {
  const value = String(route || '').trim()
  return value || 'unknown'
}

function updateRouteStats(route = '', event = 'call') {
  const safeRoute = normalizeRoute(route)
  const current = geminiRouteStats.get(safeRoute) || {
    calls: 0,
    cacheHits: 0,
    deduped: 0,
    retries: 0,
    errors: 0,
  }

  const next = {
    calls: current.calls + (event === 'call' ? 1 : 0),
    cacheHits: current.cacheHits + (event === 'cache_hit' ? 1 : 0),
    deduped: current.deduped + (event === 'dedupe' ? 1 : 0),
    retries: current.retries + (event === 'retry' ? 1 : 0),
    errors: current.errors + (event === 'error' ? 1 : 0),
  }

  geminiRouteStats.set(safeRoute, next)
  return next
}

function logGeminiDebug(eventName, payload = {}) {
  if (!shouldEnableDebugLogs()) {
    return
  }

  console.log(`[AI_GEMINI] ${eventName}`, payload)
}

function isRateLimitError(error) {
  const statusCode = Number(error?.status || error?.statusCode || error?.response?.status || 0)
  const message = String(error?.message || '').toLowerCase()

  if (statusCode === 429) {
    return true
  }

  return (
    message.includes('429') ||
    message.includes('too many requests') ||
    message.includes('resource_exhausted') ||
    message.includes('rate limit')
  )
}

function estimateTokensFromText(text = '') {
  const normalized = String(text || '').trim()
  if (!normalized) {
    return 0
  }

  return Math.ceil(normalized.length / 4)
}

function extractUsageMetadata(response = {}) {
  const usageMetadata = response?.usageMetadata && typeof response.usageMetadata === 'object' ? response.usageMetadata : {}

  const promptTokens = Number(usageMetadata.promptTokenCount || 0)
  const completionTokens = Number(usageMetadata.candidatesTokenCount || usageMetadata.responseTokenCount || 0)
  const totalTokens = Number(usageMetadata.totalTokenCount || promptTokens + completionTokens || 0)

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  }
}

function hashString(value = '') {
  const input = String(value || '')
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

function createPromptCacheKey({ prompt, temperature, route }) {
  return `${normalizeRoute(route)}::${String(temperature)}::${hashString(prompt)}`
}

function getCachedGeminiResponse(cacheKey) {
  const now = Date.now()
  const entry = geminiCache.get(cacheKey)

  if (!entry) {
    return null
  }

  if (Number(entry.expiresAt || 0) <= now) {
    geminiCache.delete(cacheKey)
    return null
  }

  return entry.text
}

function setCachedGeminiResponse(cacheKey, text, ttlMs = DEFAULT_CACHE_TTL_MS) {
  const expiresAt = Date.now() + Math.max(5_000, Number(ttlMs) || DEFAULT_CACHE_TTL_MS)
  geminiCache.set(cacheKey, { text, expiresAt })

  if (geminiCache.size <= DEFAULT_CACHE_MAX_ENTRIES) {
    return
  }

  const entries = [...geminiCache.entries()]
    .sort((firstEntry, secondEntry) => Number(firstEntry[1]?.expiresAt || 0) - Number(secondEntry[1]?.expiresAt || 0))
    .slice(0, Math.max(0, geminiCache.size - DEFAULT_CACHE_MAX_ENTRIES))

  for (const [key] of entries) {
    geminiCache.delete(key)
  }
}

async function generateContentWithRetry(model, prompt, generationConfig, { route = 'unknown' } = {}) {
  const maxRetries = getRetryCount()
  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: String(prompt || '').trim() }] }],
        generationConfig,
      })
      return result
    } catch (error) {
      lastError = error
      if (!isRateLimitError(error) || attempt >= maxRetries) {
        throw error
      }

      updateRouteStats(route, 'retry')
      const baseDelay = Number(process.env.GEMINI_RETRY_BASE_DELAY_MS || DEFAULT_RETRY_BASE_DELAY_MS)
      const nextDelay = Math.round(baseDelay * 2 ** attempt + Math.random() * 180)
      logGeminiDebug('retry_after_rate_limit', {
        route: normalizeRoute(route),
        attempt: attempt + 1,
        delayMs: nextDelay,
      })
      await sleep(nextDelay)
    }
  }

  throw lastError || buildError('Gemini request failed', 502)
}

async function generateGeminiText(prompt, { temperature, route = 'unknown', useCache = true } = {}) {
  const model = getGenerativeModel()
  const nextTemperature = getTemperature(temperature)
  const safePrompt = String(prompt || '').trim()
  const safeRoute = normalizeRoute(route)
  const cacheKey = createPromptCacheKey({
    prompt: safePrompt,
    temperature: nextTemperature,
    route: safeRoute,
  })

  updateRouteStats(safeRoute, 'call')

  if (useCache) {
    const cachedText = getCachedGeminiResponse(cacheKey)
    if (cachedText) {
      updateRouteStats(safeRoute, 'cache_hit')
      logGeminiDebug('cache_hit', { route: safeRoute })
      return cachedText
    }
  }

  if (geminiInflight.has(cacheKey)) {
    updateRouteStats(safeRoute, 'dedupe')
    logGeminiDebug('dedupe_inflight', { route: safeRoute })
    return geminiInflight.get(cacheKey)
  }

  const startedAt = Date.now()
  const promise = (async () => {
    try {
      let response = null
      let text = ''

      try {
        const result = await generateContentWithRetry(
          model,
          safePrompt,
          {
            temperature: nextTemperature,
            responseMimeType: 'application/json',
          },
          { route: safeRoute },
        )
        response = result?.response
        text = response?.text?.() || ''
      } catch {
        const fallbackResult = await generateContentWithRetry(
          model,
          safePrompt,
          {
            temperature: nextTemperature,
          },
          { route: safeRoute },
        )
        response = fallbackResult?.response
        text = response?.text?.() || ''
      }

      const usage = extractUsageMetadata(response)
      const estimatedPromptTokens = usage.promptTokens || estimateTokensFromText(safePrompt)
      const estimatedCompletionTokens = usage.completionTokens || estimateTokensFromText(text)
      const estimatedTotalTokens = usage.totalTokens || estimatedPromptTokens + estimatedCompletionTokens

      logGeminiDebug('request_success', {
        route: safeRoute,
        durationMs: Date.now() - startedAt,
        promptTokens: estimatedPromptTokens,
        completionTokens: estimatedCompletionTokens,
        totalTokens: estimatedTotalTokens,
      })

      if (useCache && text) {
        setCachedGeminiResponse(cacheKey, text, getCacheTtlMs())
      }

      return text
    } catch (error) {
      updateRouteStats(safeRoute, 'error')
      logGeminiDebug('request_error', {
        route: safeRoute,
        durationMs: Date.now() - startedAt,
        status: Number(error?.status || error?.statusCode || error?.response?.status || 0),
        message: String(error?.message || '').slice(0, 220),
      })
      throw error
    } finally {
      geminiInflight.delete(cacheKey)
    }
  })()

  geminiInflight.set(cacheKey, promise)
  return promise
}

export async function generateGeminiJson(prompt, options = {}) {
  const text = await generateGeminiText(prompt, options)
  const parsed = safeJsonParseFromText(text)

  if (!parsed || typeof parsed !== 'object') {
    throw buildError('AI trả về JSON không hợp lệ', 502)
  }

  return parsed
}
