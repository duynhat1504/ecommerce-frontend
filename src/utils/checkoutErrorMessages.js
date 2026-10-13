const CHECKOUT_ERROR_MESSAGES = [
  {
    test: (message) => message === "Cart is empty",
    message: "Giỏ hàng của bạn đang trống. Hãy thêm sản phẩm trước khi đặt hàng.",
  },
  {
    test: (message) => message === "Shipping address not found",
    message: "Hãy chọn địa chỉ giao hàng khác hoặc thêm địa chỉ mới.",
  },
  {
    test: (message) => message.includes("Insufficient stock"),
    message: "Một số sản phẩm không còn đủ tồn kho. Hãy kiểm tra giỏ hàng và thử lại.",
  },
  {
    test: (message) => message.includes("Product is not available"),
    message: "Một số sản phẩm không còn khả dụng. Hãy kiểm tra giỏ hàng trước khi đặt hàng.",
  },
  {
    test: (message) => message.includes("Product category is not available"),
    message: "Một số sản phẩm không còn khả dụng. Hãy kiểm tra giỏ hàng trước khi đặt hàng.",
  },
  {
    test: (message) => message.includes("One or more products"),
    message: "Một số sản phẩm trong giỏ hàng đã thay đổi. Hãy kiểm tra lại trước khi đặt hàng.",
  },
  {
    test: (message) => message === "Validation failed",
    message: "Kiểm tra các trường bắt buộc rồi thử lại.",
  },
];

export function getCheckoutErrorMessage(error, fallback) {
  if (error?.name === "AbortError") {
    return "";
  }

  if (error?.status === 401 || error?.status === 403) {
    return "Hãy đăng nhập lại để tiếp tục thanh toán.";
  }

  const backendMessage = error?.message || "";
  const matchedMessage = CHECKOUT_ERROR_MESSAGES.find(({ test }) =>
    test(backendMessage),
  );

  if (matchedMessage) {
    return matchedMessage.message;
  }

  if (error?.status >= 500) {
    return "Chức năng thanh toán hiện không khả dụng. Vui lòng thử lại sau.";
  }

  return fallback;
}
