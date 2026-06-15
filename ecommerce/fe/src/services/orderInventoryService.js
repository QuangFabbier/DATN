import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const ORDER_INVENTORY_API_URL = `${API_BASE_URL}/orders`

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

function createServiceError(error, fallbackMessage) {
  const serviceError = new Error(extractApiErrorMessage(error, fallbackMessage))
  serviceError.status = error?.response?.status || 500
  return serviceError
}

export async function consumeOrderStock(orderPayload, token = '') {
  try {
    const response = await axios.post(
      `${ORDER_INVENTORY_API_URL}/consume-stock`,
      orderPayload,
      buildAuthRequestConfig(token),
    )

    return response.data
  } catch (error) {
    throw createServiceError(error, 'Không thể cập nhật tồn kho cho đơn hàng.')
  }
}
