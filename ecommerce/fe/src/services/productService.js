import axios from 'axios'
import allProducts from '../data/all-products.json'
import { normalizeProduct } from '../utils/product'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const PRODUCTS_API_URL = `${API_BASE_URL}/products`

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

function createProductServiceError(error, fallbackMessage) {
  const serviceError = new Error(extractApiErrorMessage(error, fallbackMessage))
  serviceError.status = error?.response?.status || 500
  return serviceError
}

function normalizeProductList(products) {
  if (!Array.isArray(products)) {
    throw new Error('Invalid product response format')
  }

  return products.map((product) => normalizeProduct(product)).filter(Boolean)
}

export async function getProducts() {
  try {
    const response = await axios.get(PRODUCTS_API_URL)
    return normalizeProductList(response.data)
  } catch (error) {
    const localProducts = normalizeProductList(allProducts)
    if (localProducts.length > 0) {
      return localProducts
    }

    throw createProductServiceError(error, 'Khng th ti danh sch sn phm.')
  }
}

export async function getProductById(id) {
  try {
    const response = await axios.get(`${PRODUCTS_API_URL}/${id}`)
    const normalizedProduct = normalizeProduct(response.data)

    if (!normalizedProduct) {
      throw new Error('D liu sn phm khng hp l')
    }

    return normalizedProduct
  } catch (error) {
    throw createProductServiceError(error, 'Khng th ti chi tit sn phm.')
  }
}

export async function createProduct(productData, token = '') {
  try {
    const response = await axios.post(PRODUCTS_API_URL, productData, buildAuthRequestConfig(token))
    const normalizedProduct = normalizeProduct(response.data)

    if (!normalizedProduct) {
      throw new Error('D liu sn phm mi khng hp l')
    }

    return normalizedProduct
  } catch (error) {
    throw createProductServiceError(error, 'Khng th to sn phm.')
  }
}

export async function updateProduct(productId, productData, token = '') {
  try {
    const response = await axios.put(
      `${PRODUCTS_API_URL}/${productId}`,
      productData,
      buildAuthRequestConfig(token),
    )
    const normalizedProduct = normalizeProduct(response.data)

    if (!normalizedProduct) {
      throw new Error('D liu sn phm cp nht khng hp l')
    }

    return normalizedProduct
  } catch (error) {
    throw createProductServiceError(error, 'Khng th cp nht sn phm.')
  }
}

export async function deleteProduct(productId, token = '') {
  try {
    const response = await axios.delete(`${PRODUCTS_API_URL}/${productId}`, buildAuthRequestConfig(token))
    return response.data
  } catch (error) {
    throw createProductServiceError(error, 'Khng th xa sn phm.')
  }
}
