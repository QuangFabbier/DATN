import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import { ButtonSpinner } from '../../components/Spinner'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { getProducts } from '../../services/productService'
import { createInventoryExport, getInventoryExports } from '../../services/inventoryService'
import { formatCurrency } from '../../utils/formatCurrency'
import { withMinimumDelay } from '../../utils/timing'

const initialFormState = {
  reason: 'MANUAL',
  note: '',
  exportDate: new Date().toISOString().slice(0, 10),
}

const initialHistoryFilters = {
  status: '',
  reason: '',
  startDate: '',
  endDate: '',
}

function getItemTotal(item) {
  return Number(item.quantity || 0) * Number(item.price || 0)
}

function getReasonLabel(reason) {
  if (reason === 'MANUAL') {
    return 'Thủ công'
  }

  if (reason === 'DAMAGED') {
    return 'Hàng lỗi'
  }

  if (reason === 'INTERNAL_USE') {
    return 'Dùng nội bộ'
  }

  if (reason === 'ADJUSTMENT') {
    return 'Điều chỉnh'
  }

  return reason || 'Không xác định'
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

function AdminExports() {
  const { token, isAuthenticated, user } = useAuth()
  const { showToast } = useToast()
  const [products, setProducts] = useState([])
  const [exports, setExports] = useState([])
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

  async function loadExportHistory(page = 1, nextFilters = historyFilters) {
    try {
      setHistoryLoading(true)
      const response = await getInventoryExports({ ...nextFilters, page, limit: pagination.limit }, token)
      setExports(response.items)
      setPagination(response.pagination)
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải phiếu xuất.')
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
          getInventoryExports({ page: 1, limit: 10 }, token),
        ])
        setProducts(productData)
        setExports(historyData.items)
        setPagination(historyData.pagination)
      } catch (requestError) {
        setError(requestError.message || 'Không thể tải dữ liệu phiếu xuất.')
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
    if (selectedProductIds.has(product.id) || product.stock <= 0) {
      return
    }

    setSelectedItems((currentItems) => [
      ...currentItems,
      {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: Number(product.price || 0),
        stock: Number(product.stock || 0),
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
      reason: formData.reason,
      note: formData.note.trim(),
      exportDate: formData.exportDate,
      status,
      items: selectedItems.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity || 0),
      })),
    }
  }

  function validateReceipt() {
    if (selectedItems.length === 0) {
      return 'Vui lòng chọn ít nhất 1 sản phẩm.'
    }

    for (const item of selectedItems) {
      if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
        return `Số lượng của ${item.name} phải lớn hơn 0.`
      }

      if (Number(item.quantity) > Number(item.stock || 0)) {
        return `Số lượng xuất của ${item.name} vượt quá tồn kho hiện tại.`
      }
    }

    return ''
  }

  async function submitReceipt(status) {
    const validationError = validateReceipt()

    if (validationError) {
      showToast({
        type: 'error',
        title: 'Phiếu xuất không hợp lệ',
        message: validationError,
      })
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const response = await createInventoryExport(buildPayload(status), token)
      showToast({
        type: 'success',
        title: status === 'CONFIRMED' ? 'Đã xác nhận phiếu xuất' : 'Đã lưu phiếu xuất',
        message: response?.receipt?.reason
          ? `Phiếu xuất ${response.receipt.reason} đã được xử lý.`
          : 'Phiếu xuất đã được xử lý thành công.',
      })

      resetForm()
      await loadExportHistory(1, historyFilters)
    } catch (requestError) {
      setError(requestError.message || 'Không thể lưu phiếu xuất.')
      showToast({
        type: 'error',
        title: 'Không thể lưu phiếu xuất',
        message: requestError.message || 'Vui lòng thử lại.',
      })
    } finally {
      setSubmitting(false)
      setPendingReceipt(null)
    }
  }

  async function handleApplyHistoryFilters(event) {
    event.preventDefault()
    await loadExportHistory(1, historyFilters)
  }

  function handleResetHistoryFilters() {
    const nextFilters = { ...initialHistoryFilters }
    setHistoryFilters(nextFilters)
    loadExportHistory(1, nextFilters)
  }

  async function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) {
      return
    }

    await loadExportHistory(nextPage, historyFilters)
  }

  if (loading) {
    return <div className="admin-table-card">Đang tải phiếu xuất...</div>
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Cần đăng nhập để quản lý kho"
        description="Bạn cần đăng nhập bằng tài khoản admin để tạo phiếu xuất kho."
        icon="fa-user-lock"
      />
    )
  }

  if (!hasAdminAccess) {
    return (
      <EmptyState
        title="Không có quyền quản lý kho"
        description="Tài khoản hiện tại không có quyền tạo phiếu xuất."
        icon="fa-lock"
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">Xuất kho</p>
          <h2>Phiếu xuất</h2>
        </div>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}

      <div className="admin-table-card inventory-form-card">
        <div className="admin-table-meta">
          <span>Phiếu xuất kho</span>
        </div>

        <div className="admin-form-grid inventory-form-grid">
          <label>
            Lý do
            <select
              value={formData.reason}
              onChange={(event) => setFormData((current) => ({ ...current, reason: event.target.value }))}
            >
              <option value="MANUAL">Thủ công</option>
              <option value="DAMAGED">Hàng lỗi</option>
              <option value="INTERNAL_USE">Dùng nội bộ</option>
              <option value="ADJUSTMENT">Điều chỉnh</option>
            </select>
          </label>

          <label>
            Ngày xuất
            <input
              type="date"
              value={formData.exportDate}
              onChange={(event) => setFormData((current) => ({ ...current, exportDate: event.target.value }))}
            />
          </label>

          <label className="admin-form-full">
            Ghi chú
            <textarea
              rows="3"
              value={formData.note}
              onChange={(event) => setFormData((current) => ({ ...current, note: event.target.value }))}
              placeholder="Ghi chú về phiếu xuất"
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
                  disabled={selectedProductIds.has(product.id) || product.stock <= 0}
                >
                  {product.stock <= 0 ? 'Hết hàng' : selectedProductIds.has(product.id) ? 'Đã thêm' : 'Thêm'}
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
                    max={item.stock}
                    value={item.quantity}
                    onChange={(event) => updateSelectedItem(item.productId, 'quantity', event.target.value)}
                  />
                </label>
                <label>
                  Tồn kho
                  <input type="number" value={item.stock} readOnly />
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
                  title: 'Phiếu xuất không hợp lệ',
                  message: validationError,
                })
                return
              }
              setPendingReceipt({ status: 'CONFIRMED', payload: buildPayload('CONFIRMED') })
            }}
            disabled={submitting}
          >
            Xác nhận xuất kho
          </button>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-meta">
          <span>Lịch sử phiếu xuất</span>
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
          <select
            value={historyFilters.reason}
            onChange={(event) => setHistoryFilters((current) => ({ ...current, reason: event.target.value }))}
          >
            <option value="">Tất cả lý do</option>
            <option value="MANUAL">Thủ công</option>
            <option value="DAMAGED">Hàng lỗi</option>
            <option value="INTERNAL_USE">Dùng nội bộ</option>
            <option value="ADJUSTMENT">Điều chỉnh</option>
          </select>
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
          <div className="section-heading-meta">Đang tải lịch sử phiếu xuất...</div>
        ) : exports.length === 0 ? (
          <EmptyState
            title="Chưa có phiếu xuất nào"
            description="Lịch sử phiếu xuất sẽ hiển thị tại đây."
            icon="fa-clipboard-list"
          />
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Lý do</th>
                    <th>Trạng thái</th>
                    <th>Ngày xuất</th>
                    <th>Số sản phẩm</th>
                    <th>Tổng số lượng</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.map((receipt) => {
                    const totalQuantity = Array.isArray(receipt.items)
                      ? receipt.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
                      : 0

                    return (
                      <tr key={receipt.id}>
                        <td>
                          <strong>{getReasonLabel(receipt.reason)}</strong>
                        </td>
                        <td>
                          <span className={`admin-status-badge order-${receipt.status.toLowerCase()}`}>
                            {getStatusLabel(receipt.status)}
                          </span>
                        </td>
                        <td>{new Date(receipt.exportDate).toLocaleString('vi-VN')}</td>
                        <td>{Array.isArray(receipt.items) ? receipt.items.length : 0}</td>
                        <td>{totalQuantity}</td>
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
                <p className="eyebrow">Xác nhận phiếu xuất</p>
                <h3>{getReasonLabel(pendingReceipt.payload.reason)}</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setPendingReceipt(null)}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <p>
              Bạn có chắc muốn xác nhận phiếu xuất này với {pendingReceipt.payload.items.length} sản phẩm không?
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

export default AdminExports
