import mongoose from 'mongoose'
import InventoryExport from '../models/InventoryExport.js'
import InventoryImport from '../models/InventoryImport.js'
import InventoryTransaction from '../models/InventoryTransaction.js'
import Product from '../models/Product.js'

export const INVENTORY_IMPORT_STATUSES = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
}

export const INVENTORY_EXPORT_STATUSES = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
}

export const INVENTORY_EXPORT_REASONS = {
  MANUAL: 'MANUAL',
  DAMAGED: 'DAMAGED',
  INTERNAL_USE: 'INTERNAL_USE',
  ADJUSTMENT: 'ADJUSTMENT',
}

export const INVENTORY_TRANSACTION_TYPES = {
  IMPORT: 'IMPORT',
  EXPORT: 'EXPORT',
}

export const INVENTORY_REFERENCE_TYPES = {
  INVENTORY_IMPORT: 'INVENTORY_IMPORT',
  INVENTORY_EXPORT: 'INVENTORY_EXPORT',
  ORDER: 'ORDER',
}

function buildInventoryError(message, statusCode = 400, code = 'INVENTORY_ERROR') {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code
  return error
}

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeObjectId(value = '') {
  const id = normalizeText(value)

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildInventoryError('ObjectId khong hop le.', 400, 'INVALID_OBJECT_ID')
  }

  return id
}

function normalizePositiveInteger(value, fieldName) {
  const nextValue = Number(value)

  if (!Number.isFinite(nextValue) || nextValue <= 0 || !Number.isInteger(nextValue)) {
    throw buildInventoryError(`${fieldName} phai la so nguyen lon hon 0.`, 400, 'INVALID_QUANTITY')
  }

  return nextValue
}

function normalizePositiveNumber(value, fieldName) {
  const nextValue = Number(value)

  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    throw buildInventoryError(`${fieldName} phai lon hon 0.`, 400, 'INVALID_AMOUNT')
  }

  return nextValue
}

function normalizeNonNegativeInteger(value, fieldName) {
  const nextValue = Number(value)

  if (!Number.isFinite(nextValue) || nextValue < 0 || !Number.isInteger(nextValue)) {
    throw buildInventoryError(`${fieldName} phai la so nguyen khong am.`, 400, 'INVALID_NUMBER')
  }

  return nextValue
}

function normalizeDate(value, fallback = new Date()) {
  const parsedDate = value ? new Date(value) : null

  if (parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())) {
    return parsedDate
  }

  return fallback
}

function normalizeStatus(value, allowedStatuses, fallbackStatus) {
  const normalized = String(value || '').trim().toUpperCase()
  if (allowedStatuses.has(normalized)) {
    return normalized
  }
  return fallbackStatus
}

function normalizeReason(value) {
  const normalized = String(value || '').trim().toUpperCase()
  if (Object.values(INVENTORY_EXPORT_REASONS).includes(normalized)) {
    return normalized
  }
  return INVENTORY_EXPORT_REASONS.MANUAL
}

function normalizeBaseItems(items, isImport = false) {
  if (!Array.isArray(items) || items.length === 0) {
    throw buildInventoryError('Phai co it nhat 1 san pham trong phieu kho.', 400, 'EMPTY_ITEMS')
  }

  return items.map((item, index) => {
    const productId = normalizeObjectId(item?.productId || item?.product || item?.id || '')
    const quantity = normalizePositiveInteger(item?.quantity, `So luong dong ${index + 1}`)
    const normalizedItem = {
      productId,
      quantity,
    }

    if (isImport) {
      normalizedItem.importPrice = normalizePositiveNumber(item?.importPrice, `Gia nhap dong ${index + 1}`)
    }

    return normalizedItem
  })
}

function normalizeDateRangeFilter(startDate, endDate, fieldName = 'createdAt') {
  const query = {}
  const normalizedStartDate = normalizeText(startDate)
  const normalizedEndDate = normalizeText(endDate)

  if (normalizedStartDate || normalizedEndDate) {
    query[fieldName] = {}
  }

  if (normalizedStartDate) {
    query[fieldName].$gte = new Date(normalizedStartDate)
  }

  if (normalizedEndDate) {
    const end = new Date(normalizedEndDate)
    end.setHours(23, 59, 59, 999)
    query[fieldName].$lte = end
  }

  return query
}

