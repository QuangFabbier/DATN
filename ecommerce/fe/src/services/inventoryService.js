import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const INVENTORY_API_URL = `${API_BASE_URL}/inventory`
const AI_API_URL = `${API_BASE_URL}/ai`

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

function buildQueryParams(params = {}) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue
    }
    searchParams.set(key, String(value))
  }

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

async function requestInventory(method, path, { data, token } = {}) {
  try {
    const response = await axios.request({
      method,
      url: `${INVENTORY_API_URL}${path}`,
      data,
      ...(buildAuthRequestConfig(token) || {}),
    })

    return response.data
  } catch (error) {
    throw createServiceError(error, 'Không thể tải dữ liệu kho.')
  }
}

export async function getInventoryDashboard(token = '') {
  return requestInventory('get', '/dashboard', { token })
}

export async function createInventoryImport(payload, token = '') {
  return requestInventory('post', '/import', { data: payload, token })
}

export async function createInventoryExport(payload, token = '') {
  return requestInventory('post', '/export', { data: payload, token })
}

export async function getInventoryTransactions(filters = {}, token = '') {
  return requestInventory('get', `/transactions${buildQueryParams(filters)}`, { token })
}

export async function getInventoryImports(filters = {}, token = '') {
  return requestInventory('get', `/imports${buildQueryParams(filters)}`, { token })
}

export async function getInventoryExports(filters = {}, token = '') {
  return requestInventory('get', `/exports${buildQueryParams(filters)}`, { token })
}

export async function getLowStockProducts(filters = {}, token = '') {
  return requestInventory('get', `/low-stock${buildQueryParams(filters)}`, { token })
}

export async function getOutOfStockProducts(filters = {}, token = '') {
  return requestInventory('get', `/out-of-stock${buildQueryParams(filters)}`, { token })
}

export async function getInventoryInsights(token = '', query = {}) {
  try {
    const response = await axios.post(`${AI_API_URL}/inventory-insights`, query, buildAuthRequestConfig(token))
    return response.data
  } catch (error) {
    throw createServiceError(error, 'Không thể tải gợi ý AI cho kho.')
  }
}
