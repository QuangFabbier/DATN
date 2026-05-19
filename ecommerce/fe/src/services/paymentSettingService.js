import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const PAYMENT_SETTINGS_API_URL = `${API_BASE_URL}/payment-settings`

function buildAuthRequestConfig(token = '') {
  const normalizedToken = String(token || '').trim()

  if (!normalizedToken) {
    return undefined
  }

  return {
    headers: {
      Authorization: `Bearer ${normalizedToken}`,
    },
  }
}

function extractApiErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage
}

function createPaymentSettingServiceError(error, fallbackMessage) {
  const serviceError = new Error(extractApiErrorMessage(error, fallbackMessage))
  serviceError.status = error?.response?.status || 500
  return serviceError
}

function resolveQrImageUrl(rawUrl = '') {
  const normalizedUrl = String(rawUrl || '').trim()
  if (!normalizedUrl) {
    return ''
  }

  if (/^https?:\/\//i.test(normalizedUrl)) {
    return normalizedUrl
  }

  try {
    return new URL(normalizedUrl, API_BASE_URL).toString()
  } catch {
    return normalizedUrl
  }
}

function normalizePaymentSettings(payload = {}) {
  return {
    bankName: String(payload.bankName || ''),
    accountName: String(payload.accountName || ''),
    accountNumber: String(payload.accountNumber || ''),
    transferNote: String(payload.transferNote || ''),
    hasQrImage: Boolean(payload.hasQrImage),
    qrImageUrl: resolveQrImageUrl(payload.qrImageUrl),
    qrImageUpdatedAt: payload.qrImageUpdatedAt || null,
    updatedAt: payload.updatedAt || null,
    updatedBy: {
      name: String(payload?.updatedBy?.name || ''),
      email: String(payload?.updatedBy?.email || ''),
    },
  }
}

export async function getPaymentSettings() {
  try {
    const response = await axios.get(PAYMENT_SETTINGS_API_URL)
    return normalizePaymentSettings(response?.data?.paymentSettings || {})
  } catch (error) {
    throw createPaymentSettingServiceError(error, 'Không thể tải cấu hình thanh toán.')
  }
}

export async function updatePaymentSettings(token, payload = {}) {
  try {
    const response = await axios.put(
      PAYMENT_SETTINGS_API_URL,
      payload,
      buildAuthRequestConfig(token),
    )
    return normalizePaymentSettings(response?.data?.paymentSettings || {})
  } catch (error) {
    throw createPaymentSettingServiceError(error, 'Không thể cập nhật cấu hình thanh toán.')
  }
}
