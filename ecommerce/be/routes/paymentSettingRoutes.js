import express from 'express'
import {
  getPaymentQrImage,
  getPaymentSettings,
  upsertPaymentSettings,
} from '../controllers/paymentSettingController.js'
import authMiddleware, { requireSuperAdmin } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', getPaymentSettings)
router.get('/qr-image', getPaymentQrImage)
router.put('/', authMiddleware, requireSuperAdmin, upsertPaymentSettings)

export default router
