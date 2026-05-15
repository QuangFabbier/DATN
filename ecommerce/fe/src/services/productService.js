import {
  createProductRecord,
  deleteProductRecord,
  readProductById,
  readProducts,
  updateProductRecord,
} from './productStorage'

export async function getProducts() {
  return readProducts()
}

export async function getProductById(id) {
  return readProductById(id)
}

export async function createProduct(productData) {
  return createProductRecord(productData)
}

export async function updateProduct(productId, productData) {
  return updateProductRecord(productId, productData)
}

export async function deleteProduct(productId) {
  return deleteProductRecord(productId)
}
