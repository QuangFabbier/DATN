export function getProductId(product) {
  if (!product || typeof product !== 'object') {
    return ''
  }

  return String(product._id || product.id || '')
}

export function getProductStock(product) {
  const stock = Number(product?.stock)

  if (!Number.isFinite(stock) || stock < 0) {
    return null
  }

  return stock
}

export function normalizeProduct(product) {
  if (!product || typeof product !== 'object') {
    return null
  }

  const productId = getProductId(product)
  const stock = getProductStock(product)
  const price = Number(product.price)

  return {
    ...product,
    id: productId || product.id,
    stock,
    price: Number.isFinite(price) ? price : 0,
  }
}
