import express from 'express'
import {
  deleteMyAvatar,
  getMe,
  getMyAvatar,
  login,
  register,
  updateMyAvatar,
} from '../controllers/authController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', authMiddleware, getMe)
router.put('/me/avatar', authMiddleware, updateMyAvatar)
router.get('/me/avatar', authMiddleware, getMyAvatar)
router.delete('/me/avatar', authMiddleware, deleteMyAvatar)

export default router
