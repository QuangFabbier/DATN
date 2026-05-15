import express from 'express'

const router = express.Router()

// Route kiểm tra backend hoạt động.
router.get('/', (req, res) => {
  res.json({ message: 'Backend is running' })
})

export default router
