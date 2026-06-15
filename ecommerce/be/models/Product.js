import mongoose from 'mongoose'
import { normalizeCategory, normalizeSpecifications } from '../utils/productDataset.js'

const specSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: '',
    },
    value: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false },
)

const reviewSummarySchema = new mongoose.Schema(
  {
    text: {
      type: String,
      trim: true,
      default: '',
    },
    highlights: {
      type: [String],
      default: [],
    },
    sourceReviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    stale: {
      type: Boolean,
      default: true,
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
)

const ratingBreakdownSchema = new mongoose.Schema(
  {
    1: { type: Number, default: 0, min: 0 },
    2: { type: Number, default: 0, min: 0 },
    3: { type: Number, default: 0, min: 0 },
    4: { type: Number, default: 0, min: 0 },
    5: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
)

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be greater than or equal to 0'],
    },
    stock: {
      type: Number,
      required: [true, 'Product stock is required'],
      min: [0, 'Stock must be greater than or equal to 0'],
      default: 0,
    },
    sold: {
      type: Number,
      default: 0,
      min: [0, 'Sold quantity must be greater than or equal to 0'],
    },
    minStockLevel: {
      type: Number,
      default: 10,
      min: [0, 'Minimum stock level must be greater than or equal to 0'],
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    images: {
      type: [String],
      default: [],
    },
    specs: {
      type: [specSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    useCases: {
      type: [String],
      default: [],
    },
    searchableText: {
      type: String,
      trim: true,
      default: '',
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    ratingBreakdown: {
      type: ratingBreakdownSchema,
      default: () => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }),
    },
    reviewSummary: {
      type: reviewSummarySchema,
      default: () => ({ stale: true }),
    },
  },
  {
    timestamps: true,
  },
)

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

function inferBrandFromName(name = '') {
  return normalizeText(name).split(/\s+/g).find(Boolean) || ''
}

function buildSearchableText(product = {}) {
  const specsText = Array.isArray(product.specs)
    ? product.specs
        .map((spec) => `${normalizeText(spec?.label)} ${normalizeText(spec?.value)}`.trim())
        .filter(Boolean)
        .join(' ')
    : ''

  return normalizeTextFold(
    [
      product.name,
      product.category,
      product.brand,
      product.description,
      Array.isArray(product.tags) ? product.tags.join(' ') : '',
      Array.isArray(product.useCases) ? product.useCases.join(' ') : '',
      specsText,
    ]
      .filter(Boolean)
      .join(' '),
  )
}

productSchema.pre('save', function normalizeProductMetadata() {
  if (this.category) {
    this.category = normalizeCategory(this.category)
  }

  if (!this.brand) {
    this.brand = inferBrandFromName(this.name)
  }

  if (Array.isArray(this.specs)) {
    this.specs = normalizeSpecifications(this.specs)
  }

  this.tags = Array.isArray(this.tags)
    ? [...new Set(this.tags.map((item) => normalizeText(item)).filter(Boolean))]
    : []

  this.useCases = Array.isArray(this.useCases)
    ? [...new Set(this.useCases.map((item) => normalizeText(item)).filter(Boolean))]
    : []

  this.searchableText = buildSearchableText(this)
})

const Product = mongoose.model('Product', productSchema)

export default Product
