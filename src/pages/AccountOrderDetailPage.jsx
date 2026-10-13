import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getOrderById } from "../api/orderApi";
import AccountNavigation from "../components/Account/AccountNavigation";
import { formatCurrency } from "../utils/formatCurrency";
import "./AccountOrdersPage.css";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAYABLE_STATUS = "PENDING";

function getOrderItems(order) {
  return Array.isArray(order?.items) ? order.items : [];
}

function getOrderItemCount(order) {
  return getOrderItems(order).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
}

function formatOrderDateTime(value) {
  if (!value) {
    return "Không khả dụng";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không khả dụng";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function getDetailErrorState(error) {
  if (error?.status === 404 || error?.status === 400) {
    return {
      status: "unavailable",
      message: "Đơn hàng này không khả dụng hoặc liên kết không còn hợp lệ.",
    };
  }

  if (error?.status === 401 || error?.status === 403) {
    return {
      status: "error",
      message: "Hãy đăng nhập lại để xem đơn hàng này.",
    };
  }

  if (error?.status >= 500) {
    return {
      status: "error",
      message: "Chi tiết đơn hàng hiện không khả dụng. Vui lòng thử lại sau.",
    };
  }

  return {
    status: "error",
    message: "Không thể tải chi tiết đơn hàng vào lúc này.",
  };
}

function AccountOrderDetailState({ title, message, action, alert = false }) {
  return (
    <section
      className="account-orders-state"
      aria-labelledby="account-order-detail-state-title"
      role={alert ? "alert" : undefined}
    >
      <p className="account-orders-state__kicker">Tài khoản</p>
      <h1 id="account-order-detail-state-title">{title}</h1>
      <p>{message}</p>
      {action}
    </section>
  );
}

function AccountOrderDetailSkeleton() {
  return (
    <section className="account-order-detail" aria-hidden="true">
      <div className="account-order-detail__header">
        <span className="account-orders-skeleton account-orders-skeleton--link" />
        <span className="account-orders-skeleton account-orders-skeleton--title" />
        <span className="account-orders-skeleton account-orders-skeleton--date" />
      </div>
      <div className="account-order-detail__layout">
        <div className="account-order-detail__main">
          <span className="account-orders-skeleton account-orders-skeleton--block" />
          <span className="account-orders-skeleton account-orders-skeleton--block" />
        </div>
        <span className="account-orders-skeleton account-orders-skeleton--aside" />
      </div>
    </section>
  );
}

function OrderMetadata({ order }) {
  return (
    <dl className="account-order-facts">
      <div>
        <dt>Mã đơn hàng</dt>
        <dd>{getOrderReference(order)}</dd>
      </div>
      <div>
        <dt>Trạng thái</dt>
        <dd>{getStatusLabel(order?.status)}</dd>
      </div>
      <div>
        <dt>Ngày đặt</dt>
        <dd>{formatOrderDateTime(order?.createdAt)}</dd>
      </div>
      <div>
        <dt>Cập nhật</dt>
        <dd>{formatOrderDateTime(order?.updatedAt)}</dd>
      </div>
    </dl>
  );
}

function OrderItems({ order }) {
  const items = getOrderItems(order);

  return (
    <section className="account-order-section" aria-labelledby="account-order-items-title">
      <h2 id="account-order-items-title">Sản phẩm</h2>
      <div className="account-order-items">
        <div className="account-order-item account-order-item--head" aria-hidden="true">
          <span>Sản phẩm</span>
          <span>Đơn giá</span>
          <span>Số lượng</span>
          <span>Thành tiền</span>
        </div>
        {items.map((item, index) => (
          <article
            className="account-order-item"
            key={`${item.productId || item.productName || "item"}-${index}`}
          >
            <div className="account-order-item__product">
              <span>Sản phẩm</span>
              <strong>{item.productName || "Sản phẩm"}</strong>
            </div>
            <div>
              <span>Đơn giá</span>
              <strong>{formatCurrency(item.unitPrice) || "Không khả dụng"}</strong>
            </div>
            <div>
              <span>Số lượng</span>
              <strong>{Number(item.quantity) || 0}</strong>
            </div>
            <div className="account-order-item__subtotal">
              <span>Thành tiền</span>
              <strong>{formatCurrency(item.subtotal) || "Không khả dụng"}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ShippingSnapshot({ order }) {
  return (
    <section className="account-order-section" aria-labelledby="account-order-shipping-title">
      <h2 id="account-order-shipping-title">Thông tin giao hàng</h2>
      <dl className="account-order-facts">
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

function OrderTotal({ order }) {
  return (
    <aside className="account-order-total" aria-labelledby="account-order-total-title">
      <h2 id="account-order-total-title">Tổng tiền</h2>
      <dl>
        <div>
          <dt>Sản phẩm</dt>
          <dd>{getOrderItemCount(order)}</dd>
        </div>
        <div>
          <dt>Thành tiền</dt>
          <dd>{formatCurrency(order?.totalAmount) || "Không khả dụng"}</dd>
        </div>
      </dl>
      {order?.status === PAYABLE_STATUS ? (
        <Link className="button button--primary account-order-total__payment" to={`/payment/${order.id}`}>
          Tiếp tục thanh toán
        </Link>
      ) : null}
    </aside>
  );
}

export default function AccountOrderDetailPage() {
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

  useEffect(() => {
    if (!isValidOrderId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadOrder() {
      setOrderState({
        status: "loading",
        order: null,
        message: "",
      });

      try {
        const order = await getOrderById(orderId, {
          signal: controller.signal,
        });

        setOrderState({
          status: "success",
          order,
          message: "",
        });
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

    loadOrder();

    return () => {
      controller.abort();
    };
  }, [isValidOrderId, orderId, retryKey]);

  if (!isValidOrderId) {
    return (
      <AccountOrderDetailState
        title="Đơn hàng không khả dụng."
        message="Đơn hàng này không khả dụng hoặc liên kết không còn hợp lệ."
        action={
          <Link className="button button--primary" to="/account/orders">
            Quay lại đơn hàng
          </Link>
        }
      />
    );
  }

  if (orderState.status === "loading") {
    return <AccountOrderDetailSkeleton />;
  }

  if (orderState.status === "unavailable") {
    return (
      <AccountOrderDetailState
        title="Đơn hàng không khả dụng."
        message={orderState.message}
        action={
          <Link className="button button--primary" to="/account/orders">
            Quay lại đơn hàng
          </Link>
        }
      />
    );
  }

  if (orderState.status === "error") {
    return (
      <AccountOrderDetailState
        title="Chi tiết đơn hàng không khả dụng."
        message={orderState.message}
        alert
        action={
          <div className="account-orders-state__actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setRetryKey((key) => key + 1)}
            >
              Thử lại
            </button>
            <Link className="button button--primary" to="/account/orders">
              Quay lại đơn hàng
            </Link>
          </div>
        }
      />
    );
  }

  const order = orderState.order;

  return (
    <article className="account-order-detail" aria-labelledby="account-order-detail-title">
      <div className="account-order-detail__header">
        <Link className="account-order-detail__back" to="/account/orders">
          Quay lại đơn hàng
        </Link>
        <p className="account-order-detail__kicker">Đơn hàng</p>
        <h1 id="account-order-detail-title">{getOrderReference(order)}</h1>
        <p>Chi tiết đơn hàng được lưu khi thanh toán.</p>
        <AccountNavigation />
      </div>

      <div className="account-order-detail__layout">
        <div className="account-order-detail__main">
          <section className="account-order-section" aria-labelledby="account-order-meta-title">
            <h2 id="account-order-meta-title">Chi tiết đơn hàng</h2>
            <OrderMetadata order={order} />
          </section>

          <OrderItems order={order} />
          <ShippingSnapshot order={order} />
        </div>

        <OrderTotal order={order} />
      </div>
    </article>
  );
}
