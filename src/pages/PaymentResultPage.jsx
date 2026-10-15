import { Link, useSearchParams } from "react-router-dom";

import "./PaymentResultPage.css";

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get("orderId");
  const status = searchParams.get("status");

  const isSuccess = status === "SUCCESS";
  const isFailed = status === "FAILED";

  if (!orderId || (!isSuccess && !isFailed)) {
    return (
      <section className="payment-result-page">
        <p className="payment-result-page__kicker">Thanh toán</p>
        <h1>Không thể xác định kết quả thanh toán.</h1>
        <p>
          Liên kết thanh toán không hợp lệ hoặc thiếu thông tin cần thiết.
        </p>

        <div className="payment-result-page__actions">
          <Link className="button button--primary" to="/account/orders">
            Xem đơn hàng
          </Link>

          <Link className="button button--ghost" to="/products">
            Tiếp tục mua sắm
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`payment-result-page ${
        isSuccess
          ? "payment-result-page--success"
          : "payment-result-page--failed"
      }`}
    >
      <p className="payment-result-page__kicker">
        {isSuccess ? "Thanh toán hoàn tất" : "Thanh toán chưa hoàn tất"}
      </p>

      <h1>
        {isSuccess
          ? "Thanh toán thành công."
          : "Thanh toán không thành công."}
      </h1>

      <p>
        {isSuccess
          ? "VNPay đã xác nhận giao dịch. Đơn hàng của bạn đã được cập nhật."
          : "Giao dịch VNPay chưa thành công. Bạn có thể kiểm tra đơn hàng và thử lại nếu đơn vẫn còn khả dụng."}
      </p>

      <dl className="payment-result-page__facts">
        <div>
          <dt>Mã đơn hàng</dt>
          <dd>{orderId}</dd>
        </div>

        <div>
          <dt>Trạng thái thanh toán</dt>
          <dd>{isSuccess ? "Thành công" : "Không thành công"}</dd>
        </div>
      </dl>

      <div className="payment-result-page__actions">
        <Link
          className="button button--primary"
          to={`/account/orders/${orderId}`}
        >
          Xem đơn hàng
        </Link>

        <Link className="button button--ghost" to="/products">
          Tiếp tục mua sắm
        </Link>
      </div>
    </section>
  );
}