import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const AI_API_URL = `${API_BASE_URL}/ai`

function extractApiErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage
}

function createAiServiceError(error, fallbackMessage) {
  const serviceError = new Error(extractApiErrorMessage(error, fallbackMessage))
  serviceError.status = error?.response?.status || 500
  return serviceError
}

function normalizeRecommendedProducts(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => ({
      id: String(item?.id || ''),
      name: String(item?.name || '').trim(),
      category: String(item?.category || '').trim(),
      description: String(item?.description || '').trim(),
      price: Number(item?.price || 0),
      stock: Number(item?.stock || 0),
      image: String(item?.image || '').trim(),
    }))
    .filter((item) => item.id && item.name)
}

export async function chatWithAi(payload = {}) {
  try {
    const response = await axios.post(`${AI_API_URL}/chat`, payload)

    return {
      reply: String(response?.data?.reply || '').trim(),
      recommendedProducts: normalizeRecommendedProducts(response?.data?.recommendedProducts),
    }
  } catch (error) {
    throw createAiServiceError(error, 'Không thể gọi tư vấn AI lúc này.')
  }
}
