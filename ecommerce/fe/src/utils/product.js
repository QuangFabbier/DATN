import { getFlashSaleDiscountPercent } from './flashSale'

export const PRODUCT_PLACEHOLDER_IMAGE =
  'https://placehold.co/600x400/e2e8f0/475569?text=No+Image'

const CATEGORY_ALIASES = new Map(
  Object.entries({
    laptop: 'Laptop',
    'dien thoai': 'Phone',
    phone: 'Phone',
    smartphone: 'Phone',
    mobile: 'Phone',
    'may tinh bang': 'Tablet',
    tablet: 'Tablet',
    smartwatch: 'Smartwatch',
    'tai nghe': 'Headphones',
    headphone: 'Headphones',
    headphones: 'Headphones',
    earbud: 'Headphones',
    audio: 'Headphones',
    'am thanh': 'Headphones',
    mouse: 'Mouse',
    keyboard: 'Keyboard',
    monitor: 'Monitor',
    'man hinh': 'Monitor',
    ssd: 'SSD',
    ram: 'RAM',
    charger: 'Charger',
    'charging cable': 'Charging Cable',
    'charging-cable': 'Charging Cable',
    charging_cable: 'Charging Cable',
    'charger wire': 'Charging Cable',
    'charger-wire': 'Charging Cable',
    'charger_wire': 'Charging Cable',
    'cap sac': 'Charging Cable',
    'sac du phong': 'Power Bank',
    'power bank': 'Power Bank',
    router: 'Router',
    tai_nghe: 'Headphones',
    tainghe: 'Headphones',
  }),
)

