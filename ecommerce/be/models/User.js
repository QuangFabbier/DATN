import mongoose from 'mongoose'
import { USER_ROLES } from '../utils/userRole.js'

const avatarSchema = new mongoose.Schema(
  {
    data: {
      type: Buffer,
      select: false,
    },
    contentType: {
      type: String,
      default: '',
      trim: true,
    },
    size: {
      type: Number,
      default: 0,
      min: 0,
    },
    updatedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
)

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  avatar: {
    type: avatarSchema,
    default: () => ({}),
  },
  role: {
    type: String,
    enum: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN],
    default: USER_ROLES.CUSTOMER,
    trim: true,
    lowercase: true,
  },
})

const User = mongoose.model('User', userSchema)

export default User
