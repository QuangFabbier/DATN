import jwt from 'jsonwebtoken'
import User from '../models/User.js'

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Không có token xác thực' })
    }

    const token = authHeader.split(' ')[1]

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT_SECRET chưa được cấu hình' })
    }

    // Decode token để lấy user id đã ký lúc login.
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')

    if (!user) {
      return res.status(401).json({ message: 'Token không hợp lệ' })
    }

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    }

    return next()
  } catch (error) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn', error: error.message })
  }
}

export default authMiddleware
