import { Link, Navigate, useSearchParams } from "react-router-dom";

import useAuth from "../auth/useAuth";
import { getSafeRedirect } from "../utils/authFormUtils";
import "./AuthPages.css";

export default function OAuthCallbackPage() {
  const { isAuthenticated, status } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get("redirect"));

  if (status === "loading") {
    return (
      <section className="oauth-callback" aria-live="polite">
        <p className="auth-page__brand">CHẬM Account</p>
        <h1>Đang hoàn tất đăng nhập</h1>
        <p>Đang kiểm tra phiên đăng nhập của bạn.</p>
      </section>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <section className="oauth-callback" role="alert">
      <p className="auth-page__brand">CHẬM Account</p>
      <h1>Đăng nhập Google không thành công</h1>
      <p>Không thể hoàn tất đăng nhập bằng Google. Vui lòng thử lại.</p>
      <Link className="button button--primary" to="/login">
        Quay lại đăng nhập
      </Link>
    </section>
  );
}
