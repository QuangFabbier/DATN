import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { USER_ROLES, resolveUserAccess } from '../utils/userRole.js'

function buildRequestUser(user = {}) {
  const access = resolveUserAccess(user)

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: access.role,
    isSuperAdmin: access.isSuperAdmin,
    canManageAdmins: access.canManageAdmins,
    adminLevel: access.adminLevel,
    createdAt: user.createdAt,
  }
}

async function loadRequestUserFromToken(token = '') {
  const normalizedToken = String(token || '').trim()

  if (!normalizedToken) {
    return null
  }

  if (!process.env.JWT_SECRET) {
    const configError = new Error('JWT_SECRET chua duoc cau hinh')
    configError.statusCode = 500
    throw configError
  }

  const decoded = jwt.verify(normalizedToken, process.env.JWT_SECRET)
  const user = await User.findById(decoded.id).select('-password')

  if (!user) {
    return null
  }

  return buildRequestUser(user)
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = String(req.headers.authorization || '').trim()

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Không có token xác thực' })
    }

    const token = authHeader.split(' ')[1]
    const requestUser = await loadRequestUserFromToken(token)

    if (!requestUser) {
      return res.status(401).json({ message: 'Token khong hop le' })
    }

    req.user = requestUser
    return next()
  } catch (error) {
    return res.status(error?.statusCode || 401).json({
      message: error?.statusCode === 500 ? error.message : 'Token khong hop le hoac da het han',
    })
  }
}

async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = String(req.headers.authorization || '').trim()

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.split(' ')[1]
    const requestUser = await loadRequestUserFromToken(token)

    if (requestUser) {
      req.user = requestUser
    }

    return next()
  } catch {
    return next()
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
    return res.status(403).json({ message: 'Chi super admin moi co quyen thuc hien thao tac nay' })
  }

  return next()
}

export { loadRequestUserFromToken, optionalAuthMiddleware, requireAdmin, requireSuperAdmin }
export default authMiddleware
