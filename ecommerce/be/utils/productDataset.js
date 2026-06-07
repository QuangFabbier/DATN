import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_ROOT_DIR = path.resolve(__dirname, '../../../Data')

const DEFAULT_STOCK = 10
const DEFAULT_MIN_STOCK_LEVEL = 10
const DEFAULT_DESCRIPTION_PREFIX = 'Sản phẩm'

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

const SPEC_LABEL_OVERRIDES = new Map(
  Object.entries({
    cpu: 'CPU',
    gpu: 'GPU',
    ram: 'RAM',
    ssd: 'SSD',
    hdd: 'HDD',
    storage: 'Storage',
    display: 'Display',
    screen: 'Screen',
    refreshRate: 'Refresh Rate',
    battery: 'Battery',
    chip: 'Chip',
    camera: 'Camera',
    weight: 'Weight',
    operatingSystem: 'Operating System',
    os: 'Operating System',
    color: 'Color',
    bluetooth: 'Bluetooth',
    wifi: 'Wi-Fi',
    ports: 'Ports',
    dimensions: 'Dimensions',
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

function slugify(value = '') {
  return normalizeTextFold(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function createProductHash(sourceValue = '') {
  return createHash('sha1').update(String(sourceValue || '')).digest('hex').slice(0, 8)
}

function normalizeCategory(rawCategory = '') {
  const categoryText = normalizeText(rawCategory)
  const foldedCategory = normalizeTextFold(categoryText)

  if (!foldedCategory) {
    return ''
  }

  return CATEGORY_ALIASES.get(foldedCategory) || categoryText
}

function normalizeList(values = [], limit = 12) {
  if (!Array.isArray(values)) {
    return []
  }

  return [...new Set(values.map((item) => normalizeText(item)).filter(Boolean))].slice(0, limit)
}

function normalizeSpecLabel(label = '') {
  const normalizedLabel = normalizeText(label)
  if (!normalizedLabel) {
    return ''
  }

  if (SPEC_LABEL_OVERRIDES.has(normalizedLabel)) {
    return SPEC_LABEL_OVERRIDES.get(normalizedLabel)
  }

  const humanizedLabel = normalizedLabel.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')
  const foldedLabel = normalizeTextFold(humanizedLabel)
  if (SPEC_LABEL_OVERRIDES.has(foldedLabel)) {
    return SPEC_LABEL_OVERRIDES.get(foldedLabel)
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
    .map(([key, value]) => ({
      label: normalizeSpecLabel(key),
      value: normalizeText(Array.isArray(value) ? value.join(', ') : value),
    }))
    .filter((spec) => spec.label || spec.value)
}

function buildDescriptionFallback(productName = '', category = '') {
  const safeName = normalizeText(productName)
  const safeCategory = normalizeText(category)

  if (safeName && safeCategory) {
    return `${DEFAULT_DESCRIPTION_PREFIX} ${safeName} thuộc nhóm ${safeCategory}.`
  }

  if (safeName) {
    return `${DEFAULT_DESCRIPTION_PREFIX} ${safeName}.`
  }

  return ''
}

function buildSearchableText({ name, category, brand, description, tags = [], useCases = [], specs = [] }) {
  const specsText = Array.isArray(specs)
    ? specs.map((spec) => `${normalizeText(spec?.label)} ${normalizeText(spec?.value)}`.trim()).filter(Boolean).join(' ')
    : ''

  return normalizeTextFold(
    [name, category, brand, description, Array.isArray(tags) ? tags.join(' ') : '', Array.isArray(useCases) ? useCases.join(' ') : '', specsText]
      .filter(Boolean)
      .join(' '),
  )
}

function buildStableProductId(product = {}, sourceKey = '') {
  const name = normalizeText(product?.name)
  const category = normalizeCategory(product?.category)
  const brand = normalizeText(product?.brand)
  const price = Number(product?.price || 0)
  const fallbackSource = `${sourceKey}:${name}:${category}:${brand}:${price}`
  const slugBase = slugify(name || `${brand} ${category}`) || 'product'
  const hash = createProductHash(sourceKey || fallbackSource)
  return `${slugBase}-${hash}`
}

function normalizeProductRecord(product = {}, { sourceKey = '' } = {}) {
  if (!product || typeof product !== 'object') {
    return null
  }

  const name = normalizeText(product.name)
  if (!name) {
    return null
  }

  const category = normalizeCategory(product.category)
  const brand = normalizeText(product.brand) || name.split(/\s+/g).find(Boolean) || ''
  const price = Math.max(0, Number(product.price) || 0)
  const stock = Math.max(0, Number(product.stock) || DEFAULT_STOCK)
  const minStockLevel = Math.max(0, Number(product.minStockLevel) || DEFAULT_MIN_STOCK_LEVEL)
  const image = normalizeText(product.image)
  const images = Array.isArray(product.images) ? product.images.map((item) => normalizeText(item)).filter(Boolean) : []
  const specifications = normalizeSpecifications(product.specifications || product.specs)
  const description = normalizeText(product.description) || buildDescriptionFallback(name, category)
  const tags = normalizeList(
    [
      ...(Array.isArray(product.tags) ? product.tags : []),
      category,
      brand,
      ...specifications.map((spec) => spec.label),
    ],
    16,
  )
  const useCases = normalizeList(product.useCases || [], 10)
  const id = normalizeText(product.id) || buildStableProductId({ name, category, brand, price }, sourceKey)
  const searchableText = buildSearchableText({ name, category, brand, description, tags, useCases, specs: specifications })

  return {
    id,
    name,
    category,
    brand,
    price,
    stock,
    minStockLevel,
    image,
    images,
    description,
    specifications,
    specs: specifications,
    tags,
    useCases,
    searchableText,
  }
}

async function readJsonArray(filePath) {
  const fileContent = await readFile(filePath, 'utf8')
  const trimmedContent = fileContent.trim()

  if (!trimmedContent) {
    return []
  }

  const parsedContent = JSON.parse(trimmedContent)

  if (!Array.isArray(parsedContent)) {
    throw new Error(`Expected an array in ${filePath}`)
  }

  return parsedContent
}

async function walkDataFiles(directory, collectedFiles = []) {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      await walkDataFiles(entryPath, collectedFiles)
      continue
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      collectedFiles.push(entryPath)
    }
  }

  return collectedFiles
}

export async function loadRawDataProducts() {
  const files = await walkDataFiles(DATA_ROOT_DIR)
  const records = []

  for (const filePath of files) {
    const fileRecords = await readJsonArray(filePath)

    fileRecords.forEach((record, index) => {
      const normalized = normalizeProductRecord(record, { sourceKey: `${filePath}:${index}` })
      if (normalized) {
        records.push(normalized)
      }
    })
  }

  return records
}

export function normalizeProductForCatalog(product = {}, options = {}) {
  return normalizeProductRecord(product, options)
}

export function buildProductDocument(product = {}) {
  const normalizedProduct = normalizeProductRecord(product)

  if (!normalizedProduct) {
    return null
  }

  return {
    name: normalizedProduct.name,
    category: normalizedProduct.category,
    brand: normalizedProduct.brand,
    description: normalizedProduct.description,
    price: normalizedProduct.price,
    stock: normalizedProduct.stock,
    minStockLevel: normalizedProduct.minStockLevel,
    image: normalizedProduct.image,
    images: normalizedProduct.images,
    specs: normalizedProduct.specs,
    tags: normalizedProduct.tags,
    useCases: normalizedProduct.useCases,
    searchableText: normalizedProduct.searchableText,
  }
}

export { DATA_ROOT_DIR, DEFAULT_MIN_STOCK_LEVEL, DEFAULT_STOCK, normalizeCategory, normalizeSpecifications, normalizeSpecLabel }
