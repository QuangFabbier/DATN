import mongoose from 'mongoose'
import Product from '../models/Product.js'
import asyncHandler from '../utils/asyncHandler.js'

function normalizeImageList(images, fallbackImage = '') {
  if (!Array.isArray(images)) {
    return fallbackImage ? [fallbackImage] : []
  }

  const normalizedImages = images
    .map((image) => String(image || '').trim())
    .filter(Boolean)

  if (normalizedImages.length > 0) {
    return normalizedImages
  }

  return fallbackImage ? [fallbackImage] : []
}

function normalizeSpecs(specs) {
  if (!Array.isArray(specs)) {
    return []
  }

  return specs
    .map((spec) => ({
      label: String(spec?.label || '').trim(),
      value: String(spec?.value || '').trim(),
    }))
    .filter((spec) => spec.label || spec.value)
}

function normalizeStringList(values) {
  if (!Array.isArray(values)) {
    return []
  }

  return [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))]
}

function normalizeTextFold(value = '') {
  return String(value || '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferBrandFromName(name = '') {
  return String(name || '').trim().split(/\s+/g).find(Boolean) || ''
}

function buildSearchableText(payload = {}, fallback = {}) {
  const specsSource = Array.isArray(payload.specs) ? payload.specs : Array.isArray(fallback.specs) ? fallback.specs : []
  const specsText = specsSource
    .map((spec) => `${String(spec?.label || '').trim()} ${String(spec?.value || '').trim()}`.trim())
    .filter(Boolean)
    .join(' ')

  const tagsSource = Array.isArray(payload.tags) ? payload.tags : Array.isArray(fallback.tags) ? fallback.tags : []
  const useCasesSource = Array.isArray(payload.useCases)
    ? payload.useCases
    : Array.isArray(fallback.useCases)
      ? fallback.useCases
      : []

  return normalizeTextFold(
    [
      payload.name || fallback.name,
      payload.category || fallback.category,
      payload.brand || fallback.brand,
      payload.description || fallback.description,
      tagsSource.join(' '),
      useCasesSource.join(' '),
      specsText,
    ]
      .filter(Boolean)
      .join(' '),
  )
}

function buildProductPayload(body = {}) {
  const payload = {}

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    payload.name = String(body.name || '').trim()
  }

  if (Object.prototype.hasOwnProperty.call(body, 'category')) {
    payload.category = String(body.category || '').trim()
  }

  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    payload.description = String(body.description || '').trim()
  }

  if (Object.prototype.hasOwnProperty.call(body, 'brand')) {
    payload.brand = String(body.brand || '').trim()
  }

  if (Object.prototype.hasOwnProperty.call(body, 'price')) {
    payload.price = Number(body.price)
  }

  if (Object.prototype.hasOwnProperty.call(body, 'stock')) {
    payload.stock = Number(body.stock)
  }

  if (Object.prototype.hasOwnProperty.call(body, 'image')) {
    payload.image = String(body.image || '').trim()
  }

  if (Object.prototype.hasOwnProperty.call(body, 'images')) {
    payload.images = normalizeImageList(body.images, payload.image)
  } else if (Object.prototype.hasOwnProperty.call(body, 'image')) {
    payload.images = normalizeImageList([], payload.image)
  }

  if (Object.prototype.hasOwnProperty.call(body, 'specs')) {
    payload.specs = normalizeSpecs(body.specs)
  }

  if (Object.prototype.hasOwnProperty.call(body, 'tags')) {
    payload.tags = normalizeStringList(body.tags)
  }

  if (Object.prototype.hasOwnProperty.call(body, 'useCases')) {
    payload.useCases = normalizeStringList(body.useCases)
  }

  return payload
}

function ensureValidObjectId(productId) {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    const error = new Error('Invalid product id')
    error.statusCode = 400
    throw error
  }
}

const getProducts = asyncHandler(async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 })
    res.status(200).json(products)
  } catch {
    res.status(500)
    throw new Error('Failed to fetch products')
  }
})

const getProductById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params
    ensureValidObjectId(id)

    const product = await Product.findById(id)

    if (!product) {
      res.status(404)
      throw new Error('Product not found')
    }

    res.status(200).json(product)
  } catch (error) {
    if (error.statusCode || res.statusCode === 404) {
      throw error
    }

    res.status(500)
    throw new Error('Failed to fetch product')
  }
})

const createProduct = asyncHandler(async (req, res) => {
  try {
    const payload = buildProductPayload(req.body)

    if (!payload.images?.length && payload.image) {
      payload.images = [payload.image]
    }

    if (!payload.brand) {
      payload.brand = inferBrandFromName(payload.name)
    }

    payload.searchableText = buildSearchableText(payload)

    const product = await Product.create(payload)
    res.status(201).json(product)
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400)
      throw new Error(error.message)
    }

    res.status(500)
    throw new Error('Failed to create product')
  }
})

const updateProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params
    ensureValidObjectId(id)

    const existingProduct = await Product.findById(id)

    if (!existingProduct) {
      res.status(404)
      throw new Error('Product not found')
    }

    const payload = buildProductPayload(req.body)

    if (!payload.images && Object.prototype.hasOwnProperty.call(payload, 'image')) {
      payload.images = normalizeImageList(existingProduct.images, payload.image)
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'name') || Object.prototype.hasOwnProperty.call(payload, 'brand')) {
      payload.brand = String(payload.brand || existingProduct.brand || inferBrandFromName(payload.name || existingProduct.name || '')).trim()
    }

    payload.searchableText = buildSearchableText(payload, existingProduct)

    const updatedProduct = await Product.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })

    res.status(200).json(updatedProduct)
  } catch (error) {
    if (error.statusCode || res.statusCode === 404) {
      throw error
    }

    if (error.name === 'ValidationError') {
      res.status(400)
      throw new Error(error.message)
    }

    res.status(500)
    throw new Error('Failed to update product')
  }
})

const deleteProduct = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params
    ensureValidObjectId(id)

    const product = await Product.findById(id)

    if (!product) {
      res.status(404)
      throw new Error('Product not found')
    }

    await product.deleteOne()

    res.status(200).json({ message: 'Product deleted successfully' })
  } catch (error) {
    if (error.statusCode || res.statusCode === 404) {
      throw error
    }

    res.status(500)
    throw new Error('Failed to delete product')
  }
})

export { getProducts, getProductById, createProduct, updateProduct, deleteProduct }

