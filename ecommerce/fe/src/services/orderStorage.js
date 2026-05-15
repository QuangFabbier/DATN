export const ORDER_STORAGE_KEY = 'nexora_orders'
export const ORDER_STORAGE_UPDATED_EVENT = 'nexora-orders-updated'

export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPING: 'shipping',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

const VALID_STATUSES = new Set(Object.values(ORDER_STATUSES))

const ORDER_STATUS_TRANSITIONS = {
  [ORDER_STATUSES.PENDING]: [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.CONFIRMED]: [ORDER_STATUSES.SHIPPING, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.SHIPPING]: [ORDER_STATUSES.COMPLETED],
  [ORDER_STATUSES.COMPLETED]: [],
  [ORDER_STATUSES.CANCELLED]: [],
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStorageJSON(key, fallbackValue) {
  if (!canUseStorage()) {
    return fallbackValue
  }

  const storedValue = window.localStorage.getItem(key)

  if (!storedValue) {
    return fallbackValue
  }

  try {
    return JSON.parse(storedValue)
  } catch {
    window.localStorage.removeItem(key)
    return fallbackValue
  }
}

function writeStorageJSON(key, value) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function dispatchOrderUpdatedEvent(orders, updatedOrder = null) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent(ORDER_STORAGE_UPDATED_EVENT, {
      detail: {
        orders,
        updatedOrder,
      },
    }),
  )
}

