import { NavLink } from "react-router-dom";

import "./AccountNavigation.css";

const accountRoutes = [
  { to: "/account/profile", label: "Profile" },
  { to: "/account/orders", label: "Orders" },
];

export default function AccountNavigation() {
  return (
    <nav className="account-navigation" aria-label="Account navigation">
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