const CATEGORY_LABELS_VI = new Map(
  Object.entries({
    Laptop: 'Laptop',
    Phone: 'Điện thoại',
    Tablet: 'Máy tính bảng',
    Smartwatch: 'Đồng hồ thông minh',
    Headphones: 'Tai nghe',
    Monitor: 'Màn hình',
    Mouse: 'Chuột',
    Keyboard: 'Bàn phím',
    SSD: 'SSD',
    RAM: 'RAM',
    Charger: 'Củ sạc',
    'Charging Cable': 'Cáp sạc',
    'Power Bank': 'Sạc dự phòng',
    Router: 'Router',
  }),
)

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeTextFold(value = '') {
  return normalizeText(value)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCategory(value = '') {
  const normalizedValue = normalizeText(value)
  if (!normalizedValue) {
    return ''
  }

  return CATEGORY_ALIASES.get(normalizeTextFold(normalizedValue)) || normalizedValue
}

export function normalizeProductCategory(value = '') {
  return normalizeCategory(value)
}

export function getProductCategoryLabel(value = '') {
  const normalizedCategory = normalizeCategory(value)
  if (!normalizedCategory) {
    return ''
  }

  return CATEGORY_LABELS_VI.get(normalizedCategory) || normalizedCategory
}

function normalizeSpecLabel(label = '') {
  const normalizedLabel = normalizeText(label)
  if (!normalizedLabel) {
    return ''
  }

  const overrides = {
    cpu: 'CPU',
    gpu: 'GPU',
    ram: 'RAM',
    ssd: 'SSD',
    hdd: 'HDD',
    storage: 'Storage',
    display: 'Display',
    screen: 'Screen',
    'refresh rate': 'Refresh Rate',
    battery: 'Battery',
    chip: 'Chip',
    camera: 'Camera',
    weight: 'Weight',
    'operating system': 'Operating System',
    os: 'Operating System',
    color: 'Color',
    bluetooth: 'Bluetooth',
    wifi: 'Wi-Fi',
    ports: 'Ports',
    dimensions: 'Dimensions',
  }

  const humanizedLabel = normalizedLabel.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')
  const foldedLabel = normalizeTextFold(humanizedLabel)

  if (overrides[foldedLabel]) {
    return overrides[foldedLabel]
  }

  return humanizedLabel
    .split(/\s+/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function normalizeSpecifications(specifications = {}) {
  if (Array.isArray(specifications)) {
    return specifications
      .map((spec) => ({
        label: normalizeSpecLabel(spec?.label),
        value: normalizeText(spec?.value),
      }))
      .filter((spec) => spec.label || spec.value)
  }

  if (!specifications || typeof specifications !== 'object') {
    return []
  }

  return Object.entries(specifications)
    .map(([label, value]) => ({
      label: normalizeSpecLabel(label),
      value: normalizeText(Array.isArray(value) ? value.join(', ') : value),
    }))
    .filter((spec) => spec.label || spec.value)
}

export function getProductSpecifications(product) {
  if (!product || typeof product !== 'object') {
    return []
  }

  const sourceSpecifications = Array.isArray(product.specs) && product.specs.length > 0 ? product.specs : product.specifications
  return normalizeSpecifications(sourceSpecifications)
}

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

function normalizeImageEntries(images = []) {
  const normalizedImages = Array.isArray(images)
    ? images.map((image) => String(image || '').trim()).filter(Boolean)
    : []

  const mergedImages = []

  for (let index = 0; index < normalizedImages.length; index += 1) {
    const currentImage = normalizedImages[index]
    const nextImage = normalizedImages[index + 1]

    if (
      currentImage.startsWith('data:') &&
      !currentImage.includes(',') &&
      nextImage &&
      !nextImage.startsWith('data:')
    ) {
      mergedImages.push(`${currentImage},${nextImage}`)
      index += 1
      continue
    }

    mergedImages.push(currentImage)
  }

  return [...new Set(mergedImages)].filter(Boolean)
}

export function getProductImages(product) {
  if (!product || typeof product !== 'object') {
    return [PRODUCT_PLACEHOLDER_IMAGE]
  }

  const explicitImages = normalizeImageEntries(product.images)

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
  const name = normalizeText(product.name)
  const category = normalizeCategory(product.category)
  const brand = normalizeText(product.brand) || name.split(/\s+/g).find(Boolean) || ''
  const description = normalizeText(product.description) || (name ? `Sản phẩm ${name} thuộc danh mục ${category || 'chính hãng'}.` : '')
  const specs = getProductSpecifications(product)

  return {
    ...product,
    id: productId || product.id,
    name,
    category,
    brand,
    image: primaryImage,
    images: normalizedImages,
    description,
    stock,
    price: Number.isFinite(price) ? price : 0,
    averageRating: Number.isFinite(Number(product.averageRating)) ? Number(product.averageRating) : 0,
    totalReviews: Number.isFinite(Number(product.totalReviews)) ? Number(product.totalReviews) : 0,
    minStockLevel: Number.isFinite(Number(product.minStockLevel)) ? Number(product.minStockLevel) : 10,
    specs,
    specifications: Array.isArray(product.specifications) ? product.specifications : product.specifications || {},
    ratingBreakdown:
      product.ratingBreakdown && typeof product.ratingBreakdown === 'object'
        ? {
            1: Number(product.ratingBreakdown?.[1] || product.ratingBreakdown?.['1'] || 0),
            2: Number(product.ratingBreakdown?.[2] || product.ratingBreakdown?.['2'] || 0),
            3: Number(product.ratingBreakdown?.[3] || product.ratingBreakdown?.['3'] || 0),
            4: Number(product.ratingBreakdown?.[4] || product.ratingBreakdown?.['4'] || 0),
            5: Number(product.ratingBreakdown?.[5] || product.ratingBreakdown?.['5'] || 0),
          }
        : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    reviewSummary:
      product.reviewSummary && typeof product.reviewSummary === 'object'
        ? {
            text: String(product.reviewSummary?.text || ''),
            highlights: Array.isArray(product.reviewSummary?.highlights) ? product.reviewSummary.highlights : [],
          }
        : { text: '', highlights: [] },
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
