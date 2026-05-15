import mongoose from 'mongoose'

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
})

const User = mongoose.model('User', userSchema)

export default User