function createOrderId() {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`
  const randomPart = Math.floor(Math.random() * 90000 + 10000)

  return `NXR-${datePart}-${randomPart}`
}

function normalizeDate(value, fallbackDate = new Date()) {
  const parsedDate = value ? new Date(value) : null

  if (parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString()
  }

  return fallbackDate.toISOString()
}

function normalizeOrderItems(items) {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => {
      const quantity = Math.max(1, Number(item?.quantity) || 1)
      const price = Math.max(0, Number(item?.price) || 0)
      const id = String(item?.id || item?._id || '')
      const name = String(item?.name || 'Sản phẩm Nexora').trim()
      const image = String(item?.image || '').trim()

      if (!id || !name) {
        return null
      }

      return {
        id,
        name,
        image,
        price,
        quantity,
      }
    })
    .filter(Boolean)
}

function normalizeCustomerInfo(customerInfo) {
  const normalizedCustomerInfo = customerInfo && typeof customerInfo === 'object' ? customerInfo : {}

  return {
    fullName: String(normalizedCustomerInfo.fullName || normalizedCustomerInfo.fullname || '').trim(),
    phone: String(normalizedCustomerInfo.phone || '').trim(),
    address: String(normalizedCustomerInfo.address || '').trim(),
    note: String(normalizedCustomerInfo.note || '').trim(),
    paymentMethod: String(normalizedCustomerInfo.paymentMethod || 'cod').trim(),
  }
}

function normalizeOrderStatus(status) {
  return VALID_STATUSES.has(status) ? status : ORDER_STATUSES.PENDING
}

function normalizeStatusHistory(statusHistory, fallbackStatus, fallbackDate) {
  if (Array.isArray(statusHistory) && statusHistory.length > 0) {
    const normalizedStatusHistory = statusHistory
      .map((statusLog) => {
        const status = normalizeOrderStatus(statusLog?.status)
        const at = normalizeDate(statusLog?.at, fallbackDate)
        const note = String(statusLog?.note || '').trim()

        return {
          status,
          at,
          note,
        }
      })
      .filter(Boolean)

    if (normalizedStatusHistory.length > 0) {
      return normalizedStatusHistory
    }
  }

  return [
    {
      status: fallbackStatus,
      at: normalizeDate(fallbackDate, fallbackDate),
      note: 'Đơn hàng được tạo trên storefront.',
    },
  ]
}

function normalizeStoredOrder(order, index = 0) {
  if (!order || typeof order !== 'object') {
    return null
  }

  const fallbackDate = new Date(Date.now() - index * 60 * 1000)
  const createdAt = normalizeDate(order.createdAt || order.date, fallbackDate)
  const status = normalizeOrderStatus(order.status)
  const items = normalizeOrderItems(order.items)

  const subtotalFromItems = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const subtotal = Math.max(0, Number(order.subtotal) || subtotalFromItems)
  const shippingFee = Math.max(0, Number(order.shippingFee) || 0)
  const total = Math.max(0, Number(order.total) || subtotal + shippingFee)

  const id = String(order.id || order.code || createOrderId())

  return {
    id,
    code: String(order.code || id),
    customerInfo: normalizeCustomerInfo(order.customerInfo),
    items,
    subtotal,
    shippingFee,
    total,
    status,
    createdAt,
    date: createdAt,
    statusHistory: normalizeStatusHistory(order.statusHistory, status, createdAt),
  }
}

function normalizeOrderList(orderList) {
  const normalizedOrders = Array.isArray(orderList)
    ? orderList.map((order, index) => normalizeStoredOrder(order, index)).filter(Boolean)
    : []

  return normalizedOrders.sort(
    (firstOrder, secondOrder) =>
      new Date(secondOrder.createdAt).getTime() - new Date(firstOrder.createdAt).getTime(),
  )
}

function persistOrders(orderList, updatedOrder = null) {
  const normalizedOrders = normalizeOrderList(orderList)
  writeStorageJSON(ORDER_STORAGE_KEY, normalizedOrders)
  dispatchOrderUpdatedEvent(normalizedOrders, updatedOrder)
  return normalizedOrders
}

export function getOrders() {
  const storedOrders = readStorageJSON(ORDER_STORAGE_KEY, [])
  return normalizeOrderList(storedOrders)
}

export function getOrderById(orderId) {
  return getOrders().find((order) => order.id === String(orderId) || order.code === String(orderId)) || null
}

export function getAvailableStatusTransitions(currentStatus) {
  return ORDER_STATUS_TRANSITIONS[normalizeOrderStatus(currentStatus)] || []
}

export function createOrderRecord(orderInput) {
  const currentOrders = getOrders()
  const createdAt = new Date().toISOString()
  const id = createOrderId()
  const status = ORDER_STATUSES.PENDING

  const items = normalizeOrderItems(orderInput?.items)
  const subtotalFromItems = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const subtotal = Math.max(0, Number(orderInput?.subtotal) || subtotalFromItems)
  const shippingFee = Math.max(0, Number(orderInput?.shippingFee) || 0)
  const total = Math.max(0, Number(orderInput?.total) || subtotal + shippingFee)

  const nextOrder = {
    id,
    code: id,
    customerInfo: normalizeCustomerInfo(orderInput?.customerInfo),
    items,
    subtotal,
    shippingFee,
    total,
    status,
    createdAt,
    date: createdAt,
    statusHistory: [
      {
        status,
        at: createdAt,
        note: 'Đơn hàng được tạo từ checkout storefront.',
      },
    ],
  }

  const nextOrders = persistOrders([nextOrder, ...currentOrders], nextOrder)

  return {
    order: nextOrder,
    orders: nextOrders,
  }
}

export function updateOrderStatus(orderId, nextStatus, statusNote = '') {
  const normalizedOrderId = String(orderId)
  const normalizedNextStatus = normalizeOrderStatus(nextStatus)
  const currentOrders = getOrders()
  const targetOrder = currentOrders.find((order) => order.id === normalizedOrderId)

  if (!targetOrder) {
    const error = new Error('Không tìm thấy đơn hàng cần cập nhật.')
    error.code = 'ORDER_NOT_FOUND'
    throw error
  }

  const availableTransitions = getAvailableStatusTransitions(targetOrder.status)

  if (!availableTransitions.includes(normalizedNextStatus)) {
    const error = new Error('Trạng thái không hợp lệ theo luồng xử lý đơn hàng.')
    error.code = 'ORDER_INVALID_TRANSITION'
    throw error
  }

  const updatedOrder = {
    ...targetOrder,
    status: normalizedNextStatus,
    statusHistory: [
      ...targetOrder.statusHistory,
      {
        status: normalizedNextStatus,
        at: new Date().toISOString(),
        note: String(statusNote || '').trim(),
      },
    ],
  }

  const nextOrders = persistOrders(
    currentOrders.map((order) => (order.id === normalizedOrderId ? updatedOrder : order)),
    updatedOrder,
  )

  return {
    order: updatedOrder,
    orders: nextOrders,
  }
}

export function getOrderStats() {
  const orders = getOrders()

  return {
    totalOrders: orders.length,
    pendingOrders: orders.filter((order) => order.status === ORDER_STATUSES.PENDING).length,
    completedOrders: orders.filter((order) => order.status === ORDER_STATUSES.COMPLETED).length,
    revenue: orders
      .filter((order) => order.status === ORDER_STATUSES.COMPLETED)
      .reduce((sum, order) => sum + Number(order.total || 0), 0),
  }
}