function normalizePagination(page = 1, limit = 10) {
  const nextPage = Math.max(1, Number(page) || 1)
  const nextLimit = Math.min(100, Math.max(1, Number(limit) || 10))

  return {
    page: nextPage,
    limit: nextLimit,
    skip: (nextPage - 1) * nextLimit,
  }
}

function normalizeSort(sort = 'newest', fallbackDirection = -1) {
  const normalized = String(sort || '').trim().toLowerCase()

  if (normalized === 'oldest' || normalized === 'asc') {
    return { createdAt: 1 }
  }

  return { createdAt: fallbackDirection }
}

function serializeProductReference(product) {
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

function serializeUserReference(user) {
  if (!user) {
    return null
  }

  return {
    id: String(user._id || user.id || ''),
    name: user.name || '',
    email: user.email || '',
  }
}

function serializeTransaction(transaction) {
  return {
    id: String(transaction._id || transaction.id || ''),
    productId: transaction.productId?._id ? String(transaction.productId._id) : String(transaction.productId || ''),
    type: transaction.type,
    quantity: Number(transaction.quantity || 0),
    stockBefore: Number(transaction.stockBefore || 0),
    stockAfter: Number(transaction.stockAfter || 0),
    referenceType: transaction.referenceType,
    referenceId: transaction.referenceId,
    performedBy: serializeUserReference(transaction.performedBy),
    product: serializeProductReference(transaction.productId),
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  }
}

function serializeReceiptDocument(document) {
  const plainDocument = typeof document?.toObject === 'function' ? document.toObject() : document

  return {
    id: String(plainDocument?._id || plainDocument?.id || ''),
    supplierName: plainDocument?.supplierName || plainDocument?.reason || '',
    note: plainDocument?.note || '',
    importDate: plainDocument?.importDate || plainDocument?.exportDate || plainDocument?.createdAt,
    status: plainDocument?.status || 'DRAFT',
    importedBy: serializeUserReference(plainDocument?.importedBy),
    exportedBy: serializeUserReference(plainDocument?.exportedBy),
    confirmedAt: plainDocument?.confirmedAt || null,
    confirmedBy: serializeUserReference(plainDocument?.confirmedBy),
    items: Array.isArray(plainDocument?.items)
      ? plainDocument.items.map((item) => ({
          productId: String(item?.productId || ''),
          quantity: Number(item?.quantity || 0),
          importPrice: item?.importPrice === undefined ? null : Number(item?.importPrice || 0),
          stockBefore: Number(item?.stockBefore || 0),
          stockAfter: Number(item?.stockAfter || 0),
        }))
      : [],
    createdAt: plainDocument?.createdAt,
    updatedAt: plainDocument?.updatedAt,
  }
}

async function createTransactionRecord({
  session,
  productId,
  type,
  quantity,
  stockBefore,
  stockAfter,
  referenceType,
  referenceId,
  performedBy,
}) {
  const transaction = new InventoryTransaction({
    productId,
    type,
    quantity,
    stockBefore,
    stockAfter,
    referenceType,
    referenceId,
    performedBy,
  })

  await transaction.save({ session })
  return transaction
}

async function processInventoryImportItems({ session, items, receiptId, performedBy }) {
  const processedItems = []

  for (const item of items) {
    const product = await Product.findById(item.productId).session(session)

    if (!product) {
      throw buildInventoryError(`Khong tim thay san pham ${item.productId}.`, 404, 'PRODUCT_NOT_FOUND')
    }

    const stockBefore = Number(product.stock || 0)
    const stockAfter = stockBefore + item.quantity

    product.stock = stockAfter
    await product.save({ session })

    await createTransactionRecord({
      session,
      productId: product._id,
      type: INVENTORY_TRANSACTION_TYPES.IMPORT,
      quantity: item.quantity,
      stockBefore,
      stockAfter,
      referenceType: INVENTORY_REFERENCE_TYPES.INVENTORY_IMPORT,
      referenceId: String(receiptId),
      performedBy,
    })

    processedItems.push({
      ...item,
      stockBefore,
      stockAfter,
    })
  }

  return processedItems
}

async function processInventoryExportItems({ session, items, receiptId, performedBy }) {
  const processedItems = []

  for (const item of items) {
    const product = await Product.findById(item.productId).session(session)

    if (!product) {
      throw buildInventoryError(`Khong tim thay san pham ${item.productId}.`, 404, 'PRODUCT_NOT_FOUND')
    }

    const stockBefore = Number(product.stock || 0)

    if (stockBefore < item.quantity) {
      throw buildInventoryError(`San pham ${product.name} khong du ton kho de xuat.`, 400, 'INSUFFICIENT_STOCK')
    }

    const stockAfter = stockBefore - item.quantity
    product.stock = stockAfter
    await product.save({ session })

    await createTransactionRecord({
      session,
      productId: product._id,
      type: INVENTORY_TRANSACTION_TYPES.EXPORT,
      quantity: item.quantity,
      stockBefore,
      stockAfter,
      referenceType: INVENTORY_REFERENCE_TYPES.INVENTORY_EXPORT,
      referenceId: String(receiptId),
      performedBy,
    })

    processedItems.push({
      ...item,
      stockBefore,
      stockAfter,
    })
  }

  return processedItems
}

export async function createInventoryImport(payload = {}, currentUser = null) {
  if (!currentUser?.id) {
    throw buildInventoryError('Yeu cau dang nhap de thao tac nhap kho.', 401, 'UNAUTHORIZED')
  }

  const supplierName = normalizeText(payload.supplierName)
  if (!supplierName) {
    throw buildInventoryError('Vui long nhap ten nha cung cap.', 400, 'INVALID_SUPPLIER')
  }

  const note = normalizeText(payload.note)
  const importDate = normalizeDate(payload.importDate)
  const status = normalizeStatus(payload.status, new Set(Object.values(INVENTORY_IMPORT_STATUSES)), INVENTORY_IMPORT_STATUSES.DRAFT)
  const items = normalizeBaseItems(payload.items, true)
  const receipt = new InventoryImport({
    supplierName,
    note,
    importDate,
    status,
    importedBy: currentUser.id,
    items,
  })

  if (status === INVENTORY_IMPORT_STATUSES.CONFIRMED) {
    receipt.confirmedAt = new Date()
    receipt.confirmedBy = currentUser.id
  }

  const session = await mongoose.startSession()

  try {
    await session.withTransaction(async () => {
      if (status === INVENTORY_IMPORT_STATUSES.CONFIRMED) {
        const processedItems = await processInventoryImportItems({
          session,
          items,
          receiptId: receipt._id,
          performedBy: currentUser.id,
        })
        receipt.items = processedItems
      }

      await receipt.save({ session })
    })
  } finally {
    await session.endSession()
  }

  const populatedReceipt = await InventoryImport.findById(receipt._id)
    .populate('importedBy', 'name email')
    .populate('confirmedBy', 'name email')
    .lean()

  return {
    receipt: serializeReceiptDocument(populatedReceipt || receipt),
  }
}

export async function createInventoryExport(payload = {}, currentUser = null) {
  if (!currentUser?.id) {
    throw buildInventoryError('Yeu cau dang nhap de thao tac xuat kho.', 401, 'UNAUTHORIZED')
  }

  const reason = normalizeReason(payload.reason)
  const note = normalizeText(payload.note)
  const exportDate = normalizeDate(payload.exportDate)
  const status = normalizeStatus(payload.status, new Set(Object.values(INVENTORY_EXPORT_STATUSES)), INVENTORY_EXPORT_STATUSES.DRAFT)
  const items = normalizeBaseItems(payload.items, false)
  const receipt = new InventoryExport({
    reason,
    note,
    exportDate,
    status,
    exportedBy: currentUser.id,
    items,
  })

  if (status === INVENTORY_EXPORT_STATUSES.CONFIRMED) {
    receipt.confirmedAt = new Date()
    receipt.confirmedBy = currentUser.id
  }

  const session = await mongoose.startSession()

  try {
    await session.withTransaction(async () => {
      if (status === INVENTORY_EXPORT_STATUSES.CONFIRMED) {
        const processedItems = await processInventoryExportItems({
          session,
          items,
          receiptId: receipt._id,
          performedBy: currentUser.id,
        })
        receipt.items = processedItems
      }

      await receipt.save({ session })
    })
  } finally {
    await session.endSession()
  }

  const populatedReceipt = await InventoryExport.findById(receipt._id)
    .populate('exportedBy', 'name email')
    .populate('confirmedBy', 'name email')
    .lean()

  return {
    receipt: serializeReceiptDocument(populatedReceipt || receipt),
  }
}

export async function recordOrderCompletionInventory(order = {}, performedBy = null, session = null) {
  if (!performedBy?.id) {
    throw buildInventoryError('Yeu cau dang nhap de cap nhat ton kho don hang.', 401, 'UNAUTHORIZED')
  }

  const normalizedOrderId = normalizeText(order?.id || order?._id || order?.orderId)
  if (!normalizedOrderId) {
    throw buildInventoryError('Don hang khong hop le.', 400, 'INVALID_ORDER')
  }

  const items = Array.isArray(order?.items)
    ? order.items.map((item) => ({
        productId: normalizeObjectId(item?.productId || item?.id || ''),
        quantity: normalizePositiveInteger(item?.quantity, 'So luong don hang'),
      }))
    : []

  if (items.length === 0) {
    throw buildInventoryError('Don hang khong co san pham can tru kho.', 400, 'EMPTY_ORDER_ITEMS')
  }

  const run = async (activeSession) => {
    for (const item of items) {
      const product = await Product.findById(item.productId).session(activeSession)

      if (!product) {
        throw buildInventoryError(`Khong tim thay san pham ${item.productId}.`, 404, 'PRODUCT_NOT_FOUND')
      }

      const stockBefore = Number(product.stock || 0)
      if (stockBefore < item.quantity) {
        throw buildInventoryError(`San pham ${product.name} khong du ton kho de hoan thanh don hang.`, 400, 'INSUFFICIENT_STOCK')
      }

      const stockAfter = stockBefore - item.quantity
      product.stock = stockAfter
      product.sold = Number(product.sold || 0) + item.quantity
      await product.save({ session: activeSession })

      await createTransactionRecord({
        session: activeSession,
        productId: product._id,
        type: INVENTORY_TRANSACTION_TYPES.EXPORT,
        quantity: item.quantity,
        stockBefore,
        stockAfter,
        referenceType: INVENTORY_REFERENCE_TYPES.ORDER,
        referenceId: normalizedOrderId,
        performedBy: performedBy.id,
      })
    }
  }

  if (session) {
    await run(session)
    return { orderId: normalizedOrderId, deducted: true }
  }

  const activeSession = await mongoose.startSession()
  try {
    await activeSession.withTransaction(async () => {
      await run(activeSession)
    })
  } finally {
    await activeSession.endSession()
  }

  return { orderId: normalizedOrderId, deducted: true }
}

async function buildListResponse(query, { page, limit, sort, populatePaths = [] }) {
  const pagination = normalizePagination(page, limit)
  const normalizedSort = normalizeSort(sort)

  let mongoQuery = query
  if (typeof mongoQuery.populate !== 'function') {
    mongoQuery = mongoQuery
  }

  const [items, totalItems] = await Promise.all([
    populatePaths.reduce((currentQuery, populatePath) => currentQuery.populate(populatePath), mongoQuery)
      .sort(normalizedSort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    mongoQuery.model.countDocuments(mongoQuery.getQuery()),
  ])

  const totalPages = Math.max(1, Math.ceil(totalItems / pagination.limit))

  return {
    items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  }
}

export async function listInventoryImports(filters = {}) {
  const query = InventoryImport.find({
    ...(normalizeText(filters.status) ? { status: normalizeStatus(filters.status, new Set(Object.values(INVENTORY_IMPORT_STATUSES)), INVENTORY_IMPORT_STATUSES.DRAFT) } : {}),
    ...(normalizeText(filters.supplierName)
      ? {
          supplierName: {
            $regex: normalizeText(filters.supplierName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            $options: 'i',
          },
        }
      : {}),
    ...normalizeDateRangeFilter(filters.startDate, filters.endDate, 'importDate'),
  })
    .populate('importedBy', 'name email')
    .populate('confirmedBy', 'name email')

  const response = await buildListResponse(query, filters)

  return {
    items: response.items.map((item) => serializeReceiptDocument(item)),
    pagination: response.pagination,
  }
}

export async function listInventoryExports(filters = {}) {
  const query = InventoryExport.find({
    ...(normalizeText(filters.status) ? { status: normalizeStatus(filters.status, new Set(Object.values(INVENTORY_EXPORT_STATUSES)), INVENTORY_EXPORT_STATUSES.DRAFT) } : {}),
    ...(normalizeText(filters.reason) ? { reason: normalizeReason(filters.reason) } : {}),
    ...normalizeDateRangeFilter(filters.startDate, filters.endDate, 'exportDate'),
  })
    .populate('exportedBy', 'name email')
    .populate('confirmedBy', 'name email')

  const response = await buildListResponse(query, filters)

  return {
    items: response.items.map((item) => serializeReceiptDocument(item)),
    pagination: response.pagination,
  }
}

export async function listInventoryTransactions(filters = {}) {
  const query = InventoryTransaction.find({
    ...(normalizeText(filters.type) ? { type: String(filters.type || '').trim().toUpperCase() } : {}),
    ...(normalizeText(filters.productId) ? { productId: normalizeObjectId(filters.productId) } : {}),
    ...normalizeDateRangeFilter(filters.startDate, filters.endDate, 'createdAt'),
  })
    .populate('productId', 'name category image price stock minStockLevel')
    .populate('performedBy', 'name email')
    .sort(normalizeSort(filters.sort))

  const pagination = normalizePagination(filters.page, filters.limit)
  const normalizedCategory = normalizeText(filters.category).toLowerCase()
  const normalizedKeyword = normalizeText(filters.keyword).toLowerCase()

  let items = await query.lean()

  if (normalizedCategory || normalizedKeyword) {
    items = items.filter((item) => {
      const product = item.productId || {}
      const performedBy = item.performedBy || {}
      const haystack = [
        item.type,
        item.referenceType,
        item.referenceId,
        product.name,
        product.category,
        performedBy.name,
        performedBy.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesCategory = normalizedCategory ? String(product.category || '').trim().toLowerCase() === normalizedCategory : true
      const matchesKeyword = normalizedKeyword ? haystack.includes(normalizedKeyword) : true

      return matchesCategory && matchesKeyword
    })
  }

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pagination.limit))
  const paginatedItems = items.slice(pagination.skip, pagination.skip + pagination.limit)

  return {
    items: paginatedItems.map((item) => serializeTransaction(item)),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  }
}

export async function listLowStockProducts(filters = {}) {
  const pagination = normalizePagination(filters.page, filters.limit)
  const query = {
    $expr: {
      $and: [
        { $gt: ['$stock', 0] },
        { $lte: ['$stock', '$minStockLevel'] },
      ],
    },
  }

  const [items, totalItems] = await Promise.all([
    Product.find(query)
      .sort(normalizeSort(filters.sort))
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Product.countDocuments(query),
  ])

  const totalPages = Math.max(1, Math.ceil(totalItems / pagination.limit))

  return {
    items: items.map((product) => serializeProductReference(product)).filter(Boolean),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  }
}

export async function listOutOfStockProducts(filters = {}) {
  const pagination = normalizePagination(filters.page, filters.limit)
  const query = { stock: 0 }

  const [items, totalItems] = await Promise.all([
    Product.find(query)
      .sort(normalizeSort(filters.sort))
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Product.countDocuments(query),
  ])

  const totalPages = Math.max(1, Math.ceil(totalItems / pagination.limit))

  return {
    items: items.map((product) => serializeProductReference(product)).filter(Boolean),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  }
}

export async function listInventoryOverviewProducts() {
  return Product.find().select('name category price stock minStockLevel image averageRating totalReviews updatedAt').lean()
}

export { buildInventoryError, normalizeObjectId, normalizePositiveInteger, normalizePositiveNumber, normalizeDateRangeFilter, serializeReceiptDocument, serializeTransaction }
