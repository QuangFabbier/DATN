import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { getProducts } from '../../services/productService'
import { getInventoryTransactions } from '../../services/inventoryService'

const initialFilters = {
  type: '',
  category: '',
  keyword: '',
  startDate: '',
  endDate: '',
}

function formatDateTime(value) {
  if (!value) {
    return 'Chưa có'
  }

  return new Date(value).toLocaleString('vi-VN')
}

function getTypeLabel(type) {
  if (type === 'IMPORT') {
    return 'Nhập kho'
  }

  if (type === 'EXPORT') {
    return 'Xuất kho'
  }

  return type || 'Không xác định'
}

function getReferenceLabel(referenceType) {
  const normalizedReference = String(referenceType || '').toUpperCase()

  if (normalizedReference === 'INVENTORY_IMPORT') {
    return 'Phiếu nhập'
  }

  if (normalizedReference === 'INVENTORY_EXPORT') {
    return 'Phiếu xuất'
  }

  if (normalizedReference === 'ORDER') {
    return 'Đơn hàng'
  }

  return referenceType || 'Hệ thống'
}

function AdminTransactions() {
  const { token, isAuthenticated, user } = useAuth()
  const { showToast } = useToast()
  const [products, setProducts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const hasAdminAccess = isAuthenticated && user?.role === 'admin'

  async function loadTransactions(page = 1, nextFilters = filters) {
    try {
      setLoading(true)
      setError('')
      const response = await getInventoryTransactions({ ...nextFilters, page, limit: pagination.limit }, token)
      setTransactions(response.items)
      setPagination(response.pagination)
    } catch (requestError) {
      setError(requestError.message || 'Không thể tải giao dịch kho.')
      showToast({
        type: 'error',
        title: 'Không thể tải giao dịch kho',
        message: requestError.message || 'Vui lòng thử lại.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)
        setError('')
        const [productData, transactionData] = await Promise.all([
          getProducts(),
          getInventoryTransactions({ page: 1, limit: 10 }, token),
        ])
        setProducts(productData)
        setTransactions(transactionData.items)
        setPagination(transactionData.pagination)
      } catch (requestError) {
        setError(requestError.message || 'Không thể tải giao dịch kho.')
      } finally {
        setLoading(false)
      }
    }

    if (hasAdminAccess) {
      loadInitialData()
    }
  }, [hasAdminAccess, token])

  const categoryOptions = useMemo(() => {
    const uniqueCategories = new Set(
      products.map((product) => String(product.category || '').trim()).filter(Boolean),
    )

    return Array.from(uniqueCategories).sort((first, second) => first.localeCompare(second, 'vi'))
  }, [products])

  async function handleApplyFilters(event) {
    event.preventDefault()
    await loadTransactions(1, filters)
  }

  function handleResetFilters() {
    const nextFilters = { ...initialFilters }
    setFilters(nextFilters)
    loadTransactions(1, nextFilters)
  }

  async function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === pagination.page) {
      return
    }

    await loadTransactions(nextPage, filters)
  }

  if (loading) {
    return <div className="admin-table-card">Đang tải giao dịch kho...</div>
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Cần đăng nhập để xem giao dịch kho"
        description="Bạn cần đăng nhập bằng tài khoản admin để xem lịch sử giao dịch."
        icon="fa-user-lock"
      />
    )
  }

  if (!hasAdminAccess) {
    return (
      <EmptyState
        title="Không có quyền quản lý kho"
        description="Tài khoản hiện tại không có quyền xem giao dịch kho."
        icon="fa-lock"
      />
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">Lịch sử giao dịch</p>
          <h2>Giao dịch kho</h2>
        </div>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}

      <div className="admin-table-card">
        <div className="admin-table-meta">
          <span>Bảng giao dịch</span>
        </div>

        <form className="admin-toolbar inventory-history-toolbar" onSubmit={handleApplyFilters}>
          <input
            type="search"
            value={filters.keyword}
            onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
            placeholder="Tìm theo tên sản phẩm, tham chiếu, người thao tác..."
            aria-label="Tìm giao dịch kho"
          />
          <select
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
          >
            <option value="">Tất cả loại</option>
            <option value="IMPORT">Nhập kho</option>
            <option value="EXPORT">Xuất kho</option>
          </select>
          <select
            value={filters.category}
            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            aria-label="Chọn danh mục kho"
          >
            <option value="">Tất cả danh mục</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
          />
          <button type="submit" className="button">
            Lọc
          </button>
          <button type="button" className="button button-light" onClick={handleResetFilters}>
            Đặt lại
          </button>
        </form>

        {transactions.length === 0 ? (
          <EmptyState
            title="Chưa có giao dịch nào"
            description="Lịch sử giao dịch kho sẽ hiển thị tại đây."
            icon="fa-clipboard-list"
          />
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Loại</th>
                    <th>Sản phẩm</th>
                    <th>Số lượng</th>
                    <th>Tồn kho trước</th>
                    <th>Tồn kho sau</th>
                    <th>Tham chiếu</th>
                    <th>Thực hiện bởi</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        <span className={`admin-status-badge order-${transaction.type.toLowerCase()}`}>
                          {getTypeLabel(transaction.type)}
                        </span>
                      </td>
                      <td>
                        <strong>{transaction.product?.name || 'Sản phẩm'}</strong>
                        <div className="section-heading-meta">{transaction.product?.category || ''}</div>
                      </td>
                      <td>{transaction.quantity}</td>
                      <td>{transaction.stockBefore}</td>
                      <td>{transaction.stockAfter}</td>
                      <td>{getReferenceLabel(transaction.referenceType)}</td>
                      <td>{transaction.performedBy?.name || 'Hệ thống'}</td>
                      <td>{formatDateTime(transaction.createdAt)}</td>
                    </tr>
                  ))}
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
    </div>
  )
}

export default AdminTransactions
