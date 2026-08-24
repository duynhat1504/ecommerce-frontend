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
        <h1>Completing sign in</h1>
        <p>Checking your session with the storefront.</p>
      </section>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <section className="oauth-callback" role="alert">
      <p className="auth-page__brand">CHẬM Account</p>
      <h1>Google sign in failed</h1>
      <p>Unable to complete Google sign in. Please try again.</p>
      <Link className="button button--primary" to="/login">
        Back to sign in
      </Link>
    </section>
  );
}
