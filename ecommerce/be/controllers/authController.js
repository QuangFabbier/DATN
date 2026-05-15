import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const DEFAULT_AVATAR_MAX_SIZE = 2 * 1024 * 1024
const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET chưa được cấu hình trong file .env')
  }

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  })
}

function getAvatarMaxSize() {
  const configuredSize = Number(process.env.AVATAR_MAX_SIZE)
  return Number.isFinite(configuredSize) && configuredSize > 0 ? configuredSize : DEFAULT_AVATAR_MAX_SIZE
}

function buildAvatarUrl(user) {
  const avatarSize = Number(user?.avatar?.size || 0)

  if (avatarSize <= 0) {
    return ''
  }

  const updatedTimestamp = user?.avatar?.updatedAt ? new Date(user.avatar.updatedAt).getTime() : null
  return updatedTimestamp
    ? `/api/auth/me/avatar?v=${updatedTimestamp}`
    : '/api/auth/me/avatar'
}

function sanitizeUser(user) {
  const avatarSize = Number(user?.avatar?.size || 0)

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    hasAvatar: avatarSize > 0,
    avatarUrl: buildAvatarUrl(user),
    avatarUpdatedAt: user?.avatar?.updatedAt || null,
  }
}

function parseAvatarDataUrl(avatarData) {
  const avatarString = String(avatarData || '').trim()

  if (!avatarString) {
    return null
  }

  const dataUrlPattern = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/
  const matchedData = avatarString.match(dataUrlPattern)

  if (!matchedData) {
    const parseError = new Error('Ảnh đại diện phải ở định dạng data URL base64 hợp lệ')
    parseError.statusCode = 400
    throw parseError
  }

  const [, mimeType, base64Payload] = matchedData

  if (!ALLOWED_AVATAR_MIME_TYPES.has(mimeType)) {
    const unsupportedFileError = new Error('Định dạng ảnh chưa được hỗ trợ (chỉ nhận jpeg, png, webp, gif)')
    unsupportedFileError.statusCode = 400
    throw unsupportedFileError
  }

  const avatarBuffer = Buffer.from(base64Payload, 'base64')

  if (avatarBuffer.length === 0) {
    const emptyFileError = new Error('Ảnh đại diện rỗng')
    emptyFileError.statusCode = 400
    throw emptyFileError
  }

  const avatarMaxSize = getAvatarMaxSize()
  if (avatarBuffer.length > avatarMaxSize) {
    const exceededSizeError = new Error(`Ảnh đại diện vượt quá giới hạn ${avatarMaxSize} bytes`)
    exceededSizeError.statusCode = 400
    throw exceededSizeError
  }

  return {
    mimeType,
    buffer: avatarBuffer,
    size: avatarBuffer.length,
  }
}

export async function register(req, res) {
  try {
    const body = req.body || {}
    const { name, email, password } = body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ name, email và password' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Không cho đăng ký trùng email.
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    })

    return res.status(201).json({
      message: 'Đăng ký thành công',
      user: sanitizeUser(user),
    })
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi đăng ký', error: error.message })
  }
}

export async function login(req, res) {
  try {
    const body = req.body || {}
    const { email, password } = body

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và password' })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail }).select('+password')

    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' })
    }

    const token = createToken(user._id)

    return res.json({
      message: 'Đăng nhập thành công',
      token,
      user: sanitizeUser(user),
    })
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi đăng nhập', error: error.message })
  }
}

export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id)

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' })
    }

    return res.json({ user: sanitizeUser(user) })
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi lấy thông tin người dùng', error: error.message })
  }
}

export async function updateMyAvatar(req, res) {
  try {
    const user = await User.findById(req.user.id).select('+avatar.data')

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' })
    }

    const avatarPayload = parseAvatarDataUrl(req.body?.avatar)

    // Nếu avatar rỗng thì coi như xóa avatar hiện tại.
    if (!avatarPayload) {
      const hadOldAvatar = Number(user?.avatar?.size || 0) > 0
      user.avatar = {
        data: undefined,
        contentType: '',
        size: 0,
        updatedAt: null,
      }
      await user.save()

      return res.json({
        message: hadOldAvatar ? 'Đã xóa ảnh đại diện cũ' : 'Không có ảnh đại diện để xóa',
        user: sanitizeUser(user),
      })
    }

    const hadOldAvatar = Number(user?.avatar?.size || 0) > 0

    // Ghi đè trực tiếp: ảnh cũ bị loại khỏi document, chỉ giữ ảnh mới.
    user.avatar = {
      data: avatarPayload.buffer,
      contentType: avatarPayload.mimeType,
      size: avatarPayload.size,
      updatedAt: new Date(),
    }

    await user.save()

    return res.json({
      message: hadOldAvatar
        ? 'Cập nhật ảnh đại diện thành công, ảnh cũ đã được thay thế'
        : 'Tải ảnh đại diện thành công',
      user: sanitizeUser(user),
    })
  } catch (error) {
    const statusCode = error.statusCode || 500
    return res.status(statusCode).json({
      message: statusCode === 500 ? 'Lỗi cập nhật ảnh đại diện' : error.message,
      error: statusCode === 500 ? error.message : undefined,
    })
  }
}

export async function getMyAvatar(req, res) {
  try {
    const user = await User.findById(req.user.id).select('+avatar.data avatar.contentType avatar.size')

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' })
    }

    if (!user.avatar?.data || Number(user.avatar?.size || 0) === 0) {
      return res.status(404).json({ message: 'Người dùng chưa có ảnh đại diện' })
    }

    res.setHeader('Content-Type', user.avatar.contentType || 'application/octet-stream')
    res.setHeader('Content-Length', String(user.avatar.size))
    return res.send(user.avatar.data)
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi lấy ảnh đại diện', error: error.message })
  }
}

export async function deleteMyAvatar(req, res) {
  try {
    const user = await User.findById(req.user.id).select('+avatar.data')

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' })
    }

    const hadOldAvatar = Number(user?.avatar?.size || 0) > 0
    user.avatar = {
      data: undefined,
      contentType: '',
      size: 0,
      updatedAt: null,
    }
    await user.save()

    return res.json({
      message: hadOldAvatar ? 'Đã xóa ảnh đại diện thành công' : 'Không có ảnh đại diện để xóa',
      user: sanitizeUser(user),
    })
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi xóa ảnh đại diện', error: error.message })
  }
}
