import { useEffect, useMemo, useRef, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import { AdminProductsSkeleton } from '../../components/Skeleton'
import { ButtonSpinner } from '../../components/Spinner'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { createProduct, deleteProduct, getProducts, updateProduct } from '../../services/productService'
import { formatCurrency } from '../../utils/formatCurrency'
import { getProductId, PRODUCT_PLACEHOLDER_IMAGE } from '../../utils/product'
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
  const { token, isAuthenticated, user } = useAuth()
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
  const [imageUploadError, setImageUploadError] = useState('')
  const [isReadingImage, setIsReadingImage] = useState(false)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [editingProductId, setEditingProductId] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState('')
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState(null)
  const hasAdminAccess = isAuthenticated && user?.role === 'admin'
  const hasImagePreview = Boolean(formData.image)
  const imageInputRef = useRef(null)

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        setError('')
        const data = await withMinimumDelay(getProducts(), 220)
        setProducts(data)
      } catch (requestError) {
        setError(requestError.message || 'Không thể tải danh sách sản phẩm quản trị.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  useEffect(() => {
    if (!isFormOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isFormOpen])

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
    setImageUploadError('')
    setIsReadingImage(false)
    setIsDraggingImage(false)
    setEditingProductId('')
    setIsFormOpen(false)
    setIsSubmitting(false)
  }

  function handleFormChange(event) {
    const { name, value } = event.target

    setFormData((currentData) => ({ ...currentData, [name]: value }))
    setFormErrors((currentErrors) => ({ ...currentErrors, [name]: '' }))
    if (name === 'image') {
      setImageUploadError('')
    }
    setError('')
  }

  function processImageFile(selectedFile) {
    const fileReader = new FileReader()
    setIsReadingImage(true)
    setImageUploadError('')

    fileReader.onload = () => {
      const imageDataUrl = String(fileReader.result || '')

      setFormData((currentData) => ({
        ...currentData,
        image: imageDataUrl,
      }))
      setIsReadingImage(false)
    }

    fileReader.onerror = () => {
      setImageUploadError('Không thể đọc file ảnh. Vui lòng thử lại.')
      setIsReadingImage(false)
    }

    fileReader.readAsDataURL(selectedFile)
  }

  function handleImageFileChange(event) {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    if (!selectedFile.type.startsWith('image/')) {
      setImageUploadError('Chỉ hỗ trợ upload file ảnh (jpg, png, webp, gif, ...).')
      return
    }

    const maxImageSizeInBytes = 4 * 1024 * 1024
    if (selectedFile.size > maxImageSizeInBytes) {
      setImageUploadError('Ảnh quá lớn. Vui lòng chọn ảnh tối đa 4MB.')
      return
    }

    processImageFile(selectedFile)
    event.target.value = ''
  }

  function handleImageDrop(event) {
    event.preventDefault()
    setIsDraggingImage(false)

    if (isReadingImage) {
      return
    }

    const selectedFile = event.dataTransfer?.files?.[0]
    if (!selectedFile) {
      return
    }

    if (!selectedFile.type.startsWith('image/')) {
      setImageUploadError('Chỉ hỗ trợ kéo-thả file ảnh.')
      return
    }

    const maxImageSizeInBytes = 4 * 1024 * 1024
    if (selectedFile.size > maxImageSizeInBytes) {
      setImageUploadError('Ảnh quá lớn. Vui lòng chọn ảnh tối đa 4MB.')
      return
    }

    processImageFile(selectedFile)
  }

  function handleImageDragOver(event) {
    event.preventDefault()
    if (!isDraggingImage) {
      setIsDraggingImage(true)
    }
  }

  function handleImageDragLeave() {
    setIsDraggingImage(false)
  }

  function handleOpenImagePicker() {
    imageInputRef.current?.click()
  }

  function handleClearImage() {
    setFormData((currentData) => ({
      ...currentData,
      image: '',
    }))
    setImageUploadError('')
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
        const updatedProduct = await withMinimumDelay(updateProduct(editingProductId, payload, token), 280)
        setProducts((currentProducts) =>
          currentProducts.map((product) =>
            getProductId(product) === editingProductId ? updatedProduct : product,
          ),
        )
        setSelectedProduct((currentProduct) =>
          currentProduct && getProductId(currentProduct) === editingProductId
            ? updatedProduct
            : currentProduct,
        )
        showToast({
          type: 'success',
          title: 'Cập nhật sản phẩm thành công',
          message: `${payload.name} đã được cập nhật trong storefront.`,
        })
      } else {
        const createdProduct = await withMinimumDelay(createProduct(payload, token), 280)
        setProducts((currentProducts) => [createdProduct, ...currentProducts])
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
    const productId = getProductId(product)

    if (!productId) {
      showToast({
        type: 'error',
        title: 'Không thể sửa sản phẩm',
        message: 'Sản phẩm này thiếu mã định danh hợp lệ.',
      })
      return
    }

    setEditingProductId(productId)
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

  async function handleDeleteProduct() {
    if (!pendingDeleteProduct) {
      return
    }

    try {
      setError('')
      const productId = getProductId(pendingDeleteProduct)

      if (!productId) {
        throw new Error('Sản phẩm thiếu mã định danh hợp lệ, không thể xóa.')
      }

      setDeletingProductId(productId)
      await withMinimumDelay(deleteProduct(productId, token), 240)

      setProducts((currentProducts) =>
        currentProducts.filter((currentProduct) => getProductId(currentProduct) !== productId),
      )
      showToast({
        type: 'success',
        title: 'Xóa sản phẩm thành công',
        message: `${pendingDeleteProduct.name} đã được xóa khỏi hệ thống.`,
      })

      if (editingProductId === productId) {
        resetForm()
      }

      if (selectedProduct && getProductId(selectedProduct) === productId) {
        setSelectedProduct(null)
      }

      setPendingDeleteProduct(null)
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

  function handleRequestDelete(product) {
    setPendingDeleteProduct(product)
  }

  if (loading) {
    return <AdminProductsSkeleton />
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Cần đăng nhập để quản lý sản phẩm"
        description="Bạn cần đăng nhập bằng tài khoản quản trị để thêm, sửa hoặc xóa sản phẩm."
        icon="fa-user-lock"
      />
    )
  }

  if (!hasAdminAccess) {
    return (
      <EmptyState
        title="Không có quyền quản trị"
        description="Tài khoản hiện tại không có quyền admin để thao tác sản phẩm."
        icon="fa-lock"
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">Quản lý sản phẩm</p>
          <h2>Admin Products</h2>
        </div>
        <button type="button" className="button admin-create-button" onClick={handleOpenCreateForm}>
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

      {products.length === 0 ? (
        <EmptyState
          title="Chưa có sản phẩm nào"
          description="MongoDB hiện chưa có sản phẩm. Hãy thêm mới để storefront có thể hiển thị ngay."
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
                    <tr key={getProductId(product)}>
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
                            className="button button-light admin-action-button"
                            onClick={() => setSelectedProduct(product)}
                          >
                            Xem
                          </button>
                          <button
                            type="button"
                            className="button button-outline admin-action-button"
                            onClick={() => handleEditProduct(product)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="button admin-danger-button admin-action-button"
                            onClick={() => handleRequestDelete(product)}
                            disabled={deletingProductId === getProductId(product)}
                          >
                            {deletingProductId === getProductId(product) ? (
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

      {isFormOpen ? (
        <div className="admin-modal-backdrop" onClick={resetForm}>
          <div
            className={`admin-modal admin-product-form-modal ${hasImagePreview ? 'has-image-preview' : ''}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <p className="eyebrow">Biểu mẫu sản phẩm</p>
                <h3>{editingProductId ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
              </div>
              <button type="button" className="button button-light" onClick={resetForm}>
                Đóng
              </button>
            </div>

            <form className="admin-form-card admin-product-form-card" onSubmit={handleSubmit}>
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
                  Ảnh URL
                  <input
                    name="image"
                    value={formData.image}
                    onChange={handleFormChange}
                    placeholder="Dán URL ảnh hoặc dùng nút upload bên dưới"
                  />
                </label>

                <div className="admin-form-full admin-image-upload-block">
                  <label htmlFor="admin-product-image-upload">
                    Upload ảnh từ máy
                  </label>
                  <button
                    type="button"
                    className={`admin-image-dropzone ${isDraggingImage ? 'is-dragging' : ''}`}
                    onClick={handleOpenImagePicker}
                    onDragOver={handleImageDragOver}
                    onDragLeave={handleImageDragLeave}
                    onDrop={handleImageDrop}
                    disabled={isReadingImage}
                  >
                    <span>Kéo ảnh vào đây hoặc bấm để chọn file</span>
                    <small>Hỗ trợ: jpg, png, webp, gif (tối đa 4MB)</small>
                  </button>
                  <input
                    ref={imageInputRef}
                    id="admin-product-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    disabled={isReadingImage}
                  />
                  {isReadingImage ? (
                    <span className="section-heading-meta">Đang đọc ảnh...</span>
                  ) : null}
                  {imageUploadError ? <span className="field-error">{imageUploadError}</span> : null}
                  {formData.image ? (
                    <div className="admin-image-preview">
                      <img src={formData.image} alt="Xem trước ảnh sản phẩm" />
                      <button type="button" className="button button-light" onClick={handleClearImage}>
                        Xóa ảnh
                      </button>
                    </div>
                  ) : null}
                </div>

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
          </div>
        </div>
      ) : null}

      {pendingDeleteProduct ? (
        <div className="admin-modal-backdrop" onClick={() => setPendingDeleteProduct(null)}>
          <div className="admin-modal admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <p className="eyebrow">Xác nhận xóa</p>
                <h3>Xóa sản phẩm</h3>
              </div>
            </div>

            <p>
              Bạn có chắc muốn xóa <strong>{pendingDeleteProduct.name}</strong> không?
            </p>

            <div className="admin-form-actions">
              <button
                type="button"
                className="button admin-danger-button"
                onClick={handleDeleteProduct}
                disabled={deletingProductId === getProductId(pendingDeleteProduct)}
              >
                {deletingProductId === getProductId(pendingDeleteProduct) ? (
                  <>
                    <ButtonSpinner size="sm" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  'Xác nhận xóa'
                )}
              </button>
              <button type="button" className="button button-light" onClick={() => setPendingDeleteProduct(null)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminProducts
