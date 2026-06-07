import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import { ButtonSpinner } from '../../components/Spinner'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { getProducts } from '../../services/productService'
import { createInventoryImport, getInventoryImports } from '../../services/inventoryService'
import { formatCurrency } from '../../utils/formatCurrency'
import { withMinimumDelay } from '../../utils/timing'

const initialFormState = {
  supplierName: '',
  note: '',
  importDate: new Date().toISOString().slice(0, 10),
}

const initialHistoryFilters = {
  status: '',
  supplierName: '',
  startDate: '',
  endDate: '',
}

function getItemTotal(item) {
  return Number(item.quantity || 0) * Number(item.importPrice || 0)
}

function getStatusLabel(status) {
  if (status === 'CONFIRMED') {
    return 'Đã xác nhận'
  }

  if (status === 'DRAFT') {
    return 'Bản nháp'
  }

  return status || 'Không xác định'
}

function AdminImports() {
  const { token, isAuthenticated, user } = useAuth()
  const { showToast } = useToast()
  const [products, setProducts] = useState([])
  const [imports, setImports] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(initialFormState)
  const [selectedItems, setSelectedItems] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [pendingReceipt, setPendingReceipt] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [historyFilters, setHistoryFilters] = useState(initialHistoryFilters)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const hasAdminAccess = isAuthenticated && user?.role === 'admin'

  async function loadImportHistory(page = 1, nextFilters = historyFilters) {
    try {
      setHistoryLoading(true)
      const response = await getInventoryImports({ ...nextFilters, page, limit: pagination.limit }, token)
      setImports(response.items)
      setPagination(response.pagination)
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải phiếu nhập.')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)
        setError('')
        const [productData, historyData] = await Promise.all([
          withMinimumDelay(getProducts(), 180),
          getInventoryImports({ page: 1, limit: 10 }, token),
        ])
        setProducts(productData)
        setImports(historyData.items)
        setPagination(historyData.pagination)
      } catch (requestError) {
        setError(requestError.message || 'Không thể tải dữ liệu phiếu nhập.')
      } finally {
        setLoading(false)
        setHistoryLoading(false)
      }
    }

    if (hasAdminAccess) {
      loadInitialData()
    }
  }, [hasAdminAccess, token])

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase()
    return products.filter((product) => {
      if (!normalizedKeyword) {
        return true
      }

      return [product.name, product.category, product.brand]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedKeyword)
    })
  }, [products, searchKeyword])

  const selectedProductIds = useMemo(() => new Set(selectedItems.map((item) => item.productId)), [selectedItems])

  function addProductToReceipt(product) {
    if (selectedProductIds.has(product.id)) {
      return
    }

    setSelectedItems((currentItems) => [
      ...currentItems,
      {
        productId: product.id,
        name: product.name,
        quantity: 1,
        importPrice: Number(product.price || 0),
      },
    ])
  }

  function updateSelectedItem(productId, field, value) {
    setSelectedItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    )
  }

  function removeSelectedItem(productId) {
    setSelectedItems((currentItems) => currentItems.filter((item) => item.productId !== productId))
  }

  function resetForm() {
    setFormData(initialFormState)
    setSelectedItems([])
    setSearchKeyword('')
    setPendingReceipt(null)
    setSubmitting(false)
  }

  function buildPayload(status) {
    return {
      supplierName: formData.supplierName.trim(),
      note: formData.note.trim(),
      importDate: formData.importDate,
      status,
      items: selectedItems.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity || 0),
        importPrice: Number(item.importPrice || 0),
      })),
    }
  }

  function validateReceipt() {
    if (!formData.supplierName.trim()) {
      return 'Vui lòng nhập tên nhà cung cấp.'
    }

    if (selectedItems.length === 0) {
      return 'Vui lòng chọn ít nhất 1 sản phẩm.'
    }

    for (const item of selectedItems) {
      if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
        return `Số lượng của ${item.name} phải lớn hơn 0.`
      }

      if (!Number.isFinite(Number(item.importPrice)) || Number(item.importPrice) <= 0) {
        return `Giá nhập của ${item.name} phải lớn hơn 0.`
      }
    }

    return ''
  }

  async function submitReceipt(status) {
    const validationError = validateReceipt()

    if (validationError) {
      showToast({
        type: 'error',
        title: 'Phiếu nhập không hợp lệ',
        message: validationError,
      })
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const response = await createInventoryImport(buildPayload(status), token)
      showToast({
        type: 'success',
        title: status === 'CONFIRMED' ? 'Đã xác nhận phiếu nhập' : 'Đã lưu bản nháp',
        message: response?.receipt?.supplierName
          ? `Phiếu nhập của ${response.receipt.supplierName} đã được xử lý.`
          : 'Phiếu nhập đã được xử lý thành công.',
      })

      resetForm()
      await loadImportHistory(1, historyFilters)
    } catch (requestError) {
      setError(requestError.message || 'Không thể lưu phiếu nhập.')
      showToast({
        type: 'error',
        title: 'Không thể lưu phiếu nhập',
        message: requestError.message || 'Vui lòng thử lại.',
      })
    } finally {
      setSubmitting(false)
      setPendingReceipt(null)
    }
  }

  async function handleApplyHistoryFilters(event) {
    event.preventDefault()
    await loadImportHistory(1, historyFilters)
  }

  function handleResetHistoryFilters() {
    const nextFilters = { ...initialHistoryFilters }
    setHistoryFilters(nextFilters)
    loadImportHistory(1, nextFilters)
  }

  async function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) {
      return
    }

    await loadImportHistory(nextPage, historyFilters)
  }

  if (loading) {
    return <div className="admin-table-card">Đang tải phiếu nhập...</div>
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Cần đăng nhập để quản lý kho"
        description="Bạn cần đăng nhập bằng tài khoản admin để tạo phiếu nhập kho."
        icon="fa-user-lock"
      />
    )
  }

  if (!hasAdminAccess) {
    return (
      <EmptyState
        title="Không có quyền quản lý kho"
        description="Tài khoản hiện tại không có quyền tạo phiếu nhập."
        icon="fa-lock"
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">Nhập kho</p>
          <h2>Phiếu nhập</h2>
        </div>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}

      <div className="admin-table-card inventory-form-card">
        <div className="admin-table-meta">
          <span>Phiếu nhập kho</span>
        </div>

        <div className="admin-form-grid inventory-form-grid">
          <label>
            Nhà cung cấp
            <input
              value={formData.supplierName}
              onChange={(event) => setFormData((current) => ({ ...current, supplierName: event.target.value }))}
              placeholder="Tên nhà cung cấp"
            />
          </label>

          <label>
            Ngày nhập
            <input
              type="date"
              value={formData.importDate}
              onChange={(event) => setFormData((current) => ({ ...current, importDate: event.target.value }))}
            />
          </label>

          <label className="admin-form-full">
            Ghi chú
            <textarea
              rows="3"
              value={formData.note}
              onChange={(event) => setFormData((current) => ({ ...current, note: event.target.value }))}
              placeholder="Ghi chú về phiếu nhập"
            />
          </label>
        </div>

        <div className="inventory-product-picker">
          <div className="inventory-product-picker-header">
            <h3>Tìm sản phẩm</h3>
            <input
              type="search"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Tìm theo tên, danh mục, thương hiệu"
            />
          </div>

          <div className="inventory-product-picker-list">
            {filteredProducts.map((product) => (
              <article key={product.id} className="inventory-product-picker-item">
                <div>
                  <strong>{product.name}</strong>
                  <p>{product.category}</p>
                </div>
                <div>
                  <span>{formatCurrency(product.price)}</span>
                  <small>Tồn kho hiện tại: {product.stock}</small>
                </div>
                <button
                  type="button"
                  className="button button-light"
                  onClick={() => addProductToReceipt(product)}
                  disabled={selectedProductIds.has(product.id)}
                >
                  {selectedProductIds.has(product.id) ? 'Đã thêm' : 'Thêm'}
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="inventory-selected-items">
          <h3>Sản phẩm đã chọn</h3>
          {selectedItems.length === 0 ? (
            <p className="section-heading-meta">Chưa có sản phẩm nào được chọn.</p>
          ) : (
            selectedItems.map((item) => (
              <div key={item.productId} className="inventory-selected-item">
                <div>
                  <strong>{item.name}</strong>
                  <small>{formatCurrency(getItemTotal(item))}</small>
                </div>
                <label>
                  Số lượng
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(event) => updateSelectedItem(item.productId, 'quantity', event.target.value)}
                  />
                </label>
                <label>
                  Giá nhập
                  <input
                    type="number"
                    min="1"
                    value={item.importPrice}
                    onChange={(event) => updateSelectedItem(item.productId, 'importPrice', event.target.value)}
                  />
                </label>
                <button type="button" className="icon-button" onClick={() => removeSelectedItem(item.productId)}>
                  <i className="fa-solid fa-trash" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="admin-form-actions">
          <button
            type="button"
            className="button button-light"
            onClick={() => submitReceipt('DRAFT')}
            disabled={submitting}
          >
            {submitting ? <ButtonSpinner size="sm" /> : 'Lưu bản nháp'}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => {
              const validationError = validateReceipt()
              if (validationError) {
                showToast({
                  type: 'error',
                  title: 'Phiếu nhập không hợp lệ',
                  message: validationError,
                })
                return
              }
              setPendingReceipt({ status: 'CONFIRMED', payload: buildPayload('CONFIRMED') })
            }}
            disabled={submitting}
          >
            Xác nhận nhập kho
          </button>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-meta">
          <span>Lịch sử phiếu nhập</span>
        </div>

        <form className="admin-toolbar inventory-history-toolbar" onSubmit={handleApplyHistoryFilters}>
          <select
            value={historyFilters.status}
            onChange={(event) => setHistoryFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="CONFIRMED">Đã xác nhận</option>
          </select>
          <input
            type="search"
            value={historyFilters.supplierName}
            onChange={(event) => setHistoryFilters((current) => ({ ...current, supplierName: event.target.value }))}
            placeholder="Tìm theo nhà cung cấp"
          />
          <input
            type="date"
            value={historyFilters.startDate}
            onChange={(event) => setHistoryFilters((current) => ({ ...current, startDate: event.target.value }))}
          />
          <input
            type="date"
            value={historyFilters.endDate}
            onChange={(event) => setHistoryFilters((current) => ({ ...current, endDate: event.target.value }))}
          />
          <button type="submit" className="button">
            Lọc
          </button>
          <button type="button" className="button button-light" onClick={handleResetHistoryFilters}>
            Đặt lại
          </button>
        </form>

        {historyLoading ? (
          <div className="section-heading-meta">Đang tải lịch sử phiếu nhập...</div>
        ) : imports.length === 0 ? (
          <EmptyState
            title="Chưa có phiếu nhập nào"
            description="Lịch sử phiếu nhập sẽ hiển thị tại đây."
            icon="fa-truck-ramp-box"
          />
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nhà cung cấp</th>
                    <th>Trạng thái</th>
                    <th>Ngày nhập</th>
                    <th>Số sản phẩm</th>
                    <th>Giá trị</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((receipt) => {
                    const totalValue = Array.isArray(receipt.items)
                      ? receipt.items.reduce((sum, item) => sum + getItemTotal(item), 0)
                      : 0

                    return (
                      <tr key={receipt.id}>
                        <td>
                          <strong>{receipt.supplierName}</strong>
                        </td>
                        <td>
                          <span className={`admin-status-badge order-${receipt.status.toLowerCase()}`}>
                            {getStatusLabel(receipt.status)}
                          </span>
                        </td>
                        <td>{new Date(receipt.importDate).toLocaleString('vi-VN')}</td>
                        <td>{Array.isArray(receipt.items) ? receipt.items.length : 0}</td>
                        <td>{formatCurrency(totalValue)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <button
                type="button"
                className="button button-light"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPreviousPage}
              >
                Trang trước
              </button>
              <span>
                Trang {pagination.page}/{pagination.totalPages}
              </span>
              <button
                type="button"
                className="button button-light"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
              >
                Trang sau
              </button>
            </div>
          </>
        )}
      </div>

      {pendingReceipt ? (
        <div className="admin-modal-backdrop" onClick={() => setPendingReceipt(null)}>
          <div className="admin-modal admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <p className="eyebrow">Xác nhận phiếu nhập</p>
                <h3>{pendingReceipt.payload.supplierName}</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setPendingReceipt(null)}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <p>
              Bạn có chắc muốn xác nhận phiếu nhập này với {pendingReceipt.payload.items.length} sản phẩm không?
            </p>

            <div className="admin-form-actions">
              <button type="button" className="button button-light" onClick={() => setPendingReceipt(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="button"
                onClick={() => submitReceipt(pendingReceipt.status)}
                disabled={submitting}
              >
                {submitting ? <ButtonSpinner size="sm" /> : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminImports
