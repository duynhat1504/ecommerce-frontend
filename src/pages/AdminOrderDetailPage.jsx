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
    { status: "CONFIRMED", label: "Confirm" },
    { status: "CANCELLED", label: "Cancel" },
  ],
  CONFIRMED: [
    { status: "SHIPPING", label: "Mark shipping" },
    { status: "CANCELLED", label: "Cancel" },
  ],
  SHIPPING: [{ status: "COMPLETED", label: "Complete" }],
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
  return order?.orderCode || order?.id || "Order";
}

function getStatusLabel(status) {
  return status ? status.replaceAll("_", " ") : "Unavailable";
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
      message: "Order not found.",
    };
  }

  if (error?.status === 400) {
    return {
      status: "missing",
      message: error.message || "The order identifier was rejected.",
    };
  }

  if (error?.status === 401 || error?.status === 403) {
    return {
      status: "error",
      message: "Admin access is required. Sign in again with an admin account.",
    };
  }

  if (error?.status >= 500) {
    return {
      status: "error",
      message: "The order service is unavailable right now.",
    };
  }

  if (!error?.status) {
    return {
      status: "network",
      message: "Network connection failed. Check the API server and try again.",
    };
  }

  return {
    status: "error",
    message: "Order details could not be loaded.",
  };
}

function getMutationMessage(error, status) {
  if (error?.status === 404) {
    return "Order not found. The order may have been removed or the id is invalid.";
  }

  if (error?.status === 400) {
    const backendMessage = error.message || "The backend rejected this transition.";

    if (backendMessage.startsWith("Cannot change order status")) {
      return `Invalid transition: ${backendMessage}`;
    }

    return backendMessage;
  }

  if (error?.status === 401 || error?.status === 403) {
    return "Admin access is required. Sign in again with an admin account.";
  }

  if (error?.status >= 500) {
    return "The order service rejected the status change right now.";
  }

  if (!error?.status) {
    return "Network connection failed. The order was not changed locally.";
  }

  return `Could not change order status to ${getStatusLabel(status)}.`;
}

function AdminOrderDetailState({ alert = false, action, message, title }) {
  return (
    <section
      className="admin-orders-state admin-orders-state--page"
      aria-labelledby="admin-order-detail-state-title"
      role={alert ? "alert" : undefined}
    >
      <p className="admin-orders__kicker">Admin orders</p>
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
        <dt>Reference</dt>
        <dd>{getOrderReference(order)}</dd>
      </div>
      <div>
        <dt>Status</dt>
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
        <dt>Placed</dt>
        <dd>{getDateTimeLabel(order?.createdAt)}</dd>
      </div>
      <div>
        <dt>Updated</dt>
        <dd>{getDateTimeLabel(order?.updatedAt)}</dd>
      </div>
      <div>
        <dt>Order id</dt>
        <dd>{order?.id || "Unavailable"}</dd>
      </div>
    </dl>
  );
}

function OrderItems({ order }) {
  const items = getOrderItems(order);

  return (
    <section className="admin-order-section" aria-labelledby="admin-order-items-title">
      <h2 id="admin-order-items-title">Item snapshot</h2>
      <div className="admin-orders-table-wrap">
        <table className="admin-orders-table admin-orders-table--items">
          <caption className="sr-only">Historical order item records</caption>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Unit price</th>
              <th scope="col">Quantity</th>
              <th scope="col">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr className="admin-orders-row" key={`${item.productId || item.productName}-${index}`}>
                <th scope="row" data-label="Product">
                  <span className="admin-orders-row__name">
                    {item.productName || "Product"}
                  </span>
                  <span className="admin-orders-row__meta">
                    {item.productId || "Historical item"}
                  </span>
                </th>
                <td data-label="Unit price" className="admin-orders-number">
                  {formatCurrency(item.unitPrice) || "Unavailable"}
                </td>
                <td data-label="Quantity" className="admin-orders-number">
                  {Number.isFinite(Number(item.quantity)) ? item.quantity : "0"}
                </td>
                <td data-label="Subtotal" className="admin-orders-number">
                  {formatCurrency(item.subtotal) || "Unavailable"}
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
      <h2 id="admin-order-shipping-title">Shipping snapshot</h2>
      <dl className="admin-order-facts">
        <div>
          <dt>Recipient</dt>
          <dd>{order?.recipientName || "Unavailable"}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{order?.phoneNumber || "Unavailable"}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>{order?.shippingAddress || "Unavailable"}</dd>
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
        <h2 id="admin-order-status-title">Status</h2>
        <span className="admin-orders-number">{getStatusLabel(order?.status)}</span>
      </div>

      <dl className="admin-order-facts admin-order-facts--compact">
        <div>
          <dt>Items</dt>
          <dd>{getOrderItemCount(order)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatCurrency(order?.totalAmount) || "Unavailable"}</dd>
        </div>
      </dl>

      {transitions.length ? (
        <div className="admin-order-actions" aria-label="Supported status actions">
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
              {mutatingStatus === transition.status ? "Saving..." : transition.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="admin-order-note">
          No status actions are supported from this state.
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
          "Status request finished, but the refreshed order could not be loaded.",
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
        title="Order not found."
        message="The order identifier is not a valid UUID."
        action={
          <Link className="button button--primary" to="/admin/orders">
            Back to orders
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
        title="Order not found."
        message={orderState.message}
        action={
          <Link className="button button--primary" to="/admin/orders">
            Back to orders
          </Link>
        }
      />
    );
  }

  if (orderState.status === "error" || orderState.status === "network") {
    return (
      <AdminOrderDetailState
        title="Order unavailable."
        message={orderState.message}
        alert
        action={
          <div className="admin-orders-state__actions">
            <button type="button" className="button button--ghost" onClick={handleRetry}>
              Retry
            </button>
            <Link className="button button--primary" to="/admin/orders">
              Back to orders
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
          Back to orders
        </Link>
        <div className="admin-order-detail__heading">
          <div>
            <p className="admin-orders__kicker">Admin order</p>
            <h1 id="admin-order-detail-title">{getOrderReference(order)}</h1>
          </div>
          <button
            type="button"
            className="button button--ghost"
            onClick={handleRetry}
            disabled={orderState.status === "loading" || Boolean(mutatingStatus)}
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="admin-order-detail__layout">
        <div className="admin-order-detail__main">
          <section className="admin-order-section" aria-labelledby="admin-order-facts-title">
            <h2 id="admin-order-facts-title">Order details</h2>
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
