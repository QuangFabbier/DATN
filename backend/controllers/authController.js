import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET chưa được cấu hình trong file .env')
  }

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  })
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
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
  return res.json({ user: req.user })
}
