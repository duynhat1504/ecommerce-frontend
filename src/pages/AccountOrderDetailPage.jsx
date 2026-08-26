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
    return "Unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getOrderReference(order) {
  return order?.orderCode || order?.id || "Order";
}

function getDetailErrorState(error) {
  if (error?.status === 404 || error?.status === 400) {
    return {
      status: "unavailable",
      message: "This order is unavailable or the link is no longer valid.",
    };
  }

  if (error?.status === 401 || error?.status === 403) {
    return {
      status: "error",
      message: "Sign in again to view this order.",
    };
  }

  if (error?.status >= 500) {
    return {
      status: "error",
      message: "Order details are unavailable right now. Please try again later.",
    };
  }

  return {
    status: "error",
    message: "Order details could not be loaded right now.",
  };
}

function AccountOrderDetailState({ title, message, action, alert = false }) {
  return (
    <section
      className="account-orders-state"
      aria-labelledby="account-order-detail-state-title"
      role={alert ? "alert" : undefined}
    >
      <p className="account-orders-state__kicker">Account</p>
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
        <dt>Reference</dt>
        <dd>{getOrderReference(order)}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>{order?.status || "Unavailable"}</dd>
      </div>
      <div>
        <dt>Placed</dt>
        <dd>{formatOrderDateTime(order?.createdAt)}</dd>
      </div>
      <div>
        <dt>Updated</dt>
        <dd>{formatOrderDateTime(order?.updatedAt)}</dd>
      </div>
    </dl>
  );
}

function OrderItems({ order }) {
  const items = getOrderItems(order);

  return (
    <section className="account-order-section" aria-labelledby="account-order-items-title">
      <h2 id="account-order-items-title">Items</h2>
      <div className="account-order-items">
        <div className="account-order-item account-order-item--head" aria-hidden="true">
          <span>Product</span>
          <span>Unit price</span>
          <span>Quantity</span>
          <span>Subtotal</span>
        </div>
        {items.map((item, index) => (
          <article
            className="account-order-item"
            key={`${item.productId || item.productName || "item"}-${index}`}
          >
            <div className="account-order-item__product">
              <span>Product</span>
              <strong>{item.productName || "Product"}</strong>
            </div>
            <div>
              <span>Unit price</span>
              <strong>{formatCurrency(item.unitPrice) || "Unavailable"}</strong>
            </div>
            <div>
              <span>Quantity</span>
              <strong>{Number(item.quantity) || 0}</strong>
            </div>
            <div className="account-order-item__subtotal">
              <span>Subtotal</span>
              <strong>{formatCurrency(item.subtotal) || "Unavailable"}</strong>
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
      <h2 id="account-order-shipping-title">Shipping snapshot</h2>
      <dl className="account-order-facts">
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

function OrderTotal({ order }) {
  return (
    <aside className="account-order-total" aria-labelledby="account-order-total-title">
      <h2 id="account-order-total-title">Total</h2>
      <dl>
        <div>
          <dt>Items</dt>
          <dd>{getOrderItemCount(order)}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>{formatCurrency(order?.totalAmount) || "Unavailable"}</dd>
        </div>
      </dl>
      {order?.status === PAYABLE_STATUS ? (
        <Link className="button button--primary account-order-total__payment" to={`/payment/${order.id}`}>
          Continue to payment
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
        title="Order unavailable."
        message="This order is unavailable or the link is no longer valid."
        action={
          <Link className="button button--primary" to="/account/orders">
            Back to orders
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
        title="Order unavailable."
        message={orderState.message}
        action={
          <Link className="button button--primary" to="/account/orders">
            Back to orders
          </Link>
        }
      />
    );
  }

  if (orderState.status === "error") {
    return (
      <AccountOrderDetailState
        title="Order details unavailable."
        message={orderState.message}
        alert
        action={
          <div className="account-orders-state__actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setRetryKey((key) => key + 1)}
            >
              Retry
            </button>
            <Link className="button button--primary" to="/account/orders">
              Back to orders
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
          Back to orders
        </Link>
        <p className="account-order-detail__kicker">Order</p>
        <h1 id="account-order-detail-title">{getOrderReference(order)}</h1>
        <p>Historical order details from checkout.</p>
        <AccountNavigation />
      </div>

      <div className="account-order-detail__layout">
        <div className="account-order-detail__main">
          <section className="account-order-section" aria-labelledby="account-order-meta-title">
            <h2 id="account-order-meta-title">Order details</h2>
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
