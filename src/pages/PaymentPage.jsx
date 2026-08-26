import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getOrderById } from "../api/orderApi";
import { createMockPayment } from "../api/paymentApi";
import {
  getPaymentErrorMessage,
  isUnconfirmedPaymentError,
} from "../utils/paymentErrorMessages";
import { formatCurrency } from "../utils/formatCurrency";
import "./PaymentPage.css";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PAYABLE_STATUS = "PENDING";

function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(4);
    globalThis.crypto.getRandomValues(values);
    return `payment-${Date.now()}-${Array.from(values).join("-")}`;
  }

  return `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getOrderItems(order) {
  return Array.isArray(order?.items) ? order.items : [];
}

function getOrderItemCount(order) {
  return getOrderItems(order).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
}

function getOrderStatusMessage(status) {
  switch (status) {
    case "CONFIRMED":
      return "This order is confirmed. Payment is no longer available.";
    case "CANCELLED":
      return "This order was cancelled and cannot be paid.";
    case "EXPIRED":
      return "This order expired and cannot be paid.";
    case "SHIPPING":
    case "COMPLETED":
      return "This order has moved past payment.";
    default:
      return "Only pending orders can be paid.";
  }
}

function PaymentState({ title, message, action }) {
  return (
    <section className="payment-state" aria-labelledby="payment-state-title">
      <p className="payment-state__kicker">Payment</p>
      <h1 id="payment-state-title">{title}</h1>
      <p>{message}</p>
      {action}
    </section>
  );
}

function OrderFacts({ order, payment }) {
  return (
    <dl className="payment-facts">
      <div>
        <dt>Order reference</dt>
        <dd>{order?.orderCode || order?.id || "Order"}</dd>
      </div>
      <div>
        <dt>Order status</dt>
        <dd>{order?.status || "Unavailable"}</dd>
      </div>
      <div>
        <dt>Payment method</dt>
        <dd>{payment?.method || "Mock payment"}</dd>
      </div>
      <div>
        <dt>Payment status</dt>
        <dd>{payment?.status || "Not submitted"}</dd>
      </div>
      {payment?.transactionCode ? (
        <div>
          <dt>Transaction code</dt>
          <dd>{payment.transactionCode}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function PaymentOrderSummary({ order }) {
  const items = getOrderItems(order);

  return (
    <section className="payment-summary" aria-labelledby="payment-summary-title">
      <h2 id="payment-summary-title">Order summary</h2>
      <div className="payment-summary__items">
        {items.map((item) => (
          <article className="payment-summary-item" key={item.productId || item.productName}>
            <div>
              <h3>{item.productName || "Product"}</h3>
              <p>Quantity {item.quantity}</p>
            </div>
            <p>{formatCurrency(item.subtotal)}</p>
          </article>
        ))}
      </div>
      <dl className="payment-summary__total">
        <div>
          <dt>Items</dt>
          <dd>{getOrderItemCount(order)}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>{formatCurrency(order?.totalAmount)}</dd>
        </div>
      </dl>
    </section>
  );
}

function PaymentResult({ payment, order, onRetryNewAttempt }) {
  if (!payment) {
    return null;
  }

  if (payment.status === "SUCCESS") {
    return (
      <section className="payment-result payment-result--success" aria-live="polite">
        <h2>Payment successful.</h2>
        <p>
          Your mock payment was accepted and the order is now {order?.status || "confirmed"}.
        </p>
      </section>
    );
  }

  if (payment.status === "FAILED") {
    return (
      <section className="payment-result payment-result--failed" role="alert">
        <h2>Payment unsuccessful.</h2>
        <p>{payment.failureReason || "The mock payment was declined."}</p>
        {order?.status === PAYABLE_STATUS ? (
          <button type="button" className="button button--primary" onClick={onRetryNewAttempt}>
            Try mock payment again
          </button>
        ) : null}
      </section>
    );
  }

  return null;
}

export default function PaymentPage() {
  const { orderId } = useParams();
  const [orderState, setOrderState] = useState({
    status: "loading",
    order: null,
    message: "",
  });
  const [paymentState, setPaymentState] = useState({
    status: "idle",
    payment: null,
    message: "",
    attempt: null,
  });
  const paymentRequestInFlightRef = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);
  const isValidOrderId = useMemo(
    () => UUID_PATTERN.test(orderId || ""),
    [orderId],
  );
  const order = orderState.order;
  const isPayable = order?.status === PAYABLE_STATUS;
  const isSubmitting = paymentState.status === "submitting";
  const canRetrySameAttempt =
    paymentState.status === "uncertain" &&
    paymentState.attempt &&
    order?.status === PAYABLE_STATUS;

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
        const nextOrder = await getOrderById(orderId, {
          signal: controller.signal,
        });

        setOrderState({
          status: "success",
          order: nextOrder,
          message: "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setOrderState({
          status: error.status === 404 || error.status === 400 ? "unavailable" : "error",
          order: null,
          message: getPaymentErrorMessage(
            error,
            "Order details could not be loaded right now.",
          ),
        });
      }
    }

    loadOrder();

    return () => {
      controller.abort();
    };
  }, [isValidOrderId, orderId, reloadKey]);

  async function refreshOrderAfterPayment() {
    const nextOrder = await getOrderById(orderId);

    setOrderState({
      status: "success",
      order: nextOrder,
      message: "",
    });

    return nextOrder;
  }

  async function submitMockPayment(success, options = {}) {
    if (!order?.id || isSubmitting || paymentRequestInFlightRef.current) {
      return;
    }

    paymentRequestInFlightRef.current = true;

    const attempt = options.reuseAttempt && paymentState.attempt
      ? paymentState.attempt
      : {
          idempotencyKey: createIdempotencyKey(),
          success,
        };

    setPaymentState({
      status: "submitting",
      payment: null,
      message: "",
      attempt,
    });

    try {
      const payment = await createMockPayment(
        {
          orderId: order.id,
          success: attempt.success,
        },
        attempt.idempotencyKey,
      );
      const refreshedOrder = await refreshOrderAfterPayment();
      const nextStatus = payment.status === "SUCCESS" ? "success" : "failed";

      setPaymentState({
        status: nextStatus,
        payment,
        message: "",
        attempt,
      });

      if (payment.status === "SUCCESS" && refreshedOrder.status !== "CONFIRMED") {
        setPaymentState({
          status: "uncertain",
          payment,
          message: "Payment succeeded, but order status could not be confirmed.",
          attempt,
        });
      }
    } catch (error) {
      let refreshedOrder = null;

      try {
        refreshedOrder = await refreshOrderAfterPayment();
      } catch {
        // Preserve the payment error below. The user can reload order state manually.
      }

      if (isUnconfirmedPaymentError(error)) {
        const message = refreshedOrder?.status === "CONFIRMED"
          ? "Order is confirmed, but the payment response was not received."
          : "We could not confirm the payment result. Check the order status or retry the same payment attempt.";

        setPaymentState({
          status: "uncertain",
          payment: null,
          message,
          attempt,
        });
        return;
      }

      setPaymentState({
        status: "error",
        payment: null,
        message: getPaymentErrorMessage(
          error,
          "Payment could not be processed right now.",
        ),
        attempt,
      });
    } finally {
      paymentRequestInFlightRef.current = false;
    }
  }

  function handleReloadOrder() {
    setReloadKey((key) => key + 1);
  }

  if (!isValidOrderId) {
    return (
      <PaymentState
        title="Payment unavailable."
        message="This order is unavailable or the link is no longer valid."
        action={
          <Link className="button button--primary" to="/products">
            Continue shopping
          </Link>
        }
      />
    );
  }

  if (orderState.status === "loading") {
    return (
      <PaymentState
        title="Loading payment."
        message="Order details are being loaded."
      />
    );
  }

  if (orderState.status === "unavailable") {
    return (
      <PaymentState
        title="Payment unavailable."
        message={orderState.message}
        action={
          <Link className="button button--primary" to="/products">
            Continue shopping
          </Link>
        }
      />
    );
  }

  if (orderState.status === "error") {
    return (
      <PaymentState
        title="Payment could not be loaded."
        message={orderState.message}
        action={
          <div className="payment-state__actions">
            <button type="button" className="button button--ghost" onClick={handleReloadOrder}>
              Retry
            </button>
            <Link className="button button--primary" to="/products">
              Continue shopping
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <section className="payment-page" aria-labelledby="payment-title">
      <div className="payment-page__header">
        <p className="payment-page__kicker">Payment</p>
        <h1 id="payment-title">Payment</h1>
        <p>
          {isPayable
            ? "Complete the mock payment for this pending order."
            : "Review the current payment state for this order."}
        </p>
      </div>

      <div className="payment-layout">
        <div className="payment-panel">
          <section className="payment-section" aria-labelledby="payment-order-title">
            <h2 id="payment-order-title">Order</h2>
            <OrderFacts order={order} payment={paymentState.payment} />
          </section>

          <section className="payment-section" aria-labelledby="payment-action-title">
            <h2 id="payment-action-title">Mock payment</h2>
            {isPayable ? (
              <>
                <p>
                  This uses the backend mock payment method. No card, bank, or gateway details are collected.
                </p>
                <div className="payment-actions" aria-live="polite">
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => submitMockPayment(true)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Processing..." : "Pay order"}
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => submitMockPayment(false)}
                    disabled={isSubmitting}
                  >
                    Simulate failed payment
                  </button>
                </div>
              </>
            ) : (
              <p className="payment-inline-state">
                {getOrderStatusMessage(order.status)}
              </p>
            )}

            {paymentState.status === "error" ? (
              <p className="payment-error" role="alert">
                {paymentState.message}
              </p>
            ) : null}

            {paymentState.status === "uncertain" ? (
              <div className="payment-uncertain" role="alert">
                <p>{paymentState.message}</p>
                <div>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={handleReloadOrder}
                    disabled={isSubmitting}
                  >
                    Check order status
                  </button>
                  {canRetrySameAttempt ? (
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={() => submitMockPayment(paymentState.attempt.success, {
                        reuseAttempt: true,
                      })}
                      disabled={isSubmitting}
                    >
                      Retry same attempt
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <PaymentResult
              payment={paymentState.payment}
              order={order}
              onRetryNewAttempt={() => submitMockPayment(true)}
            />
          </section>
        </div>

        <PaymentOrderSummary order={order} />
      </div>
    </section>
  );
}
