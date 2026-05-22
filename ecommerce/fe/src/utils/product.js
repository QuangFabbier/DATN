import { getFlashSaleDiscountPercent } from './flashSale'

export const PRODUCT_PLACEHOLDER_IMAGE =
  'https://placehold.co/600x400/e2e8f0/475569?text=No+Image'

export function getProductId(product) {
  if (!product || typeof product !== 'object') {
    return ''
  }

  return String(product._id || product.id || '')
}

function buildProductGalleryImage(product, index) {
  const label = encodeURIComponent(product?.name || product?.category || 'Nexora')
  const palette = [
    ['e8f1ff', '1f3a5f'],
    ['fff4e8', '9a4a00'],
    ['f0fdf4', '166534'],
  ]
  const [background, foreground] = palette[index % palette.length]

  return `https://placehold.co/800x800/${background}/${foreground}?text=${label}+${index + 1}`
}

export function getProductImages(product) {
  if (!product || typeof product !== 'object') {
    return [PRODUCT_PLACEHOLDER_IMAGE]
  }

  const explicitImages = Array.isArray(product.images)
    ? product.images.map((image) => String(image || '').trim()).filter(Boolean)
    : []

  if (explicitImages.length > 0) {
    return explicitImages
  }

  const primaryImage = String(product.image || '').trim()

  if (!primaryImage) {
    return [PRODUCT_PLACEHOLDER_IMAGE]
  }

  return [primaryImage, buildProductGalleryImage(product, 1), buildProductGalleryImage(product, 2)]
}

export function getProductStock(product) {
  const stock = Number(product?.stock)

  if (!Number.isFinite(stock) || stock < 0) {
    return null
  }

  return stock
}

function readFirstValidNumber(values) {
  for (const value of values) {
    const normalizedValue = Number(value)
    if (Number.isFinite(normalizedValue) && normalizedValue >= 0) {
      return Math.round(normalizedValue)
    }
  }

  return null
}

function getStableProductSeed(product) {
  const source = `${getProductId(product)}-${String(product?.name || '')}`
  return Array.from(source).reduce((seed, character) => seed + character.charCodeAt(0), 0)
}

export function getProductSoldCount(product) {
  const explicitSoldCount = readFirstValidNumber([
    product?.sold,
    product?.soldCount,
    product?.soldQuantity,
    product?.salesCount,
  ])

  if (explicitSoldCount !== null) {
    return explicitSoldCount
  }

  const stock = getProductStock(product)
  const seed = getStableProductSeed(product)
  const baselineSoldCount = (seed % 21) + 6

  if (stock === null) {
    return baselineSoldCount
  }

  return baselineSoldCount + Math.max(0, Math.floor(stock * 0.7))
}

export function getProductSalesProgress(product) {
  const soldCount = getProductSoldCount(product)
  const stock = getProductStock(product)
  const explicitTotalCount = readFirstValidNumber([
    product?.totalQuantity,
    product?.totalStock,
    product?.initialStock,
    product?.importQuantity,
  ])

  const totalCount =
    explicitTotalCount !== null
      ? explicitTotalCount
      : stock !== null
        ? soldCount + stock
        : soldCount + 20

  const normalizedTotalCount = Math.max(1, totalCount)
  const normalizedSoldCount = Math.min(normalizedTotalCount, Math.max(0, soldCount))
  const soldRatio = normalizedSoldCount / normalizedTotalCount

  return {
    soldCount: normalizedSoldCount,
    totalCount: normalizedTotalCount,
    soldRatio,
  }
}

export function normalizeProduct(product) {
  if (!product || typeof product !== 'object') {
    return null
  }

  const productId = getProductId(product)
  const stock = getProductStock(product)
  const price = Number(product.price)
  const normalizedImages = getProductImages(product)
  const primaryImage = normalizedImages[0] || PRODUCT_PLACEHOLDER_IMAGE

  return {
    ...product,
    id: productId || product.id,
    image: primaryImage,
    images: normalizedImages,
    stock,
    price: Number.isFinite(price) ? price : 0,
  }
}

export function buildProductPricing(product, flashSaleCampaign = null) {
  if (!product) return { discountPercent: 0, originalPrice: 0, discountAmount: 0 }

  const normalizedPrice = Number(product.price)
  const currentPrice = Number.isFinite(normalizedPrice) ? Math.max(0, normalizedPrice) : 0
  const discountPercent = getFlashSaleDiscountPercent(product, flashSaleCampaign)

  if (discountPercent <= 0 || currentPrice <= 0) {
    return {
      discountPercent: 0,
      originalPrice: currentPrice,
      discountAmount: 0,
    }
  }

  const originalPrice = Math.ceil(currentPrice / (1 - discountPercent / 100) / 1000) * 1000
  const discountAmount = Math.max(0, originalPrice - currentPrice)

  return {
    discountPercent,
    originalPrice,
    discountAmount,
  }
}
