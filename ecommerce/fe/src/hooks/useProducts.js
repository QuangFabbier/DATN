import { useEffect, useMemo, useState } from 'react'
import { getProducts } from '../services/productService'

export function useProducts() {
  const [keyword, setKeyword] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError('')
        const data = await getProducts()
        setProducts(data)
      } catch {
        setError('Không thể tải danh sách sản phẩm.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    if (!normalizedKeyword) {
      return products
    }

    return products.filter((product) => product.name.toLowerCase().includes(normalizedKeyword))
  }, [keyword, products])

  return {
    keyword,
    products: filteredProducts,
    loading,
    error,
    setKeyword,
  }
}
