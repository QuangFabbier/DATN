import {
  canUseStorage,
  getScopedStorageKey,
  readScopedStorageJSON,
  writeScopedStorageJSON,
} from './storageScope'

const CONSULTANT_SESSION_STORAGE_KEY_PREFIX = 'nexora.ai.consultant.session.v1'

function normalizeSessionMessage(message, fallbackId) {
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

function readPersistedConsultantSession(user) {
  if (!canUseStorage()) {
    return null
  }

  try {
    const parsedSession = readScopedStorageJSON(
      window.sessionStorage,
      CONSULTANT_SESSION_STORAGE_KEY_PREFIX,
      null,
      user,
    )

    if (!parsedSession || typeof parsedSession !== 'object') {
      return null
    }

    const question = typeof parsedSession.question === 'string' ? parsedSession.question : ''
    const persistedConversationContext =
      parsedSession.conversationContext && typeof parsedSession.conversationContext === 'object'
        ? parsedSession.conversationContext
        : null
    const normalizedMessages = Array.isArray(parsedSession.messages)
      ? parsedSession.messages
          .map((message, index) => normalizeSessionMessage(message, index + 1))
          .filter(Boolean)
      : []

    if (normalizedMessages.length === 0) {
      return null
    }

    return {
      question,
      messages: normalizedMessages,
      conversationContext: persistedConversationContext,
    }
  } catch {
    return null
  }
}

function writePersistedConsultantSession(user, session) {
  if (!canUseStorage()) {
    return
  }

  writeScopedStorageJSON(window.sessionStorage, CONSULTANT_SESSION_STORAGE_KEY_PREFIX, session, user)
}

function clearPersistedConsultantSession(user) {
  if (!canUseStorage()) {
    return
  }

  window.sessionStorage.removeItem(getScopedStorageKey(CONSULTANT_SESSION_STORAGE_KEY_PREFIX, user))
  window.sessionStorage.removeItem(CONSULTANT_SESSION_STORAGE_KEY_PREFIX)
}

export {
  clearPersistedConsultantSession,
  CONSULTANT_SESSION_STORAGE_KEY_PREFIX,
  readPersistedConsultantSession,
  writePersistedConsultantSession,
}
