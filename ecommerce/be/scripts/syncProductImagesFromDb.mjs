import dotenv from 'dotenv'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import connectDB from '../config/db.js'
import Product from '../models/Product.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '../../..')
const DATA_DIR = path.join(ROOT_DIR, 'Data')
const FE_ALL_PRODUCTS_PATH = path.join(ROOT_DIR, 'ecommerce/fe/src/data/all-products.json')

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeKey(value = '') {
  return normalizeText(value).toLowerCase()
}

async function walkJsonFiles(directory, collected = []) {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await walkJsonFiles(entryPath, collected)
      continue
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      collected.push(entryPath)
    }
  }

  return collected
}

async function loadJsonArray(filePath) {
  const raw = await readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array JSON in ${filePath}`)
  }
  return parsed
}

async function saveJsonArray(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function hasImage(product = {}) {
  const image = String(product?.image || '').trim()
  const images = Array.isArray(product?.images) ? product.images.filter((item) => String(item || '').trim()) : []
  return Boolean(image) || images.length > 0
}

function buildLookupKey(product = {}) {
  return [normalizeKey(product.name), normalizeKey(product.category), normalizeKey(product.brand)].join('__')
}

async function main() {
  await connectDB()

  const dbProducts = await Product.find().select('name category brand image images').lean()
  const dbMap = new Map(dbProducts.map((product) => [buildLookupKey(product), product]))

  const filePaths = await walkJsonFiles(DATA_DIR)
  let dataUpdated = 0

  for (const filePath of filePaths) {
    const records = await loadJsonArray(filePath)
    let changed = false

    for (const record of records) {
      const dbProduct = dbMap.get(buildLookupKey(record))
      if (!dbProduct) {
        continue
      }

      const currentHasImage = hasImage(record)
      if (currentHasImage) {
        continue
      }

      record.image = String(dbProduct.image || '').trim()
      record.images = Array.isArray(dbProduct.images) ? dbProduct.images.map((item) => String(item || '').trim()).filter(Boolean) : []
      changed = true
      dataUpdated += 1
    }

    if (changed) {
      await saveJsonArray(filePath, records)
    }
  }

  const feProducts = await loadJsonArray(FE_ALL_PRODUCTS_PATH)
  let feUpdated = 0

  for (const product of feProducts) {
    const dbProduct = dbMap.get(buildLookupKey(product))
    if (!dbProduct || hasImage(product)) {
      continue
    }

    product.image = String(dbProduct.image || '').trim()
    product.images = Array.isArray(dbProduct.images) ? dbProduct.images.map((item) => String(item || '').trim()).filter(Boolean) : []
    feUpdated += 1
  }

  await saveJsonArray(FE_ALL_PRODUCTS_PATH, feProducts)

  console.log(JSON.stringify({ dataUpdated, feUpdated, totalProducts: dbProducts.length }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
