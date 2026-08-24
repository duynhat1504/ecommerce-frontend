import { Link, NavLink, Outlet } from "react-router-dom";

import useAuth from "../auth/useAuth";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/products", label: "Shop" },
  { to: "/account", label: "Account" },
];

export default function StorefrontLayout() {
  const { isAdmin, isAuthenticated, logout, user } = useAuth();

  return (
    <div className="app-shell">
      <header className="site-header">
        <nav className="site-nav" aria-label="Primary navigation">
          <Link className="site-brand" to="/" aria-label="CHẬM home">
            <span className="site-brand__mark">CHẬM</span>
            <span className="site-brand__line">
              Coffee tools for slower mornings.
            </span>
          </Link>

          <div className="site-nav__links">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? "site-nav__link is-active" : "site-nav__link"
                }
              >
                {item.label}
              </NavLink>
            ))}
            {isAdmin ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  isActive ? "site-nav__link is-active" : "site-nav__link"
                }
              >
                Admin
              </NavLink>
            ) : null}
          </div>

          <div className="site-nav__actions">
            {isAuthenticated ? (
              <>
                <span className="site-nav__user">{user?.fullName}</span>
                <button className="button button--ghost" onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <Link className="button button--primary" to="/login">
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>CHẬM</p>
        <p>Coffee tools for slower mornings.</p>
      </footer>
    </div>
  );
}
