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

export function buildProductPricing(product) {
  if (!product) return { discountPercent: 0, originalPrice: 0, discountAmount: 0 }

  const productId = getProductId(product)
  const normalizedSeed = Number.parseInt(productId.replace(/\D/g, ''), 10) || product.name?.length || 7
  const discountPercent = 5 + (normalizedSeed % 6)
  const originalPrice = Math.ceil(product.price / (1 - discountPercent / 100) / 10000) * 10000

  return {
    discountPercent,
    originalPrice,
    discountAmount: originalPrice - product.price,
  }
}
