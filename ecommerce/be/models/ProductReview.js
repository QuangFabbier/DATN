import mongoose from 'mongoose'

const productReviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    avatar: {
      type: String,
      trim: true,
      default: '',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      default: '',
      maxlength: 140,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1600,
    },
  },
  {
    timestamps: true,
  },
)

productReviewSchema.index({ productId: 1, userId: 1 }, { unique: true })
productReviewSchema.index({ productId: 1, createdAt: -1 })

const ProductReview = mongoose.model('ProductReview', productReviewSchema)

export default ProductReview
