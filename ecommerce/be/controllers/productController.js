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
