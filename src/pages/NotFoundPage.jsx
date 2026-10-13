import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <p className="not-found__code">404</p>
      <h1 id="not-found-title">Không tìm thấy trang</h1>
      <p>Trang bạn đang tìm kiếm không thuộc cửa hàng này.</p>
      <Link className="button button--primary" to="/">
        Về trang chủ
      </Link>
    </section>
  );
}
