import Product from '../models/Product.js'

export async function getProducts(req, res) {
  try {
    // Lấy toàn bộ sản phẩm, mới nhất hiển thị trước.
    const products = await Product.find().sort({ createdAt: -1 })
    return res.json(products)
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi lấy danh sách sản phẩm', error: error.message })
  }
}

export async function getProductById(req, res) {
  try {
    const { id } = req.params
    const product = await Product.findById(id)

    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' })
    }

    return res.json(product)
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi lấy chi tiết sản phẩm', error: error.message })
  }
}
