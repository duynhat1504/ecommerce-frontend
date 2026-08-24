export function formatCurrency(price) {
  const value = Number(price);

  if (!Number.isFinite(value)) {
    return "";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
