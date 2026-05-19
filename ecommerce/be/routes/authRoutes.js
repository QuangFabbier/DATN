import express from 'express'
import {
  getAdminAccessList,
  grantSubAdminAccess,
  deleteMyAvatar,
  getMe,
  getMyAvatar,
  login,
  register,
  revokeSubAdminAccess,
  updateMyAvatar,
} from '../controllers/authController.js'
import authMiddleware, { requireSuperAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', authMiddleware, getMe)
router.put('/me/avatar', authMiddleware, updateMyAvatar)
router.get('/me/avatar', authMiddleware, getMyAvatar)
router.delete('/me/avatar', authMiddleware, deleteMyAvatar)
router.get('/admin-access', authMiddleware, requireSuperAdmin, getAdminAccessList)
router.post('/admin-access/grant', authMiddleware, requireSuperAdmin, grantSubAdminAccess)
router.post('/admin-access/revoke', authMiddleware, requireSuperAdmin, revokeSubAdminAccess)

export default router
