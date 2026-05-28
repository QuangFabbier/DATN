import dotenv from 'dotenv'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import connectDB from '../config/db.js'
import Product from '../models/Product.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const productsJsonPath = path.resolve(__dirname, '../../fe/src/data/products.json')

function normalizeSeedProduct(product) {
  function normalizeText(value = '') {
    return String(value || '').trim()
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

  function normalizeList(values = [], limit = 12) {
    if (!Array.isArray(values)) {
      return []
    }

    return [...new Set(values.map((item) => normalizeText(item)).filter(Boolean))].slice(0, limit)
  }

  const image = String(product?.image || '').trim()
  const hasImages = Array.isArray(product?.images) && product.images.length > 0
  const normalizedImages = hasImages
    ? product.images.map((item) => String(item || '').trim()).filter(Boolean)
    : image
      ? [image]
      : []

  const name = normalizeText(product?.name)
  const category = normalizeText(product?.category)
  const brand = normalizeText(product?.brand) || normalizeText(product?.name).split(/\s+/g).find(Boolean) || ''
  const description = normalizeText(product?.description)
  const specs = Array.isArray(product?.specs)
    ? product.specs
        .map((spec) => ({
          label: String(spec?.label || '').trim(),
          value: String(spec?.value || '').trim(),
        }))
        .filter((spec) => spec.label || spec.value)
    : []

  const tags = normalizeList([
    ...(Array.isArray(product?.tags) ? product.tags : []),
    category,
    brand,
    ...specs.map((spec) => spec.label),
  ])

  const useCases = normalizeList(product?.useCases || [])

  const searchableText = normalizeTextFold(
    [name, category, brand, description, tags.join(' '), useCases.join(' '), specs.map((spec) => `${spec.label} ${spec.value}`).join(' ')]
      .filter(Boolean)
      .join(' '),
  )

  return {
    name,
    category,
    brand,
    description,
    price: Math.max(0, Number(product?.price) || 0),
    stock: Math.max(0, Number(product?.stock) || 0),
    image,
    images: normalizedImages,
    specs,
    tags,
    useCases,
    searchableText,
  }
}

async function seedProducts() {
  try {
    await connectDB()

    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready')
    }

    const fileContent = await readFile(productsJsonPath, 'utf8')
    const parsedProducts = JSON.parse(fileContent)

    if (!Array.isArray(parsedProducts)) {
      throw new Error('Invalid products data format. Expected an array.')
    }

    const normalizedProducts = parsedProducts.map(normalizeSeedProduct)

    await Product.deleteMany({})
    const insertedProducts = await Product.insertMany(normalizedProducts)

    console.log(`Seed success: inserted ${insertedProducts.length} products`)
  } catch (error) {
    console.error(`Seed error: ${error.message}`)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

seedProducts()
