const PAYMENT_ERROR_MESSAGES = [
  {
    test: (message) => message === "Order not found",
    message: "Đơn hàng này không khả dụng hoặc không thể thanh toán từ tài khoản này.",
  },
  {
    test: (message) => message === "Order has already been paid",
    message: "Đơn hàng này đã được thanh toán.",
  },
  {
    test: (message) => message === "Cancelled order cannot be paid",
    message: "Không thể thanh toán đơn hàng đã hủy.",
  },
  {
    test: (message) => message === "Only pending orders can be paid",
    message: "Chỉ có thể thanh toán đơn hàng đang chờ xác nhận.",
  },
  {
    test: (message) => message === "Idempotency-Key has already been used for another order",
    message: "Lần thử thanh toán này không thể dùng lại cho đơn hàng khác.",
  },
  {
    test: (message) => message === "Validation failed",
    message: "Yêu cầu thanh toán chưa đầy đủ.",
  },
];

export function getPaymentErrorMessage(error, fallback) {
  if (error?.name === "AbortError") {
    return "";
  }

  if (error?.status === 401 || error?.status === 403) {
    return "Hãy đăng nhập lại để tiếp tục thanh toán.";
  }

  const backendMessage = error?.message || "";
  const matchedMessage = PAYMENT_ERROR_MESSAGES.find(({ test }) =>
    test(backendMessage),
  );

  if (matchedMessage) {
    return matchedMessage.message;
  }

  if (error?.status >= 500) {
    return "Dịch vụ thanh toán hiện không khả dụng.";
  }

  return fallback;
}

export function isUnconfirmedPaymentError(error) {
  return !error?.status && error?.name !== "AbortError";
}
