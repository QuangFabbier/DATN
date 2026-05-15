import mongoose from 'mongoose'

const specSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: '',
    },
    value: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false },
)

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be greater than or equal to 0'],
    },
    stock: {
      type: Number,
      required: [true, 'Product stock is required'],
      min: [0, 'Stock must be greater than or equal to 0'],
      default: 0,
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    images: {
      type: [String],
      default: [],
    },
    specs: {
      type: [specSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
)

const Product = mongoose.model('Product', productSchema)

export default Product
