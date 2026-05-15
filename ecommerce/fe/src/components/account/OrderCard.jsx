import { formatCurrency } from '../../utils/formatCurrency'

const orderStatusMap = {
  pending: { label: 'Chờ xác nhận', tone: 'pending' },
  confirmed: { label: 'Đã xác nhận', tone: 'confirmed' },
  shipping: { label: 'Đang giao', tone: 'shipping' },
  completed: { label: 'Hoàn thành', tone: 'completed' },
  cancelled: { label: 'Đã hủy', tone: 'cancelled' },
}

function OrderCard({ onOpen, order }) {
  const status = orderStatusMap[order.status] || { label: 'Đang xử lý', tone: 'pending' }
  const orderDate = new Date(order.date).toLocaleDateString('vi-VN')
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0)

  return (
    <article className="account-order-card">
      <header>
        <div>
          <p>Mã đơn</p>
          <h3>{order.code}</h3>
          <span>{orderDate}</span>
        </div>
        <span className={`account-order-status ${status.tone}`}>{status.label}</span>
      </header>

      <div className="account-order-preview">
        {order.items.slice(0, 3).map((item) => (
          <img key={`${order.id}-${item.id}`} src={item.image} alt={item.name} />
        ))}

        {order.items.length > 3 ? <span>+{order.items.length - 3}</span> : null}
      </div>

      <footer>
        <p>
          {itemCount} sản phẩm • <strong>{formatCurrency(order.total)}</strong>
        </p>
        <button type="button" className="button button-light" onClick={() => onOpen(order)}>
          Xem chi tiết
        </button>
      </footer>
    </article>
  )
}

export default OrderCard
