function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeScopeSegment(rawValue) {
  return String(rawValue || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
}

function resolveUserStorageScope(user = null) {
  const resolvedUser =
    user && typeof user === 'object'
      ? user
      : (() => {
          if (!canUseStorage()) {
            return null
          }

          const storedUser = window.localStorage.getItem('user')
          if (!storedUser) {
            return null
          }

          try {
            const parsedUser = JSON.parse(storedUser)
            return parsedUser && typeof parsedUser === 'object' ? parsedUser : null
          } catch {
            return null
          }
        })()

  const rawUserId = resolvedUser?.id || resolvedUser?._id
  const normalizedUserId = normalizeScopeSegment(rawUserId)

  if (normalizedUserId) {
    return {
      key: `user_${normalizedUserId}`,
      isGuest: false,
    }
  }

  const normalizedEmail = normalizeScopeSegment(resolvedUser?.email)
  if (normalizedEmail) {
    return {
      key: `email_${normalizedEmail}`,
      isGuest: false,
    }
  }

  return {
    key: 'guest',
    isGuest: true,
  }
}

function getScopedStorageKey(baseKey, user = null) {
  const { key } = resolveUserStorageScope(user)
  return `${baseKey}::${key}`
}

function readStorageJSON(storage, key, fallbackValue) {
  if (!canUseStorage() || !storage) {
    return fallbackValue
  }

  const storedValue = storage.getItem(key)

  if (!storedValue) {
    return fallbackValue
  }

  try {
    return JSON.parse(storedValue)
  } catch {
    storage.removeItem(key)
    return fallbackValue
  }
}

function writeStorageJSON(storage, key, value) {
  if (!canUseStorage() || !storage) {
    return
  }

  storage.setItem(key, JSON.stringify(value))
}

function readScopedStorageJSON(storage, baseKey, fallbackValue, user = null) {
  const scope = resolveUserStorageScope(user)
  const scopedStorageKey = getScopedStorageKey(baseKey, user)
  const scopedValue = readStorageJSON(storage, scopedStorageKey, null)

  if (scopedValue !== null) {
    return scopedValue
  }

  if (scope.isGuest) {
    return readStorageJSON(storage, baseKey, fallbackValue)
  }

  return fallbackValue
}

function writeScopedStorageJSON(storage, baseKey, value, user = null) {
  const scope = resolveUserStorageScope(user)
  const scopedStorageKey = getScopedStorageKey(baseKey, user)

  writeStorageJSON(storage, scopedStorageKey, value)

  if (scope.isGuest) {
    writeStorageJSON(storage, baseKey, value)
  }
}

export {
  canUseStorage,
  getScopedStorageKey,
  normalizeScopeSegment,
  readScopedStorageJSON,
  readStorageJSON,
  resolveUserStorageScope,
  writeScopedStorageJSON,
  writeStorageJSON,
}
