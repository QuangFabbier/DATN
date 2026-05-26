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
      id: String(item?.id || item?._id || ''),
      name: String(item?.name || '').trim(),
      category: String(item?.category || '').trim(),
      description: String(item?.description || '').trim(),
      price: Number(item?.price || 0),
      stock: Number(item?.stock || 0),
      image: String(item?.image || '').trim(),
      specs: Array.isArray(item?.specs)
        ? item.specs
            .map((spec) => ({
              label: String(spec?.label || '').trim(),
              value: String(spec?.value || '').trim(),
            }))
            .filter((spec) => spec.label || spec.value)
        : [],
    }))
    .filter((item) => item.id && item.name)
}

function normalizePick(item) {
  return {
    productId: String(item?.productId || '').trim(),
    reason: String(item?.reason || '').trim(),
  }
}

export async function chatWithAi(payload = {}) {
  try {
    const response = await axios.post(`${AI_API_URL}/chat`, payload, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    })

    return {
      reply: String(response?.data?.reply || '').trim(),
      intent: response?.data?.intent && typeof response.data.intent === 'object' ? response.data.intent : null,
      bestProductId: String(response?.data?.bestProductId || '').trim(),
      needMoreInfo: Boolean(response?.data?.needMoreInfo),
      followUpQuestion: String(response?.data?.followUpQuestion || '').trim(),
      recommendedProducts: normalizeRecommendedProducts(response?.data?.recommendedProducts),
    }
  } catch (error) {
    throw createAiServiceError(error, 'Khong the goi tu van AI luc nay.')
  }
}

export async function compareProductsWithAi(payload = {}) {
  try {
    const response = await axios.post(`${AI_API_URL}/compare`, payload, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    })

    return {
      comparedProducts: normalizeRecommendedProducts(response?.data?.comparedProducts),
      summary: String(response?.data?.summary || '').trim(),
      bestForStudy: normalizePick(response?.data?.bestForStudy),
      bestForGaming: normalizePick(response?.data?.bestForGaming),
      bestValue: normalizePick(response?.data?.bestValue),
      recommendation: String(response?.data?.recommendation || '').trim(),
    }
  } catch (error) {
    throw createAiServiceError(error, 'Khong the goi so sanh AI luc nay.')
  }
}
