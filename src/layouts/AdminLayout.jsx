import { Link, NavLink, Outlet } from "react-router-dom";

import useAuth from "../auth/useAuth";
import "./AdminLayout.css";

const adminNavItems = [
  {
    to: "/admin",
    label: "Overview",
    end: true,
  },
  {
    to: "/admin/products",
    label: "Products",
  },
  {
    to: "/admin/categories",
    label: "Categories",
  },
  {
    to: "/admin/inventory",
    label: "Inventory",
  },
];

export default function AdminLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="admin-shell">
      <a className="admin-shell__skip" href="#admin-content">
        Skip to admin content
      </a>

      <aside className="admin-shell__sidebar" aria-label="Admin">
        <header className="admin-shell__brand">
          <Link to="/admin" aria-label="CHẬM admin overview">
            CHẬM Admin
          </Link>
          <span>Store operations</span>
        </header>

        <nav className="admin-shell__nav" aria-label="Admin navigation">
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
            <span>{user?.fullName || user?.email || "Admin"}</span>
            <small>{user?.role || "ADMIN"}</small>
          </div>
          <div className="admin-shell__actions">
            <Link className="admin-shell__text-link" to="/">
              Storefront
            </Link>
            <button
              className="admin-shell__text-button"
              type="button"
              onClick={logout}
            >
              Sign out
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
