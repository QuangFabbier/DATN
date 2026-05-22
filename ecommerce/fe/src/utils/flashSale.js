const FLASH_SALE_STORAGE_KEY = 'nexora_flash_sale_campaign'
const FLASH_SALE_DEFAULT_LIMIT = 8
const FLASH_SALE_DURATION_MS = 30 * 60 * 1000
const FLASH_SALE_MIN_DISCOUNT = 8
const FLASH_SALE_MAX_DISCOUNT = 26

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function resolveProductId(product) {
  if (!product || typeof product !== 'object') {
    return ''
  }

  return String(product._id || product.id || '')
}

function normalizeDiscounts(discounts) {
  if (!discounts || typeof discounts !== 'object') {
    return {}
  }

  return Object.entries(discounts).reduce((result, [productId, discountPercent]) => {
    const normalizedProductId = String(productId || '').trim()
    const normalizedDiscountPercent = Number(discountPercent)

    if (!normalizedProductId || !Number.isFinite(normalizedDiscountPercent)) {
      return result
    }

    if (normalizedDiscountPercent <= 0 || normalizedDiscountPercent >= 100) {
      return result
    }

    result[normalizedProductId] = Math.round(normalizedDiscountPercent)
    return result
  }, {})
}

function normalizeCampaign(campaign) {
  if (!campaign || typeof campaign !== 'object') {
    return null
  }

  const createdAt = Number(campaign.createdAt)
  const expiresAt = Number(campaign.expiresAt)
  const slotIndex = Number(campaign.slotIndex)
  const featuredProductIds = Array.isArray(campaign.featuredProductIds)
    ? campaign.featuredProductIds.map((id) => String(id || '').trim()).filter(Boolean)
    : []
  const discounts = normalizeDiscounts(campaign.discounts)

  if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || featuredProductIds.length === 0) {
    return null
  }

  return {
    createdAt,
    expiresAt,
    slotIndex: Number.isFinite(slotIndex) ? slotIndex : Math.floor(createdAt / FLASH_SALE_DURATION_MS),
    featuredProductIds,
    discounts,
  }
}

function readStoredCampaign() {
  if (!canUseStorage()) {
    return null
  }

  const rawCampaign = window.localStorage.getItem(FLASH_SALE_STORAGE_KEY)

  if (!rawCampaign) {
    return null
  }

  try {
    return normalizeCampaign(JSON.parse(rawCampaign))
  } catch {
    window.localStorage.removeItem(FLASH_SALE_STORAGE_KEY)
    return null
  }
}

function writeStoredCampaign(campaign) {
  if (!canUseStorage()) {
    return campaign
  }

  window.localStorage.setItem(FLASH_SALE_STORAGE_KEY, JSON.stringify(campaign))
  return campaign
}

function getTimeSlot(now = Date.now()) {
  const slotIndex = Math.floor(now / FLASH_SALE_DURATION_MS)
  const slotStart = slotIndex * FLASH_SALE_DURATION_MS

  return {
    slotIndex,
    slotStart,
    expiresAt: slotStart + FLASH_SALE_DURATION_MS,
  }
}

function hashString(value) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function normalizeProductsWithIds(products) {
  if (!Array.isArray(products)) {
    return []
  }

  return products
    .map((product) => ({
      product,
      productId: resolveProductId(product),
    }))
    .filter((item) => item.productId)
}

function getDeterministicSelection(productsWithIds, slotIndex, limit) {
  return [...productsWithIds]
    .sort((firstItem, secondItem) => {
      const firstScore = hashString(`${slotIndex}-${firstItem.productId}`)
      const secondScore = hashString(`${slotIndex}-${secondItem.productId}`)

      if (firstScore !== secondScore) {
        return firstScore - secondScore
      }

      return firstItem.productId.localeCompare(secondItem.productId)
    })
    .slice(0, limit)
}

