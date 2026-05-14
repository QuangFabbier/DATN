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
  const storedProfile = readStorageJSON(PROFILE_STORAGE_KEY, null)

  if (!storedProfile || typeof storedProfile !== 'object') {
    return defaultProfile
  }

  return {
    ...defaultProfile,
    ...storedProfile,
  }
}

export function saveProfile(profileData) {
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

  writeStorageJSON(PROFILE_STORAGE_KEY, normalizedProfile)
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

export function getAddresses() {
  const storedAddresses = readStorageJSON(ADDRESS_STORAGE_KEY, [])
  return normalizeAddresses(storedAddresses)
}

export function saveAddresses(addresses) {
  const normalizedAddresses = normalizeAddresses(addresses)
  writeStorageJSON(ADDRESS_STORAGE_KEY, normalizedAddresses)
  return normalizedAddresses
}

export function getNotifications() {
  const storedNotifications = readStorageJSON(NOTIFICATION_STORAGE_KEY, {})

  return {
    ...defaultNotifications,
    ...(typeof storedNotifications === 'object' && storedNotifications ? storedNotifications : {}),
  }
}

export function saveNotifications(notifications) {
  const nextNotifications = {
    ...defaultNotifications,
    ...(typeof notifications === 'object' && notifications ? notifications : {}),
  }

  writeStorageJSON(NOTIFICATION_STORAGE_KEY, nextNotifications)
  return nextNotifications
}

export function getAIPreferences() {
  const storedPreferences = readStorageJSON(AI_PREFERENCE_STORAGE_KEY, {})

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

export function saveAIPreferences(preferences) {
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

  writeStorageJSON(AI_PREFERENCE_STORAGE_KEY, normalizedPreferences)
  return normalizedPreferences
}

export function getAppearancePreferences() {
  const storedPreferences = readStorageJSON(APPEARANCE_STORAGE_KEY, {})

  return {
    ...defaultAppearancePreferences,
    ...(typeof storedPreferences === 'object' && storedPreferences ? storedPreferences : {}),
  }
}

export function saveAppearancePreferences(preferences) {
  const normalizedPreferences = {
    compactMode: Boolean(preferences?.compactMode),
    reduceMotion: Boolean(preferences?.reduceMotion),
  }

  writeStorageJSON(APPEARANCE_STORAGE_KEY, normalizedPreferences)
  return normalizedPreferences
}

export function getSecurityState() {
  const storedState = readStorageJSON(SECURITY_STORAGE_KEY, {})

  return {
    password: String(storedState?.password || ''),
    updatedAt: String(storedState?.updatedAt || ''),
  }
}

export function saveSecurityState(securityState) {
  const normalizedState = {
    password: String(securityState?.password || ''),
    updatedAt: String(securityState?.updatedAt || ''),
  }

  writeStorageJSON(SECURITY_STORAGE_KEY, normalizedState)
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
