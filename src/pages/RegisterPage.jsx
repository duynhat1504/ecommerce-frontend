import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { register } from "../api/authApi";
import AuthField from "../components/Auth/AuthField";
import ResendVerificationForm from "../components/Auth/ResendVerificationForm";
import useAuth from "../auth/useAuth";
import {
  getBackendFieldErrors,
  isValidEmail,
} from "../utils/authFormUtils";
import "./AuthPages.css";

function getRegisterErrorMessage(error) {
  if (error?.status === 409) {
    return "This email could not be registered. If you already have an account, sign in or request a new verification link.";
  }

  if (error?.status === 400) {
    return "Check the highlighted fields and try again.";
  }

  return "Unable to create an account right now. Please try again.";
}

export default function RegisterPage() {
  const { isAuthenticated, status } = useAuth();
  const [values, setValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === "loading") {
    return (
      <section className="route-state" aria-live="polite">
        <p>Checking your session...</p>
      </section>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/account" replace />;
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
  }

  function validateForm() {
    const nextErrors = {};
    const fullName = values.fullName.trim();
    const email = values.email.trim();

    if (!fullName) {
      nextErrors.fullName = "Full name is required.";
    } else if (fullName.length > 100) {
      nextErrors.fullName = "Full name must not exceed 100 characters.";
    }

    if (!email) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address.";
    } else if (email.length > 100) {
      nextErrors.email = "Email must not exceed 100 characters.";
    }

    if (!values.password) {
      nextErrors.password = "Password is required.";
    } else if (values.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    } else if (values.password.length > 100) {
      nextErrors.password = "Password must not exceed 100 characters.";
    }

    if (!values.confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (values.confirmPassword !== values.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
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

    try {
      const response = await register({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      setRegisteredEmail(response?.email || values.email.trim());
    } catch (error) {
      setFieldErrors(getBackendFieldErrors(error));
      setFormError(getRegisterErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <div className="auth-page">
        <section className="auth-page__intro" aria-labelledby="register-success-title">
          <p className="auth-page__brand">CHẬM Account</p>
          <h1 id="register-success-title">Check your email</h1>
          <p>
            We sent a verification link to {registeredEmail}. Open that link to
            activate your account before signing in.
          </p>
        </section>

        <section className="auth-panel" aria-label="Registration next steps">
          <div className="auth-status">
            <h2>Almost ready</h2>
            <p>
              Registration does not sign you in automatically. Verification is
              required by the backend before login.
            </p>
            <p className="auth-status__links">
              <Link to="/login">Already verified? Sign in</Link>
            </p>
          </div>
          <ResendVerificationForm initialEmail={registeredEmail} />
        </section>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <section className="auth-page__intro" aria-labelledby="register-title">
        <p className="auth-page__brand">CHẬM Account</p>
        <h1 id="register-title">Create account</h1>
        <p>
          Set up your account, then verify your email before signing in.
        </p>
      </section>

      <section className="auth-panel" aria-label="Create account form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <AuthField
            id="register-full-name"
            name="fullName"
            label="Full name"
            autoComplete="name"
            value={values.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            error={fieldErrors.fullName}
          />

          <AuthField
            id="register-email"
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            error={fieldErrors.email}
          />

          <AuthField
            id="register-password"
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(event) => updateField("password", event.target.value)}
            error={fieldErrors.password}
            hint="At least 6 characters."
          />

          <AuthField
            id="register-confirm-password"
            name="confirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(event) =>
              updateField("confirmPassword", event.target.value)
            }
            error={fieldErrors.confirmPassword}
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
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
            <p className="auth-form__links">
              <span>Already have an account?</span>
              <Link to="/login">Sign in</Link>
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
