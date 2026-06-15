import express from 'express'
import { consumeOrderInventoryHandler } from '../controllers/orderInventoryController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/consume-stock', authMiddleware, consumeOrderInventoryHandler)

export default router
