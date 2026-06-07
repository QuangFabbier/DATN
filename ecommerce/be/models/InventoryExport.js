import mongoose from 'mongoose'

const inventoryExportItemSchema = new mongoose.Schema(
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

const inventoryExportSchema = new mongoose.Schema(
  {
    reason: {
      type: String,
      enum: ['MANUAL', 'DAMAGED', 'INTERNAL_USE', 'ADJUSTMENT'],
      required: true,
      index: true,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    exportDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'CONFIRMED'],
      default: 'DRAFT',
      index: true,
    },
    exportedBy: {
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
      type: [inventoryExportItemSchema],
      default: [],
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0
        },
        message: 'At least one export item is required',
      },
    },
  },
  {
    timestamps: true,
  },
)

const InventoryExport = mongoose.model('InventoryExport', inventoryExportSchema)

export default InventoryExport
