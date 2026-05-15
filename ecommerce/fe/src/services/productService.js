import axios from 'axios'
import { normalizeProduct } from '../utils/product'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const PRODUCTS_API_URL = `${API_BASE_URL}/products`

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
    throw createProductServiceError(error, 'Không thể tải danh sách sản phẩm.')
  }
}

export async function getProductById(id) {
  try {
    const response = await axios.get(`${PRODUCTS_API_URL}/${id}`)
    const normalizedProduct = normalizeProduct(response.data)

    if (!normalizedProduct) {
      throw new Error('Dữ liệu sản phẩm không hợp lệ')
    }

    return normalizedProduct
  } catch (error) {
    throw createProductServiceError(error, 'Không thể tải chi tiết sản phẩm.')
  }
}

export async function createProduct(productData) {
  try {
    const response = await axios.post(PRODUCTS_API_URL, productData)
    const normalizedProduct = normalizeProduct(response.data)

    if (!normalizedProduct) {
      throw new Error('Dữ liệu sản phẩm mới không hợp lệ')
    }

    return normalizedProduct
  } catch (error) {
    throw createProductServiceError(error, 'Không thể tạo sản phẩm.')
  }
}

export async function updateProduct(productId, productData) {
  try {
    const response = await axios.put(`${PRODUCTS_API_URL}/${productId}`, productData)
    const normalizedProduct = normalizeProduct(response.data)

    if (!normalizedProduct) {
      throw new Error('Dữ liệu sản phẩm cập nhật không hợp lệ')
    }

    return normalizedProduct
  } catch (error) {
    throw createProductServiceError(error, 'Không thể cập nhật sản phẩm.')
  }
}

export async function deleteProduct(productId) {
  try {
    const response = await axios.delete(`${PRODUCTS_API_URL}/${productId}`)
    return response.data
  } catch (error) {
    throw createProductServiceError(error, 'Không thể xóa sản phẩm.')
  }
}
