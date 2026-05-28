import express from 'express'
import {
  analyzeCartWithAiHandler,
  chatWithAi,
  compareWithAi,
  explainProductWithAiHandler,
} from '../controllers/aiController.js'
import { optimizeAiRequests } from '../middleware/aiOptimizationMiddleware.js'

const router = express.Router()

router.use(optimizeAiRequests)
router.post('/chat', chatWithAi)
router.post('/compare', compareWithAi)
router.post('/product-explain', explainProductWithAiHandler)
router.post('/cart-analyze', analyzeCartWithAiHandler)

export default router
