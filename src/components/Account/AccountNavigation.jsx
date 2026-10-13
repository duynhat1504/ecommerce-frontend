import { NavLink } from "react-router-dom";

import "./AccountNavigation.css";

const accountRoutes = [
  { to: "/account/profile", label: "Hồ sơ" },
  { to: "/account/orders", label: "Đơn hàng" },
  { to: "/account/addresses", label: "Địa chỉ" },
];

export default function AccountNavigation() {
  return (
    <nav className="account-navigation" aria-label="Điều hướng tài khoản">
      {accountRoutes.map((route) => (
        <NavLink
          key={route.to}
          to={route.to}
          className={({ isActive }) =>
            isActive
              ? "account-navigation__link is-active"
              : "account-navigation__link"
          }
        >
          {route.label}
        </NavLink>
      ))}
    </nav>
  );
}
