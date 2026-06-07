import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRawDataProducts } from '../be/utils/productDataset.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const outputPath = path.resolve(__dirname, '../fe/src/data/all-products.json')

async function generateProductsDataset() {
  const products = await loadRawDataProducts()
  await writeFile(outputPath, `${JSON.stringify(products, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${products.length} normalized products to ${outputPath}`)
}

generateProductsDataset().catch((error) => {
  console.error(`Dataset generation failed: ${error.message}`)
  process.exitCode = 1
})
