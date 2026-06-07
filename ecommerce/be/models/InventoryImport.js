import mongoose from 'mongoose'

const inventoryImportItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be greater than 0'],
    },
    importPrice: {
      type: Number,
      required: true,
      min: [0.01, 'Import price must be greater than 0'],
    },
    stockBefore: {
      type: Number,
      default: 0,
      min: 0,
    },
    stockAfter: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
)

const inventoryImportSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    importDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'CONFIRMED'],
      default: 'DRAFT',
      index: true,
    },
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    items: {
      type: [inventoryImportItemSchema],
      default: [],
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0
        },
        message: 'At least one import item is required',
      },
    },
  },
  {
    timestamps: true,
  },
)

const InventoryImport = mongoose.model('InventoryImport', inventoryImportSchema)

export default InventoryImport
