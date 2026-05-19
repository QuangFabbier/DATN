import { useEffect, useMemo, useState } from "react";
import EmptyState from "../../components/EmptyState";
import { AdminOrdersSkeleton } from "../../components/Skeleton";
import { ButtonSpinner } from "../../components/Spinner";
import { useToast } from "../../hooks/useToast";
import {
  getAvailableStatusTransitions,
  getOrders,
  ORDER_STATUSES,
  ORDER_STORAGE_KEY,
  ORDER_STORAGE_UPDATED_EVENT,
  updateOrderStatus,
} from "../../services/orderStorage";
import { formatCurrency } from "../../utils/formatCurrency";
import { withMinimumDelay } from "../../utils/timing";

const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: ORDER_STATUSES.PENDING, label: "Chờ xác nhận" },
  { value: ORDER_STATUSES.CONFIRMED, label: "Đã xác nhận" },
  { value: ORDER_STATUSES.SHIPPING, label: "Đang giao" },
  { value: ORDER_STATUSES.COMPLETED, label: "Hoàn thành" },
  { value: ORDER_STATUSES.CANCELLED, label: "Đã hủy" },
];

const statusLabelMap = {
  [ORDER_STATUSES.PENDING]: "Chờ xác nhận",
  [ORDER_STATUSES.CONFIRMED]: "Đã xác nhận",
  [ORDER_STATUSES.SHIPPING]: "Đang giao",
  [ORDER_STATUSES.COMPLETED]: "Hoàn thành",
  [ORDER_STATUSES.CANCELLED]: "Đã hủy",
};

const statusActionLabelMap = {
  [ORDER_STATUSES.CONFIRMED]: "Xác nhận đơn",
  [ORDER_STATUSES.SHIPPING]: "Bắt đầu giao hàng",
  [ORDER_STATUSES.COMPLETED]: "Hoàn thành đơn",
  [ORDER_STATUSES.CANCELLED]: "Hủy đơn",
};

function formatOrderDate(dateValue) {
  return new Date(dateValue).toLocaleString("vi-VN");
}

