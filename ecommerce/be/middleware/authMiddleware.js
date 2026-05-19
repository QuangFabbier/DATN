import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { USER_ROLES, resolveUserAccess } from '../utils/userRole.js'

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

    const access = resolveUserAccess(user)

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: access.role,
      isSuperAdmin: access.isSuperAdmin,
      canManageAdmins: access.canManageAdmins,
      adminLevel: access.adminLevel,
      createdAt: user.createdAt,
    }

    return next()
  } catch (error) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' })
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Yêu cầu đăng nhập' })
  }

  if (req.user.role !== USER_ROLES.ADMIN) {
    return res.status(403).json({ message: 'Bạn không có quyền quản trị để thao tác sản phẩm' })
  }

  return next()
}

function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Yêu cầu đăng nhập' })
  }

  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ message: 'Chỉ super admin mới có quyền thực hiện thao tác này' })
  }

  return next()
}

export { requireAdmin, requireSuperAdmin }
export default authMiddleware