export function getFeaturedProducts(products, limit = FLASH_SALE_DEFAULT_LIMIT, now = Date.now()) {
  const normalizedLimit = Math.max(1, Number(limit) || FLASH_SALE_DEFAULT_LIMIT)
  const productsWithIds = normalizeProductsWithIds(products)
  const { slotIndex } = getTimeSlot(now)

  return getDeterministicSelection(productsWithIds, slotIndex, normalizedLimit).map((item) => item.product)
}

function createDeterministicCampaign(products, limit = FLASH_SALE_DEFAULT_LIMIT, now = Date.now()) {
  const normalizedLimit = Math.max(1, Number(limit) || FLASH_SALE_DEFAULT_LIMIT)
  const productsWithIds = normalizeProductsWithIds(products)

  if (productsWithIds.length === 0) {
    return null
  }

  const { slotIndex, slotStart, expiresAt } = getTimeSlot(now)
  const featuredProducts = getDeterministicSelection(productsWithIds, slotIndex, normalizedLimit)
  const featuredProductIds = featuredProducts.map((item) => item.productId)

  const discounts = featuredProductIds.reduce((result, productId) => {
    const hash = hashString(`discount-${slotIndex}-${productId}`)
    const range = FLASH_SALE_MAX_DISCOUNT - FLASH_SALE_MIN_DISCOUNT + 1
    const discountPercent = FLASH_SALE_MIN_DISCOUNT + (hash % range)
    result[productId] = discountPercent
    return result
  }, {})

  return {
    createdAt: slotStart,
    expiresAt,
    slotIndex,
    featuredProductIds,
    discounts,
  }
}

function isSameCampaign(firstCampaign, secondCampaign) {
  if (!firstCampaign || !secondCampaign) {
    return false
  }

  if (firstCampaign.slotIndex !== secondCampaign.slotIndex) {
    return false
  }

  if (firstCampaign.featuredProductIds.length !== secondCampaign.featuredProductIds.length) {
    return false
  }

  return firstCampaign.featuredProductIds.every(
    (productId, index) => productId === secondCampaign.featuredProductIds[index],
  )
}

export function getOrCreateFlashSaleCampaign(products, options = {}) {
  const limit = Math.max(1, Number(options.limit) || FLASH_SALE_DEFAULT_LIMIT)
  const campaign = createDeterministicCampaign(products, limit)

  if (!campaign) {
    return null
  }

  const storedCampaign = readStoredCampaign()

  if (storedCampaign && isSameCampaign(storedCampaign, campaign)) {
    return storedCampaign
  }

  return writeStoredCampaign(campaign)
}

export function getActiveFlashSaleCampaign() {
  const storedCampaign = readStoredCampaign()

  if (!storedCampaign) {
    return null
  }

  if (storedCampaign.expiresAt <= Date.now()) {
    if (canUseStorage()) {
      window.localStorage.removeItem(FLASH_SALE_STORAGE_KEY)
    }
    return null
  }

  return storedCampaign
}

export function getFlashSaleDiscountPercent(product, flashSaleCampaign = null) {
  const productId = resolveProductId(product)

  if (!productId) {
    return 0
  }

  const campaign = flashSaleCampaign || getActiveFlashSaleCampaign()
  const discountPercent = Number(campaign?.discounts?.[productId] || 0)

  if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100) {
    return 0
  }

  return Math.round(discountPercent)
}

export function getFlashSaleCountdown(expiresAt, now = Date.now()) {
  const normalizedExpiry = Number(expiresAt)
  if (!Number.isFinite(normalizedExpiry)) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      isExpired: true,
    }
  }

  const remainingMs = Math.max(0, normalizedExpiry - now)
  const totalSeconds = Math.floor(remainingMs / 1000)

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return {
    hours,
    minutes,
    seconds,
    totalMs: remainingMs,
    isExpired: remainingMs <= 0,
  }
}

export function formatCountdownUnit(value) {
  return String(Math.max(0, Number(value) || 0)).padStart(2, '0')
}
