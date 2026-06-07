import asyncHandler from '../utils/asyncHandler.js'
import {
  createInventoryExport,
  createInventoryImport,
  listInventoryExports,
  listInventoryImports,
  listInventoryTransactions,
  listLowStockProducts,
  listOutOfStockProducts,
} from '../services/inventoryService.js'
import { getInventoryDashboard } from '../services/inventoryDashboardService.js'

const createImportReceipt = asyncHandler(async (req, res) => {
  const result = await createInventoryImport(req.body, req.user)

  res.status(201).json({
    message: 'Tao phieu nhap kho thanh cong.',
    ...result,
  })
})

const createExportReceipt = asyncHandler(async (req, res) => {
  const result = await createInventoryExport(req.body, req.user)

  res.status(201).json({
    message: 'Tao phieu xuat kho thanh cong.',
    ...result,
  })
})

const getInventoryDashboardHandler = asyncHandler(async (req, res) => {
  const result = await getInventoryDashboard()

  res.status(200).json({
    message: 'Lay dashboard inventory thanh cong.',
    ...result,
  })
})

const getInventoryTransactionsHandler = asyncHandler(async (req, res) => {
  const result = await listInventoryTransactions({
    type: req.query.type,
    productId: req.query.productId,
    category: req.query.category,
    keyword: req.query.keyword,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort,
  })

  res.status(200).json({
    message: 'Lay danh sach giao dich kho thanh cong.',
    ...result,
  })
})

const getInventoryImportsHandler = asyncHandler(async (req, res) => {
  const result = await listInventoryImports({
    status: req.query.status,
    supplierName: req.query.supplierName,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort,
  })

  res.status(200).json({
    message: 'Lay danh sach phieu nhap thanh cong.',
    ...result,
  })
})

const getInventoryExportsHandler = asyncHandler(async (req, res) => {
  const result = await listInventoryExports({
    status: req.query.status,
    reason: req.query.reason,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort,
  })

  res.status(200).json({
    message: 'Lay danh sach phieu xuat thanh cong.',
    ...result,
  })
})

const getLowStockProductsHandler = asyncHandler(async (req, res) => {
  const result = await listLowStockProducts({
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort,
  })

  res.status(200).json({
    message: 'Lay danh sach san pham sap het hang thanh cong.',
    ...result,
  })
})

const getOutOfStockProductsHandler = asyncHandler(async (req, res) => {
  const result = await listOutOfStockProducts({
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort,
  })

  res.status(200).json({
    message: 'Lay danh sach san pham het hang thanh cong.',
    ...result,
  })
})

export {
  createExportReceipt,
  createImportReceipt,
  getInventoryDashboardHandler,
  getInventoryExportsHandler,
  getInventoryImportsHandler,
  getInventoryTransactionsHandler,
  getLowStockProductsHandler,
  getOutOfStockProductsHandler,
}
