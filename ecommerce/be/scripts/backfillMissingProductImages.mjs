import dotenv from 'dotenv'
import { createHash } from 'node:crypto'
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
  const serialized = `${JSON.stringify(data, null, 2)}\n`
  await writeFile(filePath, serialized, 'utf8')
}

function decodeBingUrl(rawValue = '') {
  return String(rawValue || '')
    .replace(/\\u002f/g, '/')
    .replace(/\\u003a/g, ':')
    .replace(/\\u0026/g, '&')
    .replace(/\\u003d/g, '=')
    .replace(/\\u002b/g, '+')
    .replace(/\\u003f/g, '?')
}

async function fetchBingImageUrls(query) {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    },
  })

  if (!response.ok) {
    throw new Error(`Bing request failed for ${query}: ${response.status}`)
  }

  const html = await response.text()
  const matches = [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)]
  const urls = []

  for (const match of matches) {
    const candidate = decodeBingUrl(match[1]).trim()
    if (!candidate) {
      continue
    }

    if (/logo|icon|sprite|placeholder|svg/i.test(candidate)) {
      continue
    }

    if (!urls.includes(candidate)) {
      urls.push(candidate)
    }

    if (urls.length >= 8) {
      break
    }
  }

  return urls
}

function buildQueryVariants(product = {}) {
  const name = normalizeText(product.name)
  const brand = normalizeText(product.brand)
  const category = normalizeText(product.category)

  const base = [name, brand, category].filter(Boolean).join(' ').trim()
  const variants = [
    `${base} white background`,
    `${name} white background`,
    `${brand} ${category} white background`.trim(),
    `${brand} ${category}`.trim(),
    `${category} white background`.trim(),
  ]

  return [...new Set(variants.filter(Boolean))]
}

function pickBestImageUrl(urls = []) {
  const preferredDomains = [
    'resource.logitech.com',
    'static.tp-link.com',
    'images.samsung.com',
    'shop.samsung.com',
    'www.apple.com',
    'cdn.shopify.com',
    'www.keychron.com',
    'assets2.razerzone.com',
    'i02.appmifile.com',
    'www.jbl.com',
    'm.media-amazon.com',
    'www.hpshop.com',
    'www.lenovo.com',
    'www.asus.com',
    'www.acer.com',
  ]

  const safeUrls = urls.filter(Boolean)
  const byPreferredDomain = safeUrls.find((candidate) => preferredDomains.some((domain) => candidate.includes(domain)))
  return byPreferredDomain || safeUrls[0] || ''
}

function buildLookupKey(product = {}) {
  return [normalizeKey(product.name), normalizeKey(product.category), normalizeKey(product.brand)].join('__')
}

function buildGroupKey(product = {}) {
  return [normalizeKey(product.category), normalizeKey(product.brand)].join('__')
}

function buildQueryLabel(product = {}) {
  return [normalizeText(product.name), normalizeText(product.brand), normalizeText(product.category)]
    .filter(Boolean)
    .join(' ')
    .trim()
}

function hasImage(product = {}) {
  const image = String(product?.image || '').trim()
  const images = Array.isArray(product?.images) ? product.images.filter((item) => String(item || '').trim()) : []
  return Boolean(image) || images.length > 0
}

async function main() {
  await connectDB()

  const dbProducts = await Product.find({ $or: [{ image: { $in: ['', null] } }, { images: { $size: 0 } }] })
    .select('name category brand image images')
    .lean()

  const filePaths = await walkJsonFiles(DATA_DIR)
  const fileProducts = []

  for (const filePath of filePaths) {
    const records = await loadJsonArray(filePath)
    records.forEach((record, index) => {
      fileProducts.push({ filePath, index, record })
    })
  }

  const feProducts = await loadJsonArray(FE_ALL_PRODUCTS_PATH)

  const updates = new Map()
  const queryCache = new Map()
  const groupMap = new Map()

  const targets = dbProducts.filter((product) => !hasImage(product))

  for (const product of targets) {
    const groupKey = buildGroupKey(product)
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, [])
    }
    groupMap.get(groupKey).push(product)
  }

  const groupEntries = [...groupMap.entries()]
  const CONCURRENCY = 5
  for (let index = 0; index < groupEntries.length; index += CONCURRENCY) {
    const batch = groupEntries.slice(index, index + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(async ([groupKey, products]) => {
        const primary = products[0]
        const queryLabel = buildQueryLabel(primary)
        const queryVariants = buildQueryVariants(primary)
        let chosenUrl = ''

        for (const query of queryVariants) {
          let urls = queryCache.get(query)
          if (!urls) {
            try {
              urls = await fetchBingImageUrls(query)
            } catch {
              urls = []
            }
            queryCache.set(query, urls)
          }

          chosenUrl = pickBestImageUrl(urls)
          if (chosenUrl) {
            break
          }
        }

        return { groupKey, queryLabel, chosenUrl, products }
      }),
    )

    for (const result of batchResults) {
      if (!result.chosenUrl) {
        console.log(`[skip] ${result.queryLabel}`)
        continue
      }

      console.log(`[image] ${result.queryLabel} -> ${result.chosenUrl}`)
      for (const product of result.products) {
        updates.set(buildLookupKey(product), result.chosenUrl)
      }
    }
  }

  let dbUpdated = 0
  for (const product of dbProducts) {
    const key = buildLookupKey(product)
    const nextImage = updates.get(key)
    if (!nextImage) {
      continue
    }

    await Product.updateOne(
      { _id: product._id },
      {
        $set: {
          image: nextImage,
          images: [nextImage],
        },
      },
    )
    dbUpdated += 1
  }

  let dataUpdated = 0
  for (const item of fileProducts) {
    const nextImage = updates.get(buildLookupKey(item.record))
    if (!nextImage) {
      continue
    }

    const record = item.record || {}
    const currentImage = String(record.image || '').trim()
    const currentImages = Array.isArray(record.images) ? record.images.map((entry) => String(entry || '').trim()).filter(Boolean) : []

    if (currentImage || currentImages.length > 0) {
      continue
    }

    record.image = nextImage
    record.images = [nextImage]
    fileProducts[item.index].record = record
    dataUpdated += 1
  }

  const groupedByFile = new Map()
  for (const item of fileProducts) {
    if (!groupedByFile.has(item.filePath)) {
      groupedByFile.set(item.filePath, [])
    }
    groupedByFile.get(item.filePath).push(item.record)
  }

  for (const [filePath, records] of groupedByFile.entries()) {
    await saveJsonArray(filePath, records)
  }

  for (let index = 0; index < feProducts.length; index += 1) {
    const product = feProducts[index]
    if (hasImage(product)) {
      continue
    }

    const nextImage = updates.get(buildLookupKey(product))
    if (!nextImage) {
      continue
    }

    feProducts[index] = {
      ...product,
      image: nextImage,
      images: [nextImage],
    }
  }

  await saveJsonArray(FE_ALL_PRODUCTS_PATH, feProducts)

  const totalBackfilled = new Set(updates.values()).size
  console.log(
    JSON.stringify(
      {
        matchedProducts: totalBackfilled,
        dbUpdated,
        dataUpdated,
        feUpdated: feProducts.filter((product) => hasImage(product)).length,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
