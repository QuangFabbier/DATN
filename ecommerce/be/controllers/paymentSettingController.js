import PaymentSetting from '../models/PaymentSetting.js'

const DEFAULT_QR_IMAGE_MAX_SIZE = 3 * 1024 * 1024
const ALLOWED_QR_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function getQrImageMaxSize() {
  const configuredSize = Number(process.env.PAYMENT_QR_MAX_SIZE)
  return Number.isFinite(configuredSize) && configuredSize > 0 ? configuredSize : DEFAULT_QR_IMAGE_MAX_SIZE
}

async function getOrCreatePaymentSetting(includeQrImageData = false) {
  const query = includeQrImageData ? PaymentSetting.findOne({ key: 'default' }).select('+qrImage.data') : PaymentSetting.findOne({ key: 'default' })
  let setting = await query

  if (!setting) {
    setting = await PaymentSetting.create({ key: 'default' })
    if (includeQrImageData) {
      setting = await PaymentSetting.findById(setting._id).select('+qrImage.data')
    }
  }

  return setting
}

function buildQrImageUrl(setting) {
  const qrImageSize = Number(setting?.qrImage?.size || 0)
  if (qrImageSize <= 0) {
    return ''
  }

  const updatedTimestamp = setting?.qrImage?.updatedAt
    ? new Date(setting.qrImage.updatedAt).getTime()
    : null

  return updatedTimestamp
    ? `/api/payment-settings/qr-image?v=${updatedTimestamp}`
    : '/api/payment-settings/qr-image'
}

function sanitizePaymentSetting(setting) {
  const qrImageSize = Number(setting?.qrImage?.size || 0)

  return {
    bankName: String(setting?.bankName || ''),
    accountName: String(setting?.accountName || ''),
    accountNumber: String(setting?.accountNumber || ''),
    transferNote: String(setting?.transferNote || ''),
    hasQrImage: qrImageSize > 0,
    qrImageUrl: buildQrImageUrl(setting),
    qrImageUpdatedAt: setting?.qrImage?.updatedAt || null,
    updatedAt: setting?.updatedAt || null,
    updatedBy: {
      name: String(setting?.updatedBy?.name || ''),
      email: String(setting?.updatedBy?.email || ''),
    },
  }
}

function parseQrImageDataUrl(qrImageData) {
  const qrImageString = String(qrImageData || '').trim()
  if (!qrImageString) {
    return null
  }

  const dataUrlPattern = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/
  const matchedData = qrImageString.match(dataUrlPattern)

  if (!matchedData) {
    const parseError = new Error('Ảnh QR phải ở định dạng data URL base64 hợp lệ')
    parseError.statusCode = 400
    throw parseError
  }

  const [, mimeType, base64Payload] = matchedData
  if (!ALLOWED_QR_IMAGE_MIME_TYPES.has(mimeType)) {
    const unsupportedFileError = new Error('Định dạng ảnh QR chưa được hỗ trợ (chỉ nhận jpeg, png, webp, gif)')
    unsupportedFileError.statusCode = 400
    throw unsupportedFileError
  }

  const qrImageBuffer = Buffer.from(base64Payload, 'base64')
  if (qrImageBuffer.length === 0) {
    const emptyFileError = new Error('Ảnh QR rỗng')
    emptyFileError.statusCode = 400
    throw emptyFileError
  }

  const qrImageMaxSize = getQrImageMaxSize()
  if (qrImageBuffer.length > qrImageMaxSize) {
    const exceededSizeError = new Error(`Ảnh QR vượt quá giới hạn ${qrImageMaxSize} bytes`)
    exceededSizeError.statusCode = 400
    throw exceededSizeError
  }

  return {
    mimeType,
    buffer: qrImageBuffer,
    size: qrImageBuffer.length,
  }
}

export async function getPaymentSettings(req, res) {
  try {
    const setting = await getOrCreatePaymentSetting(false)
    return res.json({
      paymentSettings: sanitizePaymentSetting(setting),
    })
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi tải cấu hình thanh toán' })
  }
}

export async function getPaymentQrImage(req, res) {
  try {
    const setting = await getOrCreatePaymentSetting(true)
    const qrImageData = setting?.qrImage?.data
    const qrImageContentType = String(setting?.qrImage?.contentType || '')

    if (!qrImageData || !qrImageData.length || !qrImageContentType) {
      return res.status(404).json({ message: 'Chưa có ảnh QR thanh toán' })
    }

    res.setHeader('Content-Type', qrImageContentType)
    res.setHeader('Content-Length', qrImageData.length)
    res.setHeader('Cache-Control', 'public, max-age=60')
    return res.send(qrImageData)
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi tải ảnh QR thanh toán' })
  }
}

export async function upsertPaymentSettings(req, res) {
  try {
    const body = req.body || {}
    const setting = await getOrCreatePaymentSetting(true)

    if (Object.prototype.hasOwnProperty.call(body, 'bankName')) {
      setting.bankName = String(body.bankName || '').trim()
    }

    if (Object.prototype.hasOwnProperty.call(body, 'accountName')) {
      setting.accountName = String(body.accountName || '').trim()
    }

    if (Object.prototype.hasOwnProperty.call(body, 'accountNumber')) {
      setting.accountNumber = String(body.accountNumber || '').trim()
    }

    if (Object.prototype.hasOwnProperty.call(body, 'transferNote')) {
      setting.transferNote = String(body.transferNote || '').trim()
    }

    if (body.removeQrImage) {
      setting.qrImage = {
        data: null,
        contentType: '',
        size: 0,
        updatedAt: null,
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'qrImage')) {
      const parsedQrImage = parseQrImageDataUrl(body.qrImage)

      if (!parsedQrImage) {
        setting.qrImage = {
          data: null,
          contentType: '',
          size: 0,
          updatedAt: null,
        }
      } else {
        setting.qrImage = {
          data: parsedQrImage.buffer,
          contentType: parsedQrImage.mimeType,
          size: parsedQrImage.size,
          updatedAt: new Date(),
        }
      }
    }

    setting.updatedBy = {
      id: req.user?.id || null,
      name: String(req.user?.name || ''),
      email: String(req.user?.email || ''),
    }

    await setting.save()

    return res.json({
      message: 'Cập nhật cấu hình thanh toán thành công',
      paymentSettings: sanitizePaymentSetting(setting),
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message })
    }

    return res.status(500).json({ message: 'Lỗi cập nhật cấu hình thanh toán' })
  }
}
