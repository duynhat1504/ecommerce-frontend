import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { getGoogleOAuthUrl } from "../api/authApi";
import AuthField from "../components/Auth/AuthField";
import ResendVerificationForm from "../components/Auth/ResendVerificationForm";
import useAuth from "../auth/useAuth";
import {
  getBackendFieldErrors,
  getRedirectFromLocation,
  isValidEmail,
} from "../utils/authFormUtils";
import "./AuthPages.css";

function getLoginErrorMessage(error) {
  if (error?.message === "Email is not verified") {
    return "Verify your email before signing in.";
  }

  if (error?.status === 401) {
    return "Email or password is incorrect.";
  }

  if (error?.status === 400) {
    return "Check your email and password, then try again.";
  }

  return "Unable to sign in right now. Please try again.";
}

function getLoginFieldErrors(error) {
  const backendErrors = getBackendFieldErrors(error);

  return {
    email: backendErrors.email ? "Enter a valid email address." : "",
    password: backendErrors.password ? "Password is required." : "",
  };
}

export default function LoginPage() {
  const { isAuthenticated, login, status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = getRedirectFromLocation(location, searchParams);
  const loginNotice =
    typeof location.state?.notice === "string" ? location.state.notice : "";
  const [values, setValues] = useState({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasOAuthError = searchParams.get("error") === "google_login_failed";

  if (status === "loading") {
    return (
      <section className="route-state" aria-live="polite">
        <p>Checking your session...</p>
      </section>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  function updateField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: "",
    }));
    setFormError("");
    setRequiresVerification(false);
  }

  function validateForm() {
    const nextErrors = {};
    const email = values.email.trim();

    if (!email) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.password) {
      nextErrors.password = "Password is required.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setRequiresVerification(false);

    try {
      await login({
        email: values.email.trim(),
        password: values.password,
      });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFieldErrors(getLoginFieldErrors(error));
      setFormError(getLoginErrorMessage(error));
      setRequiresVerification(error?.message === "Email is not verified");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-page__intro" aria-labelledby="login-title">
        <p className="auth-page__brand">CHẬM Account</p>
        <h1 id="login-title">Sign in</h1>
        <p>
          Continue to your account with the same quiet storefront experience.
        </p>
      </section>

      <section className="auth-panel" aria-label="Sign in form">
        {loginNotice ? (
          <p className="auth-form__notice" role="status">
            {loginNotice}
          </p>
        ) : null}

        {hasOAuthError ? (
          <p className="auth-form__error" role="alert">
            Google sign in could not be completed. Please try again.
          </p>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <AuthField
            id="login-email"
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            error={fieldErrors.email}
          />

          <AuthField
            id="login-password"
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(event) => updateField("password", event.target.value)}
            error={fieldErrors.password}
          />

          {formError ? (
            <p className="auth-form__error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="auth-form__actions">
            <button
              type="submit"
              className="button button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
            <p className="auth-form__links">
              <span>New here?</span>
              <Link to="/register">Create an account</Link>
            </p>
          </div>
        </form>

        <div className="auth-divider" aria-hidden="true">
          or
        </div>

        <a className="button button--ghost auth-oauth-link" href={getGoogleOAuthUrl()}>
          Continue with Google
        </a>

        {requiresVerification ? (
          <ResendVerificationForm initialEmail={values.email} />
        ) : null}
      </section>
    </div>
  );
}
