import mongoose from 'mongoose'

const qrImageSchema = new mongoose.Schema(
  {
    data: {
      type: Buffer,
      select: false,
    },
    contentType: {
      type: String,
      trim: true,
      default: '',
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

const paymentSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'default',
      trim: true,
    },
    bankName: {
      type: String,
      default: '',
      trim: true,
    },
    accountName: {
      type: String,
      default: '',
      trim: true,
    },
    accountNumber: {
      type: String,
      default: '',
      trim: true,
    },
    transferNote: {
      type: String,
      default: '',
      trim: true,
    },
    qrImage: {
      type: qrImageSchema,
      default: () => ({}),
    },
    updatedBy: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      name: {
        type: String,
        default: '',
        trim: true,
      },
      email: {
        type: String,
        default: '',
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  },
)

const PaymentSetting = mongoose.model('PaymentSetting', paymentSettingSchema)

export default PaymentSetting
