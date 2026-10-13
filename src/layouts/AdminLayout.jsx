import { Link, NavLink, Outlet } from "react-router-dom";

import useAuth from "../auth/useAuth";
import "./AdminLayout.css";

const adminNavItems = [
  {
    to: "/admin",
    label: "Tổng quan",
    end: true,
  },
  {
    to: "/admin/products",
    label: "Sản phẩm",
  },
  {
    to: "/admin/categories",
    label: "Danh mục",
  },
  {
    to: "/admin/inventory",
    label: "Kho hàng",
  },
  {
    to: "/admin/orders",
    label: "Đơn hàng",
  },
  {
    to: "/admin/users",
    label: "Người dùng",
  },
];

export default function AdminLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="admin-shell">
      <a className="admin-shell__skip" href="#admin-content">
        Chuyển đến nội dung quản trị
      </a>

      <aside className="admin-shell__sidebar" aria-label="Quản trị">
        <header className="admin-shell__brand">
          <Link to="/admin" aria-label="Tổng quan quản trị CHẬM">
            CHẬM 
          </Link>
          <span>Quản trị cửa hàng</span>
        </header>

        <nav className="admin-shell__nav" aria-label="Điều hướng quản trị">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive
                  ? "admin-shell__nav-link is-active"
                  : "admin-shell__nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-shell__account">
          <div className="admin-shell__user">
            <span>{user?.fullName || user?.email || "Quản trị viên"}</span>
            <small>{user?.role || "ADMIN"}</small>
          </div>
          <div className="admin-shell__actions">
            <Link className="admin-shell__text-link" to="/">
              Cửa hàng
            </Link>
            <button
              className="admin-shell__text-button"
              type="button"
              onClick={logout}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-shell__main" id="admin-content" tabIndex="-1">
        <Outlet />
      </main>
    </div>
  );
}
