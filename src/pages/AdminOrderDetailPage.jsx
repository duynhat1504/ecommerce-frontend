import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getAdminOrderById,
  updateAdminOrderStatus,
} from "../api/adminOrderApi";
import { formatCurrency } from "../utils/formatCurrency";
import "./AdminOrdersPage.css";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_TRANSITIONS = {
  PENDING: [
    { status: "CONFIRMED", label: "Xác nhận" },
    { status: "CANCELLED", label: "Hủy đơn" },
  ],
  CONFIRMED: [
    { status: "SHIPPING", label: "Chuyển sang đang giao" },
    { status: "CANCELLED", label: "Hủy đơn" },
  ],
  SHIPPING: [{ status: "COMPLETED", label: "Hoàn thành" }],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
};

function getOrderItems(order) {
  return Array.isArray(order?.items) ? order.items : [];
}

function getOrderItemCount(order) {
  return getOrderItems(order).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
}

function getOrderReference(order) {
  return order?.orderCode || order?.id || "Đơn hàng";
}

function getStatusLabel(status) {
  const labels = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    SHIPPING: "Đang giao",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    EXPIRED: "Hết hạn",
  };

  return labels[status] || "Không khả dụng";
}

function getDateTimeLabel(value) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDetailErrorState(error) {
  if (error?.status === 404) {
    return {
      status: "missing",
      message: "Không tìm thấy đơn hàng.",
    };
  }

  if (error?.status === 400) {
    return {
      status: "missing",
      message: "Mã định danh đơn hàng không hợp lệ.",
    };
  }

  if (error?.status === 401 || error?.status === 403) {
    return {
      status: "error",
      message: "Cần quyền quản trị. Hãy đăng nhập lại bằng tài khoản quản trị.",
    };
  }

  if (error?.status >= 500) {
    return {
      status: "error",
      message: "Dịch vụ đơn hàng hiện không khả dụng.",
    };
  }

  if (!error?.status) {
    return {
      status: "network",
      message: "Kết nối mạng thất bại. Hãy kiểm tra máy chủ API rồi thử lại.",
    };
  }

  return {
    status: "error",
    message: "Không thể tải chi tiết đơn hàng.",
  };
}

function getMutationMessage(error, status) {
  if (error?.status === 404) {
    return "Không tìm thấy đơn hàng. Đơn hàng có thể đã bị xóa hoặc mã không hợp lệ.";
  }

  if (error?.status === 400) {
    const backendMessage = error.message || "";

    if (backendMessage.startsWith("Cannot change order status")) {
      return "Không thể chuyển trạng thái đơn hàng theo thao tác này.";
    }

    return "Backend từ chối thay đổi trạng thái đơn hàng.";
  }

  if (error?.status === 401 || error?.status === 403) {
    return "Cần quyền quản trị. Hãy đăng nhập lại bằng tài khoản quản trị.";
  }

  if (error?.status >= 500) {
    return "Dịch vụ đơn hàng hiện không thể đổi trạng thái.";
  }

  if (!error?.status) {
    return "Kết nối mạng thất bại. Đơn hàng chưa được thay đổi.";
  }

  return `Không thể đổi trạng thái đơn hàng thành ${getStatusLabel(status)}.`;
}

function AdminOrderDetailState({ alert = false, action, message, title }) {
  return (
    <section
      className="admin-orders-state admin-orders-state--page"
      aria-labelledby="admin-order-detail-state-title"
      role={alert ? "alert" : undefined}
    >
      <p className="admin-orders__kicker">Quản lý đơn hàng</p>
      <h1 id="admin-order-detail-state-title">{title}</h1>
      <p>{message}</p>
      {action}
    </section>
  );
}

function AdminOrderDetailSkeleton() {
  return (
    <section className="admin-order-detail" aria-hidden="true">
      <div className="admin-order-detail__header">
        <span className="admin-orders-skeleton admin-orders-skeleton--action" />
        <span className="admin-orders-skeleton admin-orders-skeleton--heading" />
        <span className="admin-orders-skeleton admin-orders-skeleton--wide" />
      </div>
      <div className="admin-order-detail__layout">
        <div className="admin-order-detail__main">
          <span className="admin-orders-skeleton admin-orders-skeleton--block" />
          <span className="admin-orders-skeleton admin-orders-skeleton--block" />
        </div>
        <span className="admin-orders-skeleton admin-orders-skeleton--panel" />
      </div>
    </section>
  );
}

