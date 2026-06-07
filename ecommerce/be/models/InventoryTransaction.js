import mongoose from 'mongoose'

const inventoryTransactionSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['IMPORT', 'EXPORT'],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be greater than 0'],
    },
    stockBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    stockAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    referenceType: {
      type: String,
      enum: ['INVENTORY_IMPORT', 'INVENTORY_EXPORT', 'ORDER'],
      required: true,
      index: true,
    },
    referenceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

function blockMutation() {
  const error = new Error('Inventory transactions are immutable')
  error.statusCode = 405
  throw error
}

inventoryTransactionSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'], blockMutation)

const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema)

export default InventoryTransaction
