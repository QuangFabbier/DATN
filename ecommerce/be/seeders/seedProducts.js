import dotenv from 'dotenv'
import mongoose from 'mongoose'
import connectDB from '../config/db.js'
import Product from '../models/Product.js'
import { buildProductDocument, loadRawDataProducts } from '../utils/productDataset.js'

dotenv.config()

async function seedProducts() {
  try {
    await connectDB()

    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready')
    }

    const normalizedProducts = (await loadRawDataProducts())
      .map((product) => buildProductDocument(product))
      .filter(Boolean)

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
