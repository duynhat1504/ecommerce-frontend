import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

import useAuth from "../auth/useAuth";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/products", label: "Shop" },
  { to: "/account", label: "Account" },
];

export default function StorefrontLayout() {
  const { isAdmin, isAuthenticated, logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

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

          <button
            className="site-nav__menu-button"
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            Menu
          </button>

          <div
            className={
              isMenuOpen ? "site-nav__links is-open" : "site-nav__links"
            }
            id="primary-navigation"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={closeMenu}
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
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? "site-nav__link is-active" : "site-nav__link"
                }
              >
                Admin
              </NavLink>
            ) : null}
            <div className="site-nav__mobile-actions">
              {isAuthenticated ? (
                <>
                  <span className="site-nav__mobile-user">
                    {user?.fullName || "Account"}
                  </span>
                  <button
                    className="site-nav__mobile-action"
                    type="button"
                    onClick={() => {
                      closeMenu();
                      logout();
                    }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  className="site-nav__mobile-action"
                  to="/login"
                  onClick={closeMenu}
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>

          <div className="site-nav__actions">
            {isAuthenticated ? (
              <>
                <span className="site-nav__user">{user?.fullName}</span>
                <button
                  className="button button--ghost"
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link className="button button--primary" to="/login" onClick={closeMenu}>
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
        <div className="site-footer__brand">
          <p>CHẬM</p>
          <p>Coffee tools for slower mornings.</p>
        </div>
        <nav className="site-footer__links" aria-label="Footer navigation">
          <Link to="/products">Shop</Link>
          <Link to="/account">Account</Link>
        </nav>
      </footer>
    </div>
  );
}
