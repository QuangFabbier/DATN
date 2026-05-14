import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import { AdminProductsSkeleton } from '../../components/Skeleton'
import { ButtonSpinner } from '../../components/Spinner'
import { useToast } from '../../hooks/useToast'
import { createProduct, deleteProduct, getProducts, updateProduct } from '../../services/productService'
import { PRODUCT_PLACEHOLDER_IMAGE } from '../../services/productStorage'
import { formatCurrency } from '../../utils/formatCurrency'
import { withMinimumDelay } from '../../utils/timing'

const initialFormData = {
  name: '',
  category: '',
  price: '',
  image: '',
  description: '',
  stock: '',
}

function AdminProducts() {
  const { showToast } = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tất cả')
  const [selectedStatus, setSelectedStatus] = useState('Tất cả')
  const [sortBy, setSortBy] = useState('newest')
  const [formData, setFormData] = useState(initialFormData)
  const [formErrors, setFormErrors] = useState({})
  const [editingProductId, setEditingProductId] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState('')

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError('')
        const data = await withMinimumDelay(getProducts(), 220)
        setProducts(data)
      } catch {
        setError('Không thể tải danh sách sản phẩm quản trị.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const categories = useMemo(
    () => ['Tất cả', ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products],
  )

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase()

    const nextProducts = products
      .filter((product) =>
        normalizedKeyword ? product.name.toLowerCase().includes(normalizedKeyword) : true,
      )
      .filter((product) => (selectedCategory === 'Tất cả' ? true : product.category === selectedCategory))
      .filter((product) => {
        if (selectedStatus === 'Tất cả') {
          return true
        }

        return selectedStatus === 'Còn hàng' ? product.stock > 0 : product.stock === 0
      })

    return [...nextProducts].sort((firstProduct, secondProduct) => {
      if (sortBy === 'priceAsc') {
        return firstProduct.price - secondProduct.price
      }

      if (sortBy === 'priceDesc') {
        return secondProduct.price - firstProduct.price
      }

      if (sortBy === 'stockAsc') {
        return firstProduct.stock - secondProduct.stock
      }

      if (sortBy === 'stockDesc') {
        return secondProduct.stock - firstProduct.stock
      }

      return new Date(secondProduct.createdAt).getTime() - new Date(firstProduct.createdAt).getTime()
    })
  }, [products, searchKeyword, selectedCategory, selectedStatus, sortBy])

  function resetForm() {
    setFormData(initialFormData)
    setFormErrors({})
    setEditingProductId('')
    setIsFormOpen(false)
    setIsSubmitting(false)
  }

  function handleFormChange(event) {
    const { name, value } = event.target

    setFormData((currentData) => ({ ...currentData, [name]: value }))
    setFormErrors((currentErrors) => ({ ...currentErrors, [name]: '' }))
    setError('')
  }

  function validateForm() {
    const nextErrors = {}
    const price = Number(formData.price)
    const stock = Number(formData.stock)

    if (!formData.name.trim()) {
      nextErrors.name = 'Vui lòng nhập tên sản phẩm.'
    }

    if (!formData.category.trim()) {
      nextErrors.category = 'Vui lòng nhập danh mục.'
    }

    if (formData.price === '') {
      nextErrors.price = 'Vui lòng nhập giá.'
    } else if (!Number.isFinite(price) || price < 0) {
      nextErrors.price = 'Giá phải lớn hơn hoặc bằng 0.'
    }

    if (formData.stock === '') {
      nextErrors.stock = 'Vui lòng nhập tồn kho.'
    } else if (!Number.isFinite(stock) || stock < 0) {
      nextErrors.stock = 'Tồn kho phải lớn hơn hoặc bằng 0.'
    }

    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!validateForm() || isSubmitting) {
      return
    }

    try {
      setError('')
      setIsSubmitting(true)

      const payload = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: Number(formData.price),
        image: formData.image.trim(),
        description: formData.description.trim(),
        stock: Number(formData.stock),
      }

      if (editingProductId) {
        const result = await withMinimumDelay(updateProduct(editingProductId, payload), 280)
        setProducts(result.products)
        showToast({
          type: 'success',
          title: 'Cập nhật sản phẩm thành công',
          message: `${payload.name} đã được cập nhật trong storefront.`,
        })
      } else {
        const result = await withMinimumDelay(createProduct(payload), 280)
        setProducts(result.products)
        showToast({
          type: 'success',
          title: 'Thêm sản phẩm thành công',
          message: `${payload.name} đã được thêm vào danh sách sản phẩm.`,
        })
      }

      resetForm()
    } catch (submitError) {
      setError(submitError.message || 'Không thể lưu sản phẩm.')
      showToast({
        type: 'error',
        title: 'Không thể lưu sản phẩm',
        message: submitError.message || 'Vui lòng thử lại.',
      })
      setIsSubmitting(false)
    }
  }

  function handleOpenCreateForm() {
    setIsFormOpen(true)
    setEditingProductId('')
    setFormData(initialFormData)
    setFormErrors({})
    setError('')
  }

  function handleEditProduct(product) {
    setEditingProductId(product.id)
    setIsFormOpen(true)
    setFormErrors({})
    setError('')
    setFormData({
      name: product.name || '',
      category: product.category || '',
      price: String(product.price ?? ''),
      image: product.image === PRODUCT_PLACEHOLDER_IMAGE ? '' : product.image || '',
      description: product.description || '',
      stock: String(product.stock ?? ''),
    })
  }

  async function handleDeleteProduct(product) {
    const shouldDelete = window.confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}" không?`)

    if (!shouldDelete) {
      return
    }

    try {
      setError('')
      setDeletingProductId(product.id)
      const result = await withMinimumDelay(deleteProduct(product.id), 240)

      setProducts(result.products)
      showToast({
        type: 'success',
        title: 'Xóa sản phẩm thành công',
        message: `${product.name} đã được xóa khỏi hệ thống.`,
      })

      if (editingProductId === product.id) {
        resetForm()
      }

      if (selectedProduct?.id === product.id) {
        setSelectedProduct(null)
      }
    } catch (deleteError) {
      setError(deleteError.message || 'Không thể xóa sản phẩm.')
      showToast({
        type: 'error',
        title: 'Không thể xóa sản phẩm',
        message: deleteError.message || 'Vui lòng thử lại.',
      })
    } finally {
      setDeletingProductId('')
    }
  }

  if (loading) {
    return <AdminProductsSkeleton />
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">Quản lý sản phẩm</p>
          <h2>Admin Products</h2>
        </div>
        <button type="button" className="button" onClick={handleOpenCreateForm}>
          Thêm sản phẩm
        </button>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}

      <div className="admin-toolbar">
        <input
          type="search"
          value={searchKeyword}
          onChange={(event) => setSearchKeyword(event.target.value)}
          placeholder="Tìm theo tên sản phẩm"
        />
        <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
          <option value="Tất cả">Tất cả trạng thái</option>
          <option value="Còn hàng">Còn hàng</option>
          <option value="Hết hàng">Hết hàng</option>
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="newest">Mới nhất</option>
          <option value="priceAsc">Giá tăng dần</option>
          <option value="priceDesc">Giá giảm dần</option>
          <option value="stockAsc">Tồn kho tăng dần</option>
          <option value="stockDesc">Tồn kho giảm dần</option>
        </select>
      </div>

      {isFormOpen ? (
        <form className="admin-form-card" onSubmit={handleSubmit}>
          <div className="admin-form-header">
            <div>
              <h3>{editingProductId ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
              <p>{editingProductId ? 'Cập nhật thông tin sản phẩm hiện có.' : 'Điền thông tin để tạo sản phẩm mới.'}</p>
            </div>
          </div>

          <div className="admin-form-grid">
            <label>
              Tên sản phẩm
              <input name="name" value={formData.name} onChange={handleFormChange} />
              {formErrors.name ? <span className="field-error">{formErrors.name}</span> : null}
            </label>

            <label>
              Danh mục
              <input name="category" value={formData.category} onChange={handleFormChange} />
              {formErrors.category ? <span className="field-error">{formErrors.category}</span> : null}
            </label>

            <label>
              Giá
              <input name="price" type="number" min="0" value={formData.price} onChange={handleFormChange} />
              {formErrors.price ? <span className="field-error">{formErrors.price}</span> : null}
            </label>

            <label>
              Tồn kho
              <input name="stock" type="number" min="0" value={formData.stock} onChange={handleFormChange} />
              {formErrors.stock ? <span className="field-error">{formErrors.stock}</span> : null}
            </label>

            <label className="admin-form-full">
              Ảnh
              <input
                name="image"
                value={formData.image}
                onChange={handleFormChange}
                placeholder="Để trống sẽ dùng placeholder"
              />
            </label>

            <label className="admin-form-full">
              Mô tả
              <textarea
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Có thể để trống"
              />
            </label>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="button" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <ButtonSpinner size="sm" />
                  <span>{editingProductId ? 'Đang lưu...' : 'Đang thêm...'}</span>
                </>
              ) : (
                <span>{editingProductId ? 'Lưu' : 'Thêm sản phẩm'}</span>
              )}
            </button>
            <button type="button" className="button button-light" onClick={resetForm}>
              Hủy
            </button>
          </div>
        </form>
      ) : null}

      {products.length === 0 ? (
        <EmptyState
          title="Chưa có sản phẩm nào"
          description="Dữ liệu localStorage hiện chưa có sản phẩm. Hãy thêm mới để storefront có thể hiển thị ngay."
          icon="fa-box-open"
          action={
            <button type="button" className="button" onClick={handleOpenCreateForm}>
              Thêm sản phẩm
            </button>
          }
        />
      ) : (
        <div className="admin-table-card">
          <div className="admin-table-meta">
            <span>{filteredProducts.length} sản phẩm phù hợp</span>
          </div>

          {filteredProducts.length === 0 ? (
            <EmptyState
              title="Không có sản phẩm phù hợp"
              description="Bộ lọc hiện tại chưa cho ra kết quả nào. Hãy đổi từ khóa hoặc trạng thái để tiếp tục."
              icon="fa-filter-circle-xmark"
            />
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ảnh</th>
                    <th>Tên sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Giá</th>
                    <th>Tồn kho</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <img
                          src={product.image || PRODUCT_PLACEHOLDER_IMAGE}
                          alt={product.name}
                          className="admin-product-image"
                        />
                      </td>
                      <td>
                        <strong>{product.name}</strong>
                      </td>
                      <td>{product.category}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{product.stock}</td>
                      <td>
                        <span className={`admin-status-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                          {product.stock > 0 ? 'Còn hàng' : 'Hết hàng'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="button button-light"
                            onClick={() => setSelectedProduct(product)}
                          >
                            Xem
                          </button>
                          <button
                            type="button"
                            className="button button-outline"
                            onClick={() => handleEditProduct(product)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="button admin-danger-button"
                            onClick={() => handleDeleteProduct(product)}
                            disabled={deletingProductId === product.id}
                          >
                            {deletingProductId === product.id ? (
                              <>
                                <ButtonSpinner size="sm" />
                                <span>Đang xóa...</span>
                              </>
                            ) : (
                              'Xóa'
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedProduct ? (
        <div className="admin-modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <p className="eyebrow">Chi tiết nhanh</p>
                <h3>{selectedProduct.name}</h3>
              </div>
              <button type="button" className="button button-light" onClick={() => setSelectedProduct(null)}>
                Đóng
              </button>
            </div>

            <div className="admin-modal-content">
              <img
                src={selectedProduct.image || PRODUCT_PLACEHOLDER_IMAGE}
                alt={selectedProduct.name}
                className="admin-modal-image"
              />
              <div className="admin-modal-details">
                <p>
                  <strong>Danh mục:</strong> {selectedProduct.category}
                </p>
                <p>
                  <strong>Giá:</strong> {formatCurrency(selectedProduct.price)}
                </p>
                <p>
                  <strong>Tồn kho:</strong> {selectedProduct.stock}
                </p>
                <p>
                  <strong>Trạng thái:</strong> {selectedProduct.stock > 0 ? 'Còn hàng' : 'Hết hàng'}
                </p>
                <p>
                  <strong>Mô tả:</strong> {selectedProduct.description || 'Chưa có mô tả.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminProducts
