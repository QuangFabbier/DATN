import express from 'express'
import { chatWithAi, compareWithAi } from '../controllers/aiController.js'

const router = express.Router()

router.post('/chat', chatWithAi)
router.post('/compare', compareWithAi)

export default router