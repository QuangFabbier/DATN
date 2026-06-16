import dotenv from 'dotenv'
import { createHash } from 'node:crypto'
import mongoose from 'mongoose'
import connectDB from '../config/db.js'
import Product from '../models/Product.js'
import ProductReview from '../models/ProductReview.js'
import { buildProductDocument, loadRawDataProducts } from '../utils/productDataset.js'

dotenv.config()

function stableRandom(seedValue = '', salt = '') {
  const hash = createHash('sha1').update(`${seedValue}:${salt}`).digest('hex').slice(0, 8)
  return Number.parseInt(hash, 16) / 0xffffffff
}

function buildSyntheticReviewPack(product = {}, reviewIndex = 0) {
  const seedBase = `${product._id}:${product.name}:${product.category}:${product.brand}:${product.price}`
  const reviewCount = 2 + Math.floor(stableRandom(seedBase, 'count') * 3)
  const counts = { 3: 0, 4: 0, 5: 0 }
  const ratings = []

  for (let index = 0; index < reviewCount; index += 1) {
    const rating = 3 + Math.floor(stableRandom(seedBase, `rating:${index}`) * 3)
    ratings.push(rating)
    counts[rating] += 1
  }

  const averageRating = Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1))
  const summaryTemplates = [
    'Nhìn chung sản phẩm được đánh giá ở mức khá, phù hợp nhu cầu phổ thông.',
    'Trải nghiệm tổng thể khá cân bằng, không nổi bật quá mức nhưng đáp ứng đúng mục đích sử dụng.',
    'Người dùng nhìn chung đánh giá ổn, vẫn nên cân nhắc thêm theo nhu cầu thực tế và tầm giá.',
  ]

  const highlightTemplates = [
    'Phản hồi nhìn chung khá cân bằng',
    'Mức độ phù hợp ở tầm trung bình-khá',
    'Nên đối chiếu thêm theo nhu cầu cụ thể',
  ]

  const summaryText = summaryTemplates[Math.floor(stableRandom(seedBase, 'summary') * summaryTemplates.length)]
  const highlights = [
    highlightTemplates[Math.floor(stableRandom(seedBase, 'hl-1') * highlightTemplates.length)],
    highlightTemplates[Math.floor(stableRandom(seedBase, 'hl-2') * highlightTemplates.length)],
  ]

  const reviewTemplates = [
    {
      title: 'Đáp ứng nhu cầu',
      comment: 'Sản phẩm đáp ứng đúng nhu cầu cơ bản, trải nghiệm tổng thể ở mức ổn trong tầm giá.',
    },
    {
      title: 'Cân bằng và thực dụng',
      comment: 'Thiết kế và tính năng ở mức vừa phải, phù hợp nếu ưu tiên sự thực dụng hơn là nhiều yếu tố nổi bật.',
    },
    {
      title: 'Khá ổn',
      comment: 'Mức độ hoàn thiện nhìn chung ổn, nhưng vẫn nên đối chiếu thêm với nhu cầu riêng trước khi chốt.',
    },
    {
      title: 'Phù hợp tầm giá',
      comment: 'Đây là lựa chọn tương đối cân bằng, không quá nổi trội nhưng đủ dùng cho mục tiêu phổ thông.',
    },
  ]

  const reviewDocs = ratings.map((rating, index) => {
    const template = reviewTemplates[Math.floor(stableRandom(seedBase, `template:${index}`) * reviewTemplates.length)]
    const userIdHex = createHash('sha1').update(`${seedBase}:user:${index}`).digest('hex').slice(0, 24)

    return {
      productId: product._id,
      userId: new mongoose.Types.ObjectId(userIdHex),
      username: `Người dùng ${index + 1}`,
      avatar: '',
      rating,
      title: `${template.title} ${rating}/5`,
      comment: template.comment,
    }
  })

  const ratingBreakdown = {
    1: 0,
    2: 0,
    3: counts[3],
    4: counts[4],
    5: counts[5],
  }

  return {
    reviewDocs,
    aggregate: {
      averageRating,
      totalReviews: reviewDocs.length,
      ratingBreakdown,
      reviewSummary: {
        text: `${summaryText} Mức đánh giá trung bình hiện tại là ${averageRating.toFixed(1)}/5.`,
        highlights,
        sourceReviewCount: reviewDocs.length,
        stale: false,
        updatedAt: new Date(),
      },
    },
  }
}

async function seedProducts() {
  try {
    await connectDB()

    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready')
    }

    const normalizedProducts = (await loadRawDataProducts())
      .map((product) => buildProductDocument(product))
      .filter(Boolean)

    const existingProducts = await Product.find().select('name category brand image images').lean()
    const existingProductMap = new Map(
      existingProducts.map((product) => [
        `${String(product.name || '').trim()}__${String(product.category || '').trim()}__${String(product.brand || '').trim()}`,
        product,
      ]),
    )

    const productsWithPreservedImages = normalizedProducts.map((product) => {
      const key = `${String(product.name || '').trim()}__${String(product.category || '').trim()}__${String(product.brand || '').trim()}`
      const existingProduct = existingProductMap.get(key)
      const fallbackImages = Array.isArray(existingProduct?.images) ? existingProduct.images.filter(Boolean) : []
      const preservedImages = Array.isArray(product.images) && product.images.length > 0 ? product.images : fallbackImages

      return {
        ...product,
        image: product.image || existingProduct?.image || preservedImages[0] || '',
        images: preservedImages.length > 0 ? preservedImages : product.image || existingProduct?.image ? [product.image || existingProduct?.image].filter(Boolean) : [],
      }
    })

    await Product.deleteMany({})
    await ProductReview.deleteMany({})
    const insertedProducts = await Product.insertMany(productsWithPreservedImages)

    const reviewDocs = []
    const productUpdates = []

    for (const product of insertedProducts) {
      const { reviewDocs: syntheticReviews, aggregate } = buildSyntheticReviewPack(product)
      reviewDocs.push(...syntheticReviews)
      productUpdates.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $set: {
              averageRating: aggregate.averageRating,
              totalReviews: aggregate.totalReviews,
              ratingBreakdown: aggregate.ratingBreakdown,
              reviewSummary: aggregate.reviewSummary,
            },
          },
        },
      })
    }

    if (reviewDocs.length > 0) {
      await ProductReview.insertMany(reviewDocs)
    }

    if (productUpdates.length > 0) {
      await Product.bulkWrite(productUpdates)
    }

    console.log(`Seed success: inserted ${insertedProducts.length} products`)
  } catch (error) {
    console.error(`Seed error: ${error.message}`)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}

seedProducts()
