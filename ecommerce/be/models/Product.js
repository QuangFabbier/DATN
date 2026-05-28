import mongoose from 'mongoose'

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

productSchema.pre('save', function normalizeProductMetadata(next) {
  if (!this.brand) {
    this.brand = inferBrandFromName(this.name)
  }

  this.tags = Array.isArray(this.tags)
    ? [...new Set(this.tags.map((item) => normalizeText(item)).filter(Boolean))]
    : []

  this.useCases = Array.isArray(this.useCases)
    ? [...new Set(this.useCases.map((item) => normalizeText(item)).filter(Boolean))]
    : []

  this.searchableText = buildSearchableText(this)
  next()
})

const Product = mongoose.model('Product', productSchema)

export default Product

