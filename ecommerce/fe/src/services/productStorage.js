import allProducts from '../data/all-products.json'
import { getProductId, getProductImages, normalizeProduct } from '../utils/product'

export const PRODUCT_STORAGE_KEY = 'datn_products_v2'
const LEGACY_PRODUCT_STORAGE_KEYS = ['datn_products']
export const PRODUCT_PLACEHOLDER_IMAGE =
  'https://placehold.co/600x400/e2e8f0/475569?text=No+Image'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function createProductId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeDate(value, fallbackTimestamp) {
  const parsedDate = value ? new Date(value) : null

  if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString()
  }

  return new Date(fallbackTimestamp).toISOString()
}

function sanitizeProductRecord(product, index = 0) {
  const normalizedProduct = normalizeProduct(product)

  if (!normalizedProduct) {
    return null
  }

  const now = Date.now()
  const fallbackTimestamp = now - index * 1000
  const productId = getProductId(normalizedProduct) || createProductId()
  const name = String(normalizedProduct.name || '').trim()
  const category = String(normalizedProduct.category || '').trim()
  const brand = String(normalizedProduct.brand || '').trim()
  const image = String(normalizedProduct.image || '').trim() || PRODUCT_PLACEHOLDER_IMAGE
  const images = Array.isArray(normalizedProduct.images) && normalizedProduct.images.length > 0
    ? normalizedProduct.images
    : getProductImages({
        ...product,
        image,
        images: Array.isArray(product?.images) ? product.images : undefined,
      })
  const description = String(normalizedProduct.description || '').trim()
  const price = Math.max(0, Number(normalizedProduct.price) || 0)
  const stock = Math.max(0, Number(normalizedProduct.stock) || 0)

  return {
    ...normalizedProduct,
    id: productId,
    name,
    category,
    brand,
    image,
    images,
    description,
    price,
    stock,
    createdAt: normalizeDate(product?.createdAt, fallbackTimestamp),
    updatedAt: normalizeDate(product?.updatedAt, now),
  }
}

function getSeedProducts() {
  return allProducts.map((product, index) => sanitizeProductRecord(product, index)).filter(Boolean)
}

function clearLegacyProductStorage() {
  if (!canUseStorage()) {
    return
  }

  for (const key of LEGACY_PRODUCT_STORAGE_KEYS) {
    window.localStorage.removeItem(key)
  }
}

function readStoredProducts() {
  if (!canUseStorage()) {
    return getSeedProducts()
  }

  clearLegacyProductStorage()

  const storedProducts = window.localStorage.getItem(PRODUCT_STORAGE_KEY)

  if (!storedProducts) {
    return null
  }

  try {
    const parsedProducts = JSON.parse(storedProducts)

    if (!Array.isArray(parsedProducts)) {
      window.localStorage.removeItem(PRODUCT_STORAGE_KEY)
      return null
    }

    return parsedProducts.map((product, index) => sanitizeProductRecord(product, index)).filter(Boolean)
  } catch {
    window.localStorage.removeItem(PRODUCT_STORAGE_KEY)
    return null
  }
}

function persistProducts(products) {
  if (!canUseStorage()) {
    return products
  }

  window.localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(products))
  return products
}

export function ensureProductStorage() {
  const storedProducts = readStoredProducts()

  if (storedProducts !== null) {
    return storedProducts
  }

  const seedProducts = getSeedProducts()
  persistProducts(seedProducts)

  return seedProducts
}

export async function readProducts() {
  return ensureProductStorage()
}

export async function readProductById(productId) {
  const products = ensureProductStorage()
  const product = products.find((item) => item.id === String(productId))

  if (!product) {
    const error = new Error('Không tìm thấy sản phẩm')
    error.response = { status: 404 }
    throw error
  }

  return product
}

export async function createProductRecord(productData) {
  const products = ensureProductStorage()
  const newProduct = sanitizeProductRecord(
    {
      ...productData,
      id: createProductId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    0,
  )

  const nextProducts = persistProducts([newProduct, ...products])

  return {
    product: newProduct,
    products: nextProducts,
  }
}

export async function updateProductRecord(productId, productData) {
  const products = ensureProductStorage()
  const normalizedProductId = String(productId)
  const currentProduct = products.find((item) => item.id === normalizedProductId)

  if (!currentProduct) {
    const error = new Error('Không tìm thấy sản phẩm để cập nhật')
    error.response = { status: 404 }
    throw error
  }

  const updatedProduct = sanitizeProductRecord(
    {
      ...currentProduct,
      ...productData,
      id: currentProduct.id,
      createdAt: currentProduct.createdAt,
      updatedAt: new Date().toISOString(),
    },
    0,
  )

  const nextProducts = persistProducts(
    products.map((item) => (item.id === normalizedProductId ? updatedProduct : item)),
  )

  return {
    product: updatedProduct,
    products: nextProducts,
  }
}

export async function deleteProductRecord(productId) {
  const products = ensureProductStorage()
  const normalizedProductId = String(productId)
  const deletedProduct = products.find((item) => item.id === normalizedProductId)

  if (!deletedProduct) {
    const error = new Error('Không tìm thấy sản phẩm để xóa')
    error.response = { status: 404 }
    throw error
  }

  const nextProducts = persistProducts(products.filter((item) => item.id !== normalizedProductId))

  return {
    product: deletedProduct,
    products: nextProducts,
  }
}
