import express from 'express'
import authMiddleware, { optionalAuthMiddleware, requireAdmin } from '../middleware/authMiddleware.js'
import { reviewWriteRateLimit } from '../middleware/reviewRateLimitMiddleware.js'
import {
  createReview,
  deleteReview,
  getAdminReviews,
  listProductReviews,
  updateReview,
} from '../controllers/reviewController.js'

const router = express.Router()

router.get('/', authMiddleware, requireAdmin, getAdminReviews)
router.get('/product/:productId', optionalAuthMiddleware, listProductReviews)
router.post('/product/:productId', authMiddleware, reviewWriteRateLimit, createReview)
router.put('/:id', authMiddleware, reviewWriteRateLimit, updateReview)
router.delete('/:id', authMiddleware, reviewWriteRateLimit, deleteReview)

export default router
