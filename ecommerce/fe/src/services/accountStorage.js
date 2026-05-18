const PROFILE_STORAGE_KEY = 'nexora_profile'
const ADDRESS_STORAGE_KEY = 'nexora_addresses'
const NOTIFICATION_STORAGE_KEY = 'nexora_notifications'
const AI_PREFERENCE_STORAGE_KEY = 'nexora_ai_preferences'
const APPEARANCE_STORAGE_KEY = 'nexora_appearance'
const SECURITY_STORAGE_KEY = 'nexora_security'
const ORDER_STORAGE_KEY = 'nexora_orders'

const defaultNotifications = {
  emailNotifications: true,
  promotions: true,
  orderUpdates: true,
  aiRecommendations: true,
  securityAlerts: true,
}

const defaultAIPreferences = {
  interests: [],
  favoriteCategories: [],
  budgetPreference: '',
  shoppingPriorities: [],
}

const defaultAppearancePreferences = {
  compactMode: false,
  reduceMotion: false,
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStorageJSON(key, fallbackValue) {
  if (!canUseStorage()) {
    return fallbackValue
  }

  const storedValue = window.localStorage.getItem(key)

  if (!storedValue) {
    return fallbackValue
  }

  try {
    return JSON.parse(storedValue)
  } catch {
    window.localStorage.removeItem(key)
    return fallbackValue
  }
}

function writeStorageJSON(key, value) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function getCurrentUserFromStorage() {
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
}

function normalizeScopeSegment(rawValue) {
  return String(rawValue || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
}

function resolveStorageScope(user = null) {
  const resolvedUser = user && typeof user === 'object' ? user : getCurrentUserFromStorage()

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
  const { key } = resolveStorageScope(user)
  return `${baseKey}::${key}`
}

function readScopedStorageJSON(baseKey, fallbackValue, user = null) {
  const scope = resolveStorageScope(user)
  const scopedStorageKey = getScopedStorageKey(baseKey, user)
  const scopedValue = readStorageJSON(scopedStorageKey, null)

  if (scopedValue !== null) {
    return scopedValue
  }

  // Guest vẫn đọc key cũ để không mất dữ liệu local đã có từ trước.
  if (scope.isGuest) {
    return readStorageJSON(baseKey, fallbackValue)
  }

  return fallbackValue
}

function writeScopedStorageJSON(baseKey, value, user = null) {
  const scope = resolveStorageScope(user)
  const scopedStorageKey = getScopedStorageKey(baseKey, user)

  writeStorageJSON(scopedStorageKey, value)

  // Guest vẫn ghi key cũ để tương thích ngược với dữ liệu/flow hiện tại.
  if (scope.isGuest) {
    writeStorageJSON(baseKey, value)
  }
}

function createEntityId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getDefaultProfile(user = null) {
  return {
    fullName: String(user?.name || '').trim(),
    displayName: String(user?.username || user?.name || '').trim(),
    email: String(user?.email || '').trim(),
    phone: '',
    gender: '',
    birthday: '',
    bio: '',
    defaultAddress: '',
    avatar: '',
  }
}

export function getProfile(user = null) {
  const defaultProfile = getDefaultProfile(user)
  const storedProfile = readScopedStorageJSON(PROFILE_STORAGE_KEY, null, user)

  if (!storedProfile || typeof storedProfile !== 'object') {
    return defaultProfile
  }

  return {
    ...defaultProfile,
    ...storedProfile,
  }
}

export function saveProfile(profileData, user = null) {
  const normalizedProfile = {
    fullName: String(profileData?.fullName || '').trim(),
    displayName: String(profileData?.displayName || '').trim(),
    email: String(profileData?.email || '').trim(),
    phone: String(profileData?.phone || '').trim(),
    gender: String(profileData?.gender || '').trim(),
    birthday: String(profileData?.birthday || '').trim(),
    bio: String(profileData?.bio || '').trim(),
    defaultAddress: String(profileData?.defaultAddress || '').trim(),
    avatar: String(profileData?.avatar || '').trim(),
  }

  writeScopedStorageJSON(PROFILE_STORAGE_KEY, normalizedProfile, user)
  return normalizedProfile
}

function sanitizeAddress(address, index = 0) {
  if (!address || typeof address !== 'object') {
    return null
  }

  const now = new Date().toISOString()

  return {
    id: String(address.id || createEntityId('addr')),
    fullName: String(address.fullName || '').trim(),
    phone: String(address.phone || '').trim(),
    city: String(address.city || '').trim(),
    district: String(address.district || '').trim(),
    ward: String(address.ward || '').trim(),
    detail: String(address.detail || '').trim(),
    isDefault: Boolean(address.isDefault),
    createdAt: String(address.createdAt || now),
    updatedAt: String(address.updatedAt || now),
    sortOrder: Number.isFinite(Number(address.sortOrder)) ? Number(address.sortOrder) : index,
  }
}

function normalizeAddresses(addresses) {
  const normalizedAddresses = Array.isArray(addresses)
    ? addresses.map((address, index) => sanitizeAddress(address, index)).filter(Boolean)
    : []

  if (normalizedAddresses.length === 0) {
    return normalizedAddresses
  }

  const hasDefault = normalizedAddresses.some((address) => address.isDefault)

  if (!hasDefault) {
    normalizedAddresses[0].isDefault = true
  }

  return normalizedAddresses
}

export function getAddresses(user = null) {
  const storedAddresses = readScopedStorageJSON(ADDRESS_STORAGE_KEY, [], user)
  return normalizeAddresses(storedAddresses)
}

export function saveAddresses(addresses, user = null) {
  const normalizedAddresses = normalizeAddresses(addresses)
  writeScopedStorageJSON(ADDRESS_STORAGE_KEY, normalizedAddresses, user)
  return normalizedAddresses
}

export function getNotifications(user = null) {
  const storedNotifications = readScopedStorageJSON(NOTIFICATION_STORAGE_KEY, {}, user)

  return {
    ...defaultNotifications,
    ...(typeof storedNotifications === 'object' && storedNotifications ? storedNotifications : {}),
  }
}

export function saveNotifications(notifications, user = null) {
  const nextNotifications = {
    ...defaultNotifications,
    ...(typeof notifications === 'object' && notifications ? notifications : {}),
  }

  writeScopedStorageJSON(NOTIFICATION_STORAGE_KEY, nextNotifications, user)
  return nextNotifications
}

export function getAIPreferences(user = null) {
  const storedPreferences = readScopedStorageJSON(AI_PREFERENCE_STORAGE_KEY, {}, user)

  const mergedPreferences = {
    ...defaultAIPreferences,
    ...(typeof storedPreferences === 'object' && storedPreferences ? storedPreferences : {}),
  }

  return {
    ...mergedPreferences,
    interests: Array.isArray(mergedPreferences.interests) ? mergedPreferences.interests : [],
    favoriteCategories: Array.isArray(mergedPreferences.favoriteCategories)
      ? mergedPreferences.favoriteCategories
      : [],
    shoppingPriorities: Array.isArray(mergedPreferences.shoppingPriorities)
      ? mergedPreferences.shoppingPriorities
      : [],
    budgetPreference: String(mergedPreferences.budgetPreference || ''),
  }
}

export function saveAIPreferences(preferences, user = null) {
  const normalizedPreferences = {
    interests: Array.isArray(preferences?.interests) ? preferences.interests : [],
    favoriteCategories: Array.isArray(preferences?.favoriteCategories)
      ? preferences.favoriteCategories
      : [],
    budgetPreference: String(preferences?.budgetPreference || ''),
    shoppingPriorities: Array.isArray(preferences?.shoppingPriorities)
      ? preferences.shoppingPriorities
      : [],
  }

  writeScopedStorageJSON(AI_PREFERENCE_STORAGE_KEY, normalizedPreferences, user)
  return normalizedPreferences
}

export function getAppearancePreferences(user = null) {
  const storedPreferences = readScopedStorageJSON(APPEARANCE_STORAGE_KEY, {}, user)

  return {
    ...defaultAppearancePreferences,
    ...(typeof storedPreferences === 'object' && storedPreferences ? storedPreferences : {}),
  }
}

export function saveAppearancePreferences(preferences, user = null) {
  const normalizedPreferences = {
    compactMode: Boolean(preferences?.compactMode),
    reduceMotion: Boolean(preferences?.reduceMotion),
  }

  writeScopedStorageJSON(APPEARANCE_STORAGE_KEY, normalizedPreferences, user)
  return normalizedPreferences
}

export function getSecurityState(user = null) {
  const storedState = readScopedStorageJSON(SECURITY_STORAGE_KEY, {}, user)

  return {
    password: String(storedState?.password || ''),
    updatedAt: String(storedState?.updatedAt || ''),
  }
}

export function saveSecurityState(securityState, user = null) {
  const normalizedState = {
    password: String(securityState?.password || ''),
    updatedAt: String(securityState?.updatedAt || ''),
  }

  writeScopedStorageJSON(SECURITY_STORAGE_KEY, normalizedState, user)
  return normalizedState
}

function createMockOrders(products = []) {
  if (!Array.isArray(products) || products.length === 0) {
    return []
  }

  const normalizedProducts = products.filter(Boolean).slice(0, 8)

  if (normalizedProducts.length === 0) {
    return []
  }

  const now = Date.now()
  const orderBlueprints = [
    {
      code: 'NXR-260501-001',
      status: 'completed',
      daysAgo: 12,
      items: [
        { productIndex: 0, quantity: 1 },
        { productIndex: 3, quantity: 2 },
      ],
    },
    {
      code: 'NXR-260507-014',
      status: 'shipping',
      daysAgo: 7,
      items: [
        { productIndex: 1, quantity: 1 },
      ],
    },
    {
      code: 'NXR-260510-019',
      status: 'pending',
      daysAgo: 3,
      items: [
        { productIndex: 2, quantity: 1 },
        { productIndex: 4, quantity: 1 },
      ],
    },
    {
      code: 'NXR-260511-023',
      status: 'cancelled',
      daysAgo: 2,
      items: [
        { productIndex: 5, quantity: 1 },
      ],
    },
  ]

  return orderBlueprints
    .map((order) => {
      const orderItems = order.items
        .map((item) => {
          const matchedProduct = normalizedProducts[item.productIndex % normalizedProducts.length]

          if (!matchedProduct) {
            return null
          }

          const price = Math.max(0, Number(matchedProduct.price) || 0)

          return {
            id: String(matchedProduct.id),
            name: String(matchedProduct.name || 'Sản phẩm Nexora'),
            image: String(matchedProduct.image || ''),
            price,
            quantity: Math.max(1, Number(item.quantity) || 1),
          }
        })
        .filter(Boolean)

      if (orderItems.length === 0) {
        return null
      }

      const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

      return {
        id: createEntityId('order'),
        code: order.code,
        date: new Date(now - order.daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        status: order.status,
        total,
        items: orderItems,
      }
    })
    .filter(Boolean)
}

export function getOrders() {
  const storedOrders = readStorageJSON(ORDER_STORAGE_KEY, null)

  if (!Array.isArray(storedOrders)) {
    return []
  }

  return storedOrders
}

export function seedOrdersFromProducts(products = []) {
  const currentOrders = getOrders()

  if (currentOrders.length > 0) {
    return currentOrders
  }

  const mockOrders = createMockOrders(products)

  if (mockOrders.length > 0) {
    writeStorageJSON(ORDER_STORAGE_KEY, mockOrders)
  }

  return mockOrders
}

export {
  ADDRESS_STORAGE_KEY,
  AI_PREFERENCE_STORAGE_KEY,
  APPEARANCE_STORAGE_KEY,
  NOTIFICATION_STORAGE_KEY,
  ORDER_STORAGE_KEY,
  PROFILE_STORAGE_KEY,
  SECURITY_STORAGE_KEY,
}
