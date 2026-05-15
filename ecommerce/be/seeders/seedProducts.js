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
  const image = String(product?.image || '').trim()
  const hasImages = Array.isArray(product?.images) && product.images.length > 0
  const normalizedImages = hasImages
    ? product.images.map((item) => String(item || '').trim()).filter(Boolean)
    : image
      ? [image]
      : []

  return {
    name: String(product?.name || '').trim(),
    category: String(product?.category || '').trim(),
    description: String(product?.description || '').trim(),
    price: Math.max(0, Number(product?.price) || 0),
    stock: Math.max(0, Number(product?.stock) || 0),
    image,
    images: normalizedImages,
    specs: Array.isArray(product?.specs)
      ? product.specs
          .map((spec) => ({
            label: String(spec?.label || '').trim(),
            value: String(spec?.value || '').trim(),
          }))
          .filter((spec) => spec.label || spec.value)
      : [],
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
