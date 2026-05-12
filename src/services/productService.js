import mockProducts from '../data/products.json'

export async function getProducts() {
  return mockProducts
}

export async function getProductById(id) {
  const product = mockProducts.find((item) => String(item.id) === String(id))

  if (!product) {
    const error = new Error('Không tìm thấy sản phẩm')
    error.response = { status: 404 }
    throw error
  }

  return product
}
