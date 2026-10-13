const DOMAIN_ERROR_MESSAGES = new Map([
  ["Requested quantity exceeds available stock", "Số lượng yêu cầu vượt quá tồn kho hiện có."],
  ["Product is out of stock", "Sản phẩm này đã hết hàng."],
  ["Product is not active", "Sản phẩm này hiện không khả dụng."],
  ["Product category is not available", "Sản phẩm này hiện không khả dụng."],
  ["Product not found", "Sản phẩm này không còn khả dụng."],
  ["Cart not found", "Không tìm thấy giỏ hàng. Hãy tải lại và thử lại."],
  ["Cart item not found", "Sản phẩm này không còn trong giỏ hàng của bạn."],
  ["Validation failed", "Kiểm tra số lượng rồi thử lại."],
]);

export function getCartErrorMessage(error, fallback) {
  if (error?.name === "AbortError") {
    return "";
  }

  if (error?.status === 401 || error?.status === 403) {
    return "Hãy đăng nhập lại để tiếp tục sử dụng giỏ hàng.";
  }

  if (DOMAIN_ERROR_MESSAGES.has(error?.message)) {
    return DOMAIN_ERROR_MESSAGES.get(error.message);
  }

  if (error?.status >= 500) {
    return "Dịch vụ giỏ hàng hiện không khả dụng. Vui lòng thử lại.";
  }

  return fallback;
}
