import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

import useAuth from "../auth/useAuth";
import useCart from "../cart/useCart";

const navItems = [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/products", label: "Sản phẩm" },
  { to: "/cart", label: "Giỏ hàng" },
  { to: "/account/profile", label: "Tài khoản" },
];

export default function StorefrontLayout() {
  const { isAdmin, isAuthenticated, logout, user } = useAuth();
  const { itemCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cartLabel = isAuthenticated && itemCount > 0 ? `Giỏ hàng ${itemCount}` : "Giỏ hàng";

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
        <nav className="site-nav" aria-label="Điều hướng chính">
          <Link className="site-brand" to="/" aria-label="Trang chủ CHẬM">
            <span className="site-brand__mark">CHẬM</span>
            <span className="site-brand__line">
              Dụng cụ cà phê cho những buổi sáng chậm rãi.
            </span>
          </Link>

          <button
            className="site-nav__menu-button"
            type="button"
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            Trình đơn
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
                {item.to === "/cart" ? cartLabel : item.label}
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
                Quản trị
              </NavLink>
            ) : null}
            <div className="site-nav__mobile-actions">
              {isAuthenticated ? (
                <>
                  <span className="site-nav__mobile-user">
                    {user?.fullName || "Tài khoản"}
                  </span>
                  <button
                    className="site-nav__mobile-action"
                    type="button"
                    onClick={() => {
                      closeMenu();
                      logout();
                    }}
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <Link
                  className="site-nav__mobile-action"
                  to="/login"
                  onClick={closeMenu}
                >
                  Đăng nhập
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
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link className="button button--primary" to="/login" onClick={closeMenu}>
                Đăng nhập
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
          <p>Dụng cụ cà phê cho những buổi sáng chậm rãi.</p>
        </div>
        <nav className="site-footer__links" aria-label="Điều hướng chân trang">
          <Link to="/products">Sản phẩm</Link>
          <Link to="/cart">Giỏ hàng</Link>
          <Link to="/account/profile">Tài khoản</Link>
        </nav>
      </footer>
    </div>
  );
}
