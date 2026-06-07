import express from 'express'
import {
  createExportReceipt,
  createImportReceipt,
  getInventoryDashboardHandler,
  getInventoryExportsHandler,
  getInventoryImportsHandler,
  getInventoryTransactionsHandler,
  getLowStockProductsHandler,
  getOutOfStockProductsHandler,
} from '../controllers/inventoryController.js'
import authMiddleware, { requireAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authMiddleware, requireAdmin)

router.post('/import', createImportReceipt)
router.post('/export', createExportReceipt)
router.get('/dashboard', getInventoryDashboardHandler)
router.get('/transactions', getInventoryTransactionsHandler)
router.get('/imports', getInventoryImportsHandler)
router.get('/exports', getInventoryExportsHandler)
router.get('/low-stock', getLowStockProductsHandler)
router.get('/out-of-stock', getOutOfStockProductsHandler)

export default router
