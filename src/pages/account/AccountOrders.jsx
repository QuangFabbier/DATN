import { useEffect, useMemo, useState } from 'react'
import OrderCard from '../../components/account/OrderCard'
import SettingsSection from '../../components/account/SettingsSection'
import EmptyState from '../../components/EmptyState'
import { Skeleton } from '../../components/Skeleton'
import { formatCurrency } from '../../utils/formatCurrency'
import { useInitialRender } from '../../hooks/useInitialRender'
import { getOrders, ORDER_STORAGE_KEY, ORDER_STORAGE_UPDATED_EVENT } from '../../services/orderStorage'

const orderStatusOptions = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
]

function AccountOrders() {
  const isInitialRenderReady = useInitialRender(220)
  const [statusFilter, setStatusFilter] = useState('all')
  const [orderList, setOrderList] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)

  useEffect(() => {
    function syncOrders() {
      setOrderList(getOrders())
    }

    function handleStorageSync(event) {
      if (event.key === ORDER_STORAGE_KEY) {
        syncOrders()
      }
    }

    syncOrders()
    window.addEventListener(ORDER_STORAGE_UPDATED_EVENT, syncOrders)
    window.addEventListener('storage', handleStorageSync)

    return () => {
      window.removeEventListener(ORDER_STORAGE_UPDATED_EVENT, syncOrders)
      window.removeEventListener('storage', handleStorageSync)
    }
  }, [])

  const filteredOrders = useMemo(() => {
    return statusFilter === 'all'
      ? orderList
      : orderList.filter((order) => order.status === statusFilter)
  }, [orderList, statusFilter])

  const totalOrderValue = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [filteredOrders],
  )

  if (!isInitialRenderReady) {
    return (
      <div className="account-settings-section">
        <Skeleton style={{ width: '48%', height: 22 }} />
        <Skeleton style={{ width: '100%', height: 260, borderRadius: 20 }} />
      </div>
    )
  }

  return (
    <SettingsSection
      eyebrow="Đơn hàng"
      title="Lịch sử đơn hàng"
      description="Theo dõi toàn bộ vòng đời đơn hàng và kiểm tra chi tiết sản phẩm đã mua."
      actions={<p className="section-heading-meta">Tổng giá trị: {formatCurrency(totalOrderValue)}</p>}
    >
      <div className="account-order-filters" role="tablist" aria-label="Lọc đơn hàng theo trạng thái">
        {orderStatusOptions.map((statusOption) => (
          <button
            key={statusOption.value}
            type="button"
            className={`account-filter-tab ${statusFilter === statusOption.value ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusOption.value)}
          >
            {statusOption.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="Không có đơn hàng phù hợp"
          description="Hiện chưa có đơn thuộc trạng thái này. Đơn mới sẽ xuất hiện tự động khi bạn checkout."
          icon="fa-box-open"
        />
      ) : (
        <div className="account-orders-grid">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} onOpen={(nextOrder) => setSelectedOrder(nextOrder)} />
          ))}
        </div>
      )}

      {selectedOrder ? (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Chi tiết đơn hàng</p>
                <h2>{selectedOrder.code}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Đóng chi tiết đơn hàng"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>

            <div className="account-order-detail-grid">
              {selectedOrder.items.map((item) => (
                <article key={`${selectedOrder.id}-${item.id}`} className="account-order-detail-item">
                  <img src={item.image} alt={item.name} />
                  <div>
                    <strong>{item.name}</strong>
                    <p>
                      SL: {item.quantity} • {formatCurrency(item.price)}
                    </p>
                  </div>
                  <strong>{formatCurrency(item.price * item.quantity)}</strong>
                </article>
              ))}
            </div>

            <div className="summary-breakdown">
              <p>
                <span>Tổng đơn</span>
                <strong>{formatCurrency(selectedOrder.total)}</strong>
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </SettingsSection>
  )
}

export default AccountOrders
