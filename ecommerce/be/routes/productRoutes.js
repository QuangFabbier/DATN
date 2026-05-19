import express from 'express'
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from '../controllers/productController.js'
import authMiddleware, { requireAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', getProducts)
router.get('/:id', getProductById)
router.post('/', authMiddleware, requireAdmin, createProduct)
router.put('/:id', authMiddleware, requireAdmin, updateProduct)
router.delete('/:id', authMiddleware, requireAdmin, deleteProduct)

export default router
