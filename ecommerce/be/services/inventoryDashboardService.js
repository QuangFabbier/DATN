import InventoryImport from '../models/InventoryImport.js'
import InventoryTransaction from '../models/InventoryTransaction.js'
import Product from '../models/Product.js'
import {
  listLowStockProducts,
  listOutOfStockProducts,
  listInventoryOverviewProducts,
} from './inventoryService.js'

function serializeProductActivity(product) {
  if (!product) {
    return null
  }

  return {
    id: String(product._id || product.id || ''),
    name: product.name || '',
    category: product.category || '',
    image: product.image || '',
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    minStockLevel: Number(product.minStockLevel || 0),
  }
}

function buildLatestImportPriceMap(imports = []) {
  const latestPriceByProductId = new Map()

  for (const receipt of imports) {
    if (!Array.isArray(receipt?.items)) {
      continue
    }

    for (const item of receipt.items) {
      const productId = String(item?.productId || '').trim()
      if (!productId || latestPriceByProductId.has(productId)) {
        continue
      }

      const importPrice = Number(item?.importPrice || 0)
      if (importPrice > 0) {
        latestPriceByProductId.set(productId, importPrice)
      }
    }
  }

  return latestPriceByProductId
}

async function buildRecentActivities(limit = 8) {
  const transactions = await InventoryTransaction.find()
    .populate('productId', 'name category image price stock minStockLevel')
    .populate('performedBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  return transactions.map((transaction) => ({
    id: String(transaction._id || transaction.id || ''),
    type: transaction.type,
    quantity: Number(transaction.quantity || 0),
    stockBefore: Number(transaction.stockBefore || 0),
    stockAfter: Number(transaction.stockAfter || 0),
    referenceType: transaction.referenceType,
    referenceId: transaction.referenceId,
    product: serializeProductActivity(transaction.productId),
    performedBy: transaction.performedBy
      ? {
          id: String(transaction.performedBy._id || transaction.performedBy.id || ''),
          name: transaction.performedBy.name || '',
          email: transaction.performedBy.email || '',
        }
      : null,
    createdAt: transaction.createdAt,
  }))
}

async function buildLowStockRecommendations(lowStockProducts = [], outOfStockProducts = []) {
  const overstockProducts = await Product.find({
    $expr: {
      $gt: ['$stock', { $multiply: ['$minStockLevel', 4] }],
    },
  })
    .select('name category price stock minStockLevel image')
    .sort({ stock: -1, updatedAt: -1 })
    .limit(10)
    .lean()

  return {
    lowStockProductList: lowStockProducts.map(serializeProductActivity).filter(Boolean),
    outOfStockProductList: outOfStockProducts.map(serializeProductActivity).filter(Boolean),
    overstockProductList: overstockProducts.map(serializeProductActivity).filter(Boolean),
  }
}

export async function getInventoryDashboard() {
  const [overviewProducts, confirmedImports, lowStockResult, outOfStockResult, recentActivities] = await Promise.all([
    listInventoryOverviewProducts(),
    InventoryImport.find({ status: 'CONFIRMED' }).sort({ importDate: -1, createdAt: -1 }).select('items importDate createdAt').lean(),
    listLowStockProducts({ page: 1, limit: 20, sort: 'newest' }),
    listOutOfStockProducts({ page: 1, limit: 20, sort: 'newest' }),
    buildRecentActivities(8),
  ])

  const latestImportPriceByProductId = buildLatestImportPriceMap(confirmedImports)

  const totalInventoryValue = overviewProducts.reduce((sum, product) => {
    const stock = Number(product.stock || 0)
    if (stock <= 0) {
      return sum
    }

    const latestImportPrice = latestImportPriceByProductId.get(String(product._id || product.id || ''))
    const unitValue = Number.isFinite(latestImportPrice) && latestImportPrice > 0 ? latestImportPrice : Number(product.price || 0)

    return sum + stock * unitValue
  }, 0)

  const lowStockItems = lowStockResult.items
  const outOfStockItems = outOfStockResult.items
  const recommendations = await buildLowStockRecommendations(lowStockItems, outOfStockItems)

  return {
    totalProducts: overviewProducts.length,
    totalInventoryValue,
    lowStockProducts: lowStockItems.length,
    outOfStockProducts: outOfStockItems.length,
    lowStockProductList: recommendations.lowStockProductList,
    outOfStockProductList: recommendations.outOfStockProductList,
    overstockProductList: recommendations.overstockProductList,
    recentActivities,
  }
}

export async function getInventoryHealthSnapshot() {
  const dashboard = await getInventoryDashboard()

  return {
    lowStockProducts: dashboard.lowStockProductList || [],
    outOfStockProducts: dashboard.outOfStockProductList || [],
    overstockProducts: dashboard.overstockProductList || [],
    totalInventoryValue: dashboard.totalInventoryValue,
    totalProducts: dashboard.totalProducts,
  }
}