function OrderFacts({ order }) {
  return (
    <dl className="admin-order-facts">
      <div>
        <dt>Mã đơn hàng</dt>
        <dd>{getOrderReference(order)}</dd>
      </div>
      <div>
        <dt>Trạng thái</dt>
        <dd>
          <span
            className={`admin-orders-status admin-orders-status--${String(
              order?.status || "unknown",
            ).toLowerCase()}`}
          >
            {getStatusLabel(order?.status)}
          </span>
        </dd>
      </div>
      <div>
        <dt>Ngày đặt</dt>
        <dd>{getDateTimeLabel(order?.createdAt)}</dd>
      </div>
      <div>
        <dt>Cập nhật</dt>
        <dd>{getDateTimeLabel(order?.updatedAt)}</dd>
      </div>
      <div>
        <dt>Mã định danh đơn hàng</dt>
        <dd>{order?.id || "Không khả dụng"}</dd>
      </div>
    </dl>
  );
}

function OrderItems({ order }) {
  const items = getOrderItems(order);

  return (
    <section className="admin-order-section" aria-labelledby="admin-order-items-title">
      <h2 id="admin-order-items-title">Chi tiết sản phẩm</h2>
      <div className="admin-orders-table-wrap">
        <table className="admin-orders-table admin-orders-table--items">
          <caption className="sr-only">Chi tiết sản phẩm trong đơn hàng</caption>
          <thead>
            <tr>
              <th scope="col">Sản phẩm</th>
              <th scope="col">Đơn giá</th>
              <th scope="col">Số lượng</th>
              <th scope="col">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr className="admin-orders-row" key={`${item.productId || item.productName}-${index}`}>
                <th scope="row" data-label="Sản phẩm">
                  <span className="admin-orders-row__name">
                    {item.productName || "Sản phẩm"}
                  </span>
                  <span className="admin-orders-row__meta">
                    {item.productId || "Sản phẩm đã lưu"}
                  </span>
                </th>
                <td data-label="Đơn giá" className="admin-orders-number">
                  {formatCurrency(item.unitPrice) || "Không khả dụng"}
                </td>
                <td data-label="Số lượng" className="admin-orders-number">
                  {Number.isFinite(Number(item.quantity)) ? item.quantity : "0"}
                </td>
                <td data-label="Thành tiền" className="admin-orders-number">
                  {formatCurrency(item.subtotal) || "Không khả dụng"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ShippingSnapshot({ order }) {
  return (
    <section className="admin-order-section" aria-labelledby="admin-order-shipping-title">
      <h2 id="admin-order-shipping-title">Thông tin giao hàng</h2>
      <dl className="admin-order-facts">
        <div>
          <dt>Người nhận</dt>
          <dd>{order?.recipientName || "Không khả dụng"}</dd>
        </div>
        <div>
          <dt>Số điện thoại</dt>
          <dd>{order?.phoneNumber || "Không khả dụng"}</dd>
        </div>
        <div>
          <dt>Địa chỉ</dt>
          <dd>{order?.shippingAddress || "Không khả dụng"}</dd>
        </div>
      </dl>
    </section>
  );
}

function StatusActions({
  actionMessage,
  mutatingStatus,
  onChangeStatus,
  order,
}) {
  const transitions = STATUS_TRANSITIONS[order?.status] || [];
  const isMutating = Boolean(mutatingStatus);

  return (
    <aside className="admin-order-panel" aria-labelledby="admin-order-status-title">
      <div className="admin-order-panel__header">
        <h2 id="admin-order-status-title">Trạng thái</h2>
        <span className="admin-orders-number">{getStatusLabel(order?.status)}</span>
      </div>

      <dl className="admin-order-facts admin-order-facts--compact">
        <div>
          <dt>Sản phẩm</dt>
          <dd>{getOrderItemCount(order)}</dd>
        </div>
        <div>
          <dt>Tổng tiền</dt>
          <dd>{formatCurrency(order?.totalAmount) || "Không khả dụng"}</dd>
        </div>
      </dl>

      {transitions.length ? (
        <div className="admin-order-actions" aria-label="Các thao tác trạng thái được hỗ trợ">
          {transitions.map((transition) => (
            <button
              key={transition.status}
              type="button"
              className={
                transition.status === "CANCELLED"
                  ? "button button--ghost admin-order-actions__danger"
                  : "button button--primary"
              }
              onClick={() => onChangeStatus(transition.status)}
              disabled={isMutating}
            >
              {mutatingStatus === transition.status ? "Đang lưu..." : transition.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="admin-order-note">
          Không có thao tác trạng thái nào cho trạng thái này.
        </p>
      )}

      {actionMessage ? (
        <p className="admin-orders-alert" role="alert">
          {actionMessage}
        </p>
      ) : null}
    </aside>
  );
}

export default function AdminOrderDetailPage() {
  const { orderId } = useParams();
  const isValidOrderId = useMemo(
    () => UUID_PATTERN.test(orderId || ""),
    [orderId],
  );
  const [orderState, setOrderState] = useState({
    status: "loading",
    order: null,
    message: "",
  });
  const [retryKey, setRetryKey] = useState(0);
  const [mutatingStatus, setMutatingStatus] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const mutationInFlightRef = useRef(false);

  const loadOrder = useCallback(async (options = {}) => {
    const order = await getAdminOrderById(orderId, options);

    setOrderState({
      status: "success",
      order,
      message: "",
    });
    return order;
  }, [orderId]);

  useEffect(() => {
    if (!isValidOrderId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadOrderForPage() {
      setOrderState((current) => ({
        status: "loading",
        order: current.order,
        message: "",
      }));
      setActionMessage("");

      try {
        await loadOrder({ signal: controller.signal });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        const nextState = getDetailErrorState(error);

        setOrderState({
          status: nextState.status,
          order: null,
          message: nextState.message,
        });
      }
    }

    loadOrderForPage();

    return () => {
      controller.abort();
    };
  }, [isValidOrderId, loadOrder, retryKey]);

  async function handleChangeStatus(nextStatus) {
    if (!orderState.order?.id || mutationInFlightRef.current) {
      return;
    }

    mutationInFlightRef.current = true;
    setMutatingStatus(nextStatus);
    setActionMessage("");

    try {
      await updateAdminOrderStatus(orderState.order.id, nextStatus);

      try {
        await loadOrder();
      } catch {
        setActionMessage(
          "Đã gửi yêu cầu trạng thái, nhưng không thể tải lại đơn hàng.",
        );
      }
    } catch (error) {
      setActionMessage(getMutationMessage(error, nextStatus));
      await loadOrder().catch(() => {});
    } finally {
      mutationInFlightRef.current = false;
      setMutatingStatus("");
    }
  }

  function handleRetry() {
    setRetryKey((key) => key + 1);
  }

  if (!isValidOrderId) {
    return (
      <AdminOrderDetailState
        title="Không tìm thấy đơn hàng."
        message="Mã định danh đơn hàng không phải UUID hợp lệ."
        action={
          <Link className="button button--primary" to="/admin/orders">
            Quay lại đơn hàng
          </Link>
        }
      />
    );
  }

  if (orderState.status === "loading" && !orderState.order) {
    return <AdminOrderDetailSkeleton />;
  }

  if (orderState.status === "missing") {
    return (
      <AdminOrderDetailState
        title="Không tìm thấy đơn hàng."
        message={orderState.message}
        action={
          <Link className="button button--primary" to="/admin/orders">
            Quay lại đơn hàng
          </Link>
        }
      />
    );
  }

  if (orderState.status === "error" || orderState.status === "network") {
    return (
      <AdminOrderDetailState
        title="Đơn hàng không khả dụng."
        message={orderState.message}
        alert
        action={
          <div className="admin-orders-state__actions">
            <button type="button" className="button button--ghost" onClick={handleRetry}>
              Thử lại
            </button>
            <Link className="button button--primary" to="/admin/orders">
              Quay lại đơn hàng
            </Link>
          </div>
        }
      />
    );
  }

  const order = orderState.order;

  return (
    <article className="admin-order-detail" aria-labelledby="admin-order-detail-title">
      <header className="admin-order-detail__header">
        <Link className="admin-orders-text-link" to="/admin/orders">
          Quay lại đơn hàng
        </Link>
        <div className="admin-order-detail__heading">
          <div>
            <p className="admin-orders__kicker">Đơn hàng quản trị</p>
            <h1 id="admin-order-detail-title">{getOrderReference(order)}</h1>
          </div>
          <button
            type="button"
            className="button button--ghost"
            onClick={handleRetry}
            disabled={orderState.status === "loading" || Boolean(mutatingStatus)}
          >
            Làm mới
          </button>
        </div>
      </header>

      <div className="admin-order-detail__layout">
        <div className="admin-order-detail__main">
          <section className="admin-order-section" aria-labelledby="admin-order-facts-title">
            <h2 id="admin-order-facts-title">Chi tiết đơn hàng</h2>
            <OrderFacts order={order} />
          </section>

          <OrderItems order={order} />
          <ShippingSnapshot order={order} />
        </div>

        <StatusActions
          actionMessage={actionMessage}
          mutatingStatus={mutatingStatus}
          onChangeStatus={handleChangeStatus}
          order={order}
        />
      </div>
    </article>
  );
}
