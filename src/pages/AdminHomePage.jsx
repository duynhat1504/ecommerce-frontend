import useAuth from "../auth/useAuth";
import "./AdminHomePage.css";

const backendSurfaces = [
  {
    area: "Sản phẩm",
    contract:
      "GET /api/admin/products, GET /api/admin/products/{id}, DELETE /api/admin/products/{id}",
  },
  {
    area: "Danh mục",
    contract:
      "GET /api/admin/categories, GET /api/admin/categories/{id}, DELETE /api/admin/categories/{id}",
  },
  {
    area: "Đơn hàng",
    contract:
      "GET /api/admin/orders, GET /api/admin/orders/{id}, PUT /api/admin/orders/{id}/status",
  },
  {
    area: "Kho hàng",
    contract: "GET /api/admin/inventory/products/{productId}/transactions",
  },
];

const foundationChecks = [
  ["Nguồn phiên", "AuthContext hiện có"],
  ["Bảo vệ route", "AdminRoute hiện có"],
  ["Vai trò yêu cầu", "Quản trị viên"],
  ["Điều hướng quản trị", "Chỉ tổng quan"],
  ["Endpoint bảng điều khiển", "Không tìm thấy"],
];

export default function AdminHomePage() {
  const { user } = useAuth();

  return (
    <section className="admin-home" aria-labelledby="admin-home-title">
      <header className="admin-home__header">
        <div>
          <p className="admin-home__kicker">Quản trị</p>
          <h1 id="admin-home-title">Tổng quan vận hành</h1>
        </div>
        <dl className="admin-home__identity" aria-label="Quản trị viên đã đăng nhập">
          <div>
            <dt>Đã đăng nhập</dt>
            <dd>{user?.email || "Quản trị viên đã xác thực"}</dd>
          </div>
          <div>
            <dt>Vai trò</dt>
            <dd>{user?.role === "ADMIN" ? "Quản trị viên" : "Người dùng"}</dd>
          </div>
        </dl>
      </header>

      <div className="admin-home__grid">
        <section
          className="admin-home__section"
          aria-labelledby="admin-status-title"
        >
          <div className="admin-home__section-header">
            <h2 id="admin-status-title">Trạng thái nền tảng</h2>
            <p>Khung giao diện và phân quyền truy cập hiện tại.</p>
          </div>
          <dl className="admin-home__check-list">
            {foundationChecks.map(([label, value]) => (
              <div className="admin-home__check" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="admin-home__section"
          aria-labelledby="admin-contracts-title"
        >
          <div className="admin-home__section-header">
            <h2 id="admin-contracts-title">Các bề mặt backend đã xác nhận</h2>
            <p>
              Đây chỉ là các contract backend. Các đường dẫn API được giữ nguyên.
            </p>
          </div>
          <table className="admin-home__surface-table">
            <caption className="sr-only">Các bề mặt backend quản trị</caption>
            <thead>
              <tr>
                <th scope="col">Khu vực</th>
                <th scope="col">Contract</th>
              </tr>
            </thead>
            <tbody>
              {backendSurfaces.map((surface) => (
                <tr key={surface.area}>
                  <th scope="row">{surface.area}</th>
                  <td>
                    <code>{surface.contract}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
}
