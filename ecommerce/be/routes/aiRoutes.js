import express from 'express'
import {
  analyzeCartWithAiHandler,
  chatWithAi,
  compareWithAi,
  getInventoryInsightsHandler,
  explainProductWithAiHandler,
} from '../controllers/aiController.js'
import authMiddleware, { requireAdmin } from '../middleware/authMiddleware.js'
import { optimizeAiRequests } from '../middleware/aiOptimizationMiddleware.js'

const router = express.Router()

router.use(optimizeAiRequests)
router.post('/chat', chatWithAi)
router.post('/compare', compareWithAi)
router.post('/product-explain', explainProductWithAiHandler)
router.post('/cart-analyze', analyzeCartWithAiHandler)
router.post('/inventory-insights', authMiddleware, requireAdmin, getInventoryInsightsHandler)

export default router
