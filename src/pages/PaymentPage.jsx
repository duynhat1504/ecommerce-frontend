import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getOrderById } from "../api/orderApi";
import {createMockPayment, createVnPayPayment,} from "../api/paymentApi";
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
      return "Đơn hàng này đã được xác nhận. Không thể thanh toán thêm.";
    case "CANCELLED":
      return "Đơn hàng này đã bị hủy và không thể thanh toán.";
    case "EXPIRED":
      return "Đơn hàng này đã hết hạn và không thể thanh toán.";
    case "SHIPPING":
    case "COMPLETED":
      return "Đơn hàng này đã qua bước thanh toán.";
    default:
      return "Chỉ có thể thanh toán đơn hàng đang chờ xác nhận.";
  }
}

function getOrderStatusLabel(status) {
  const labels = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    SHIPPING: "Đang giao",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    EXPIRED: "Hết hạn",
  };

  return labels[status] || "Không xác định";
}

function PaymentState({ title, message, action }) {
  return (
    <section className="payment-state" aria-labelledby="payment-state-title">
      <p className="payment-state__kicker">Thanh toán</p>
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
        <dt>Mã đơn hàng</dt>
        <dd>{order?.orderCode || order?.id || "Đơn hàng"}</dd>
      </div>
      <div>
        <dt>Trạng thái đơn hàng</dt>
        <dd>{getOrderStatusLabel(order?.status)}</dd>
      </div>
      <div>
        <dt>Phương thức thanh toán</dt>
        <dd>{payment?.method || "Thanh toán mô phỏng"}</dd>
      </div>
      <div>
        <dt>Trạng thái thanh toán</dt>
        <dd>{payment?.status || "Chưa thực hiện"}</dd>
      </div>
      {payment?.transactionCode ? (
        <div>
          <dt>Mã giao dịch</dt>
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
      <h2 id="payment-summary-title">Tóm tắt đơn hàng</h2>
      <div className="payment-summary__items">
        {items.map((item) => (
          <article className="payment-summary-item" key={item.productId || item.productName}>
            <div>
              <h3>{item.productName || "Sản phẩm"}</h3>
              <p>Số lượng: {item.quantity}</p>
            </div>
            <p>{formatCurrency(item.subtotal)}</p>
          </article>
        ))}
      </div>
      <dl className="payment-summary__total">
        <div>
          <dt>Sản phẩm</dt>
          <dd>{getOrderItemCount(order)}</dd>
        </div>
        <div>
          <dt>Thành tiền</dt>
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
        <h2>Thanh toán thành công.</h2>
        <p>
          Thanh toán mô phỏng đã được chấp nhận và đơn hàng hiện đã được xác nhận.
        </p>
      </section>
    );
  }

  if (payment.status === "FAILED") {
    return (
      <section className="payment-result payment-result--failed" role="alert">
        <h2>Thanh toán không thành công.</h2>
        <p>{payment.failureReason || "Thanh toán mô phỏng đã bị từ chối."}</p>
        {order?.status === PAYABLE_STATUS ? (
          <button type="button" className="button button--primary" onClick={onRetryNewAttempt}>
            Thử thanh toán mô phỏng lại
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
            "Không thể tải chi tiết đơn hàng vào lúc này.",
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
          message: "Thanh toán thành công, nhưng chưa thể xác nhận trạng thái đơn hàng.",
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
          ? "Đơn hàng đã được xác nhận, nhưng chưa nhận được phản hồi thanh toán."
          : "Không thể xác nhận kết quả thanh toán. Hãy kiểm tra trạng thái đơn hàng hoặc thử lại cùng lần thanh toán.";

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
          "Không thể xử lý thanh toán vào lúc này.",
        ),
        attempt,
      });
    } finally {
      paymentRequestInFlightRef.current = false;
    }
  }

  async function submitVnPayPayment() {
  if (!order?.id || isSubmitting || paymentRequestInFlightRef.current) {
    return;
  }

  paymentRequestInFlightRef.current = true;

  const idempotencyKey = createIdempotencyKey();

  setPaymentState({
    status: "submitting",
    payment: null,
    message: "",
    attempt: {
      idempotencyKey,
      method: "VNPAY",
    },
  });

  try {
    const payment = await createVnPayPayment(
      {
        orderId: order.id,
      },
      idempotencyKey,
    );

    if (!payment?.paymentUrl) {
      throw new Error("VNPay payment URL is missing");
    }

    window.location.assign(payment.paymentUrl);
  } catch (error) {
    setPaymentState({
      status: "error",
      payment: null,
      message: getPaymentErrorMessage(
        error,
        "Không thể khởi tạo thanh toán VNPay.",
      ),
      attempt: null,
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
        title="Không thể thanh toán."
        message="Đơn hàng này không khả dụng hoặc liên kết không còn hợp lệ."
        action={
          <Link className="button button--primary" to="/products">
            Tiếp tục mua sắm
          </Link>
        }
      />
    );
  }

  if (orderState.status === "loading") {
    return (
      <PaymentState
        title="Đang tải thanh toán."
        message="Đang tải thông tin đơn hàng."
      />
    );
  }

  if (orderState.status === "unavailable") {
    return (
      <PaymentState
        title="Không thể thanh toán."
        message={orderState.message}
        action={
          <Link className="button button--primary" to="/products">
            Tiếp tục mua sắm
          </Link>
        }
      />
    );
  }

  if (orderState.status === "error") {
    return (
      <PaymentState
        title="Không thể tải thanh toán."
        message={orderState.message}
        action={
          <div className="payment-state__actions">
            <button type="button" className="button button--ghost" onClick={handleReloadOrder}>
              Thử lại
            </button>
            <Link className="button button--primary" to="/products">
              Tiếp tục mua sắm
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <section className="payment-page" aria-labelledby="payment-title">
      <div className="payment-page__header">
        <p className="payment-page__kicker">Thanh toán</p>
        <h1 id="payment-title">Thanh toán</h1>
        <p>
          {isPayable
            ? "Hoàn tất thanh toán mô phỏng cho đơn hàng đang chờ xác nhận này."
            : "Xem trạng thái thanh toán hiện tại của đơn hàng này."}
        </p>
      </div>

      <div className="payment-layout">
        <div className="payment-panel">
          <section className="payment-section" aria-labelledby="payment-order-title">
            <h2 id="payment-order-title">Đơn hàng</h2>
            <OrderFacts order={order} payment={paymentState.payment} />
          </section>

          <section className="payment-section" aria-labelledby="payment-action-title">
            <h2 id="payment-action-title">Phương thức thanh toán</h2>
            {isPayable ? (
              <>
                <p>
                   Thanh toán an toàn qua VNPay hoặc sử dụng chế độ mô phỏng để kiểm thử.
                </p>
                <div className="payment-actions" aria-live="polite">
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={submitVnPayPayment}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Đang chuyển đến VNPay..." : "Thanh toán qua VNPay"}
                  </button>

                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => submitMockPayment(true)}
                    disabled={isSubmitting}
                  >
                    Thanh toán mô phỏng thành công
                  </button>

                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => submitMockPayment(false)}
                    disabled={isSubmitting}
                  >
                    Mô phỏng thanh toán thất bại
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
                    Kiểm tra trạng thái đơn hàng
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
                    Thử lại cùng lần thanh toán
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