function AdminOrders() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const data = await withMinimumDelay(Promise.resolve(getOrders()), 220);

        if (isMounted) {
          setOrders(data);
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Không thể tải danh sách đơn hàng.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrders();

    function handleOrdersUpdated(event) {
      const nextOrders = event?.detail?.orders;

      if (Array.isArray(nextOrders)) {
        setOrders(nextOrders);
      } else {
        setOrders(getOrders());
      }
    }

    function handleStorageSync(event) {
      if (event.key === ORDER_STORAGE_KEY) {
        setOrders(getOrders());
      }
    }

    window.addEventListener(ORDER_STORAGE_UPDATED_EVENT, handleOrdersUpdated);
    window.addEventListener("storage", handleStorageSync);

    return () => {
      isMounted = false;
      window.removeEventListener(
        ORDER_STORAGE_UPDATED_EVENT,
        handleOrdersUpdated,
      );
      window.removeEventListener("storage", handleStorageSync);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase();

    const nextOrders = orders
      .filter((order) => {
        if (selectedStatus === "all") {
          return true;
        }

        return order.status === selectedStatus;
      })
      .filter((order) => {
        if (!normalizedKeyword) {
          return true;
        }

        const searchableText = [
          String(order.id || ""),
          String(order.code || ""),
          String(order.customerInfo?.fullName || ""),
          String(order.customerInfo?.phone || ""),
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedKeyword);
      });

    return [...nextOrders].sort((firstOrder, secondOrder) => {
      const firstTimestamp = new Date(firstOrder.createdAt).getTime();
      const secondTimestamp = new Date(secondOrder.createdAt).getTime();

      return sortBy === "oldest"
        ? firstTimestamp - secondTimestamp
        : secondTimestamp - firstTimestamp;
    });
  }, [orders, searchKeyword, selectedStatus, sortBy]);

  async function handleUpdateOrderStatus(order, nextStatus) {
    const shouldUpdate = window.confirm(
      `Xác nhận đổi trạng thái đơn ${order.id} từ "${statusLabelMap[order.status]}" sang "${statusLabelMap[nextStatus]}"?`,
    );

    if (!shouldUpdate || updatingOrderId) {
      return;
    }

    try {
      setUpdatingOrderId(order.id);
      const result = await withMinimumDelay(
        Promise.resolve(
          updateOrderStatus(
            order.id,
            nextStatus,
            "Cập nhật từ trang quản trị đơn hàng.",
          ),
        ),
        300,
      );

      setOrders(result.orders);

      if (selectedOrder?.id === order.id) {
        setSelectedOrder(result.order);
      }

      showToast({
        type: "success",
        title: "Đã cập nhật trạng thái đơn hàng",
        message: `Đơn ${order.id} hiện ở trạng thái "${statusLabelMap[nextStatus]}".`,
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Không thể cập nhật trạng thái",
        message: error?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setUpdatingOrderId("");
    }
  }

  if (isLoading) {
    return <AdminOrdersSkeleton />;
  }

  if (errorMessage) {
    return (
      <EmptyState
        title="Không thể tải danh sách đơn hàng"
        description={errorMessage}
        icon="fa-circle-exclamation"
        tone="warning"
      />
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">Quản lý đơn hàng</p>
          <h2>Orders Management</h2>
        </div>
      </div>

      <div className="admin-toolbar admin-orders-toolbar">
        <input
          type="search"
          value={searchKeyword}
          onChange={(event) => setSearchKeyword(event.target.value)}
          placeholder="Tìm theo mã đơn, tên khách hoặc số điện thoại"
        />

        <select
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value)}
        >
          {statusOptions.map((statusOption) => (
            <option key={statusOption.value} value={statusOption.value}>
              {statusOption.label}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="newest">Mới nhất trước</option>
          <option value="oldest">Cũ nhất trước</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Chưa có đơn hàng nào"
          description="Đơn mới sẽ xuất hiện khi khách hàng hoàn tất checkout trên storefront."
          icon="fa-bag-shopping"
        />
      ) : (
        <div className="admin-table-card">
          <div className="admin-table-meta">
            <span>{filteredOrders.length} đơn hàng phù hợp</span>
          </div>

          {filteredOrders.length === 0 ? (
            <EmptyState
              title="Không có đơn hàng phù hợp"
              description="Không có kết quả theo bộ lọc hiện tại. Hãy đổi từ khóa hoặc trạng thái."
              icon="fa-filter-circle-xmark"
            />
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th>Điện thoại</th>
                    <th>Tổng tiền</th>
                    <th>Sản phẩm</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const itemCount = order.items.reduce(
                      (count, item) => count + item.quantity,
                      0,
                    );

                    return (
                      <tr key={order.id}>
                        <td>
                          <strong>{order.id}</strong>
                        </td>
                        <td>
                          {order.customerInfo?.fullName || "Khách vãng lai"}
                        </td>
                        <td>{order.customerInfo?.phone || "Chưa có"}</td>
                        <td>{formatCurrency(order.total)}</td>
                        <td>{itemCount}</td>
                        <td>
                          <span
                            className={`admin-status-badge order-${order.status}`}
                          >
                            {statusLabelMap[order.status] || "Đang xử lý"}
                          </span>
                        </td>
                        <td>{formatOrderDate(order.createdAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="button button-light"
                            onClick={() => setSelectedOrder(order)}
                          >
                            Xem
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedOrder ? (
        <div
          className="admin-modal-backdrop"
          onClick={() => setSelectedOrder(null)}
        >
          <section
            className="admin-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="admin-modal-header">
              <div>
                <p className="eyebrow">Chi tiết đơn hàng</p>
                <h2>{selectedOrder.id}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Đóng chi tiết đơn hàng"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </header>

            <div className="admin-orders-modal-grid">
              <article className="admin-orders-panel">
                <h3>Thông tin khách hàng</h3>
                <p>
                  <span>Họ tên:</span>{" "}
                  {selectedOrder.customerInfo?.fullName || "Chưa có"}
                </p>
                <p>
                  <span>Số điện thoại:</span>{" "}
                  {selectedOrder.customerInfo?.phone || "Chưa có"}
                </p>
                <p>
                  <span>Địa chỉ:</span>{" "}
                  {selectedOrder.customerInfo?.address || "Chưa có"}
                </p>
                <p>
                  <span>Ghi chú:</span>{" "}
                  {selectedOrder.customerInfo?.note || "Không có"}
                </p>
                <p>
                  <span>Thanh toán:</span>{" "}
                  {selectedOrder.customerInfo?.paymentMethod === "qr"
                    ? "Thanh toán QR"
                    : "Thanh toán khi nhận hàng"}
                </p>
              </article>

              <article className="admin-orders-panel">
                <h3>Sản phẩm trong đơn</h3>
                <div className="admin-orders-item-list">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={`${selectedOrder.id}-${item.id}`}
                      className="admin-orders-item-row"
                    >
                      <img src={item.image} alt={item.name} />
                      <div>
                        <strong>{item.name}</strong>
                        <p>
                          {formatCurrency(item.price)} x {item.quantity}
                        </p>
                      </div>
                      <strong>
                        {formatCurrency(item.price * item.quantity)}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="summary-breakdown">
                  <p>
                    <span>Tạm tính</span>
                    <strong>{formatCurrency(selectedOrder.subtotal)}</strong>
                  </p>
                  <p>
                    <span>Phí vận chuyển</span>
                    <strong>{formatCurrency(selectedOrder.shippingFee)}</strong>
                  </p>
                  <p>
                    <span>Tổng cộng</span>
                    <strong>{formatCurrency(selectedOrder.total)}</strong>
                  </p>
                </div>
              </article>

              <article className="admin-orders-panel admin-orders-full-width">
                <h3>Timeline trạng thái</h3>
                <div className="admin-order-timeline">
                  {[...selectedOrder.statusHistory]
                    .sort(
                      (firstStatusLog, secondStatusLog) =>
                        new Date(firstStatusLog.at).getTime() -
                        new Date(secondStatusLog.at).getTime(),
                    )
                    .map((statusLog) => (
                      <div
                        key={`${selectedOrder.id}-${statusLog.status}-${statusLog.at}`}
                        className="admin-order-timeline-item"
                      >
                        <span
                          className={`admin-status-badge order-${statusLog.status}`}
                        >
                          {statusLabelMap[statusLog.status]}
                        </span>
                        <p>{formatOrderDate(statusLog.at)}</p>
                        {statusLog.note ? (
                          <small>{statusLog.note}</small>
                        ) : null}
                      </div>
                    ))}
                </div>

                <div className="admin-order-status-actions">
                  {getAvailableStatusTransitions(selectedOrder.status)
                    .length === 0 ? (
                    <p className="section-heading-meta">
                      Đơn hàng đã ở trạng thái cuối, không còn thao tác chuyển
                      trạng thái.
                    </p>
                  ) : (
                    getAvailableStatusTransitions(selectedOrder.status).map(
                      (nextStatus) => (
                        <button
                          key={`${selectedOrder.id}-${nextStatus}`}
                          type="button"
                          className={`button ${nextStatus === ORDER_STATUSES.CANCELLED ? "admin-danger-button" : ""}`}
                          onClick={() =>
                            handleUpdateOrderStatus(selectedOrder, nextStatus)
                          }
                          disabled={updatingOrderId === selectedOrder.id}
                        >
                          {updatingOrderId === selectedOrder.id ? (
                            <>
                              <ButtonSpinner size="sm" />
                              <span>Đang cập nhật...</span>
                            </>
                          ) : (
                            statusActionLabelMap[nextStatus]
                          )}
                        </button>
                      ),
                    )
                  )}
                </div>
              </article>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default AdminOrders;
