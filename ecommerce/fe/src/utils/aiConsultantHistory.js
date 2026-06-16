import { canUseStorage, getScopedStorageKey, readScopedStorageJSON, writeScopedStorageJSON } from './storageScope'

const CONSULTANT_HISTORY_STORAGE_KEY_PREFIX = 'nexora.ai.consultant.history.v1'
const CONSULTANT_ACTIVE_SESSION_KEY_PREFIX = 'nexora.ai.consultant.active.v1'

const DEFAULT_SESSION_TITLE = 'Cuộc trò chuyện mới'

function getTimestamp() {
  return Date.now()
}

function createConsultantSessionId() {
  return `consultant_${getTimestamp()}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeHistoryMessage(message, fallbackId) {
  if (!message || typeof message !== 'object') {
    return null
  }

  const content = typeof message.content === 'string' ? message.content.trim() : String(message.content || '').trim()

  if (!content) {
    return null
  }

  return {
    id: Number.isFinite(Number(message.id)) ? Number(message.id) : fallbackId,
    role: message.role === 'user' ? 'user' : 'assistant',
    content,
    recommendedProducts: Array.isArray(message.recommendedProducts) ? message.recommendedProducts : [],
  }
}

function normalizeHistorySession(session) {
  if (!session || typeof session !== 'object') {
    return null
  }

  const messages = Array.isArray(session.messages)
    ? session.messages.map((message, index) => normalizeHistoryMessage(message, index + 1)).filter(Boolean)
    : []

  return {
    id: String(session.id || createConsultantSessionId()),
    title: String(session.title || DEFAULT_SESSION_TITLE),
    question: typeof session.question === 'string' ? session.question : '',
    messages,
    conversationContext:
      session.conversationContext && typeof session.conversationContext === 'object'
        ? session.conversationContext
        : null,
    updatedAt: Number.isFinite(Number(session.updatedAt)) ? Number(session.updatedAt) : getTimestamp(),
  }
}

function readConsultantHistory(user) {
  if (!canUseStorage()) {
    return []
  }

  const storedSessions = readScopedStorageJSON(window.localStorage, CONSULTANT_HISTORY_STORAGE_KEY_PREFIX, [], user)

  if (!Array.isArray(storedSessions)) {
    return []
  }

  return storedSessions.map(normalizeHistorySession).filter(Boolean)
}

function writeConsultantHistory(user, sessions) {
  if (!canUseStorage()) {
    return
  }

  const normalizedSessions = Array.isArray(sessions)
    ? sessions.map(normalizeHistorySession).filter(Boolean)
    : []

  writeScopedStorageJSON(window.localStorage, CONSULTANT_HISTORY_STORAGE_KEY_PREFIX, normalizedSessions, user)
}

function upsertConsultantHistorySession(user, session) {
  const normalizedSession = normalizeHistorySession(session)
  if (!normalizedSession) {
    return []
  }

  const currentSessions = readConsultantHistory(user)
  const nextSessions = [
    normalizedSession,
    ...currentSessions.filter((item) => String(item.id) !== normalizedSession.id),
  ].sort((first, second) => Number(second.updatedAt) - Number(first.updatedAt))

  writeConsultantHistory(user, nextSessions)
  return nextSessions
}

function removeConsultantHistorySession(user, sessionId) {
  const normalizedSessionId = String(sessionId || '').trim()
  if (!normalizedSessionId) {
    return []
  }

  const currentSessions = readConsultantHistory(user)
  const nextSessions = currentSessions.filter((item) => String(item.id) !== normalizedSessionId)

  writeConsultantHistory(user, nextSessions)
  return nextSessions
}

function readActiveConsultantSessionId(user) {
  if (!canUseStorage()) {
    return null
  }

  const activeSessionId = readScopedStorageJSON(
    window.localStorage,
    CONSULTANT_ACTIVE_SESSION_KEY_PREFIX,
    null,
    user,
  )

  return typeof activeSessionId === 'string' && activeSessionId.trim() ? activeSessionId : null
}

function writeActiveConsultantSessionId(user, sessionId) {
  if (!canUseStorage()) {
    return
  }

  const normalizedSessionId = typeof sessionId === 'string' ? sessionId.trim() : String(sessionId || '').trim()
  if (!normalizedSessionId) {
    return
  }

  writeScopedStorageJSON(window.localStorage, CONSULTANT_ACTIVE_SESSION_KEY_PREFIX, normalizedSessionId, user)
}

function clearActiveConsultantSessionId(user) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(getScopedStorageKey(CONSULTANT_ACTIVE_SESSION_KEY_PREFIX, user))
  window.localStorage.removeItem(CONSULTANT_ACTIVE_SESSION_KEY_PREFIX)
}

function buildConsultantSessionTitle(messages = []) {
  const firstUserMessage = Array.isArray(messages)
    ? messages.find((message) => message?.role === 'user' && String(message.content || '').trim())
    : null

  const sourceText = String(firstUserMessage?.content || messages?.[0]?.content || '').trim()

  if (!sourceText) {
    return DEFAULT_SESSION_TITLE
  }

  const normalized = sourceText.replace(/\s+/g, ' ')
  return normalized.length > 36 ? `${normalized.slice(0, 36).trim()}…` : normalized
}

function buildConsultantSessionPreview(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'Bắt đầu một phiên tư vấn mới.'
  }

  const lastRelevantMessage = [...messages].reverse().find((message) => String(message?.content || '').trim())
  const sourceText = String(lastRelevantMessage?.content || '').trim()

  if (!sourceText) {
    return 'Bắt đầu một phiên tư vấn mới.'
  }

  const normalized = sourceText.replace(/\s+/g, ' ')
  return normalized.length > 64 ? `${normalized.slice(0, 64).trim()}…` : normalized
}

export {
  buildConsultantSessionTitle,
  buildConsultantSessionPreview,
  clearActiveConsultantSessionId,
  createConsultantSessionId,
  readActiveConsultantSessionId,
  readConsultantHistory,
  removeConsultantHistorySession,
  upsertConsultantHistorySession,
  writeActiveConsultantSessionId,
}
