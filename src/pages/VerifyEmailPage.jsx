import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { verifyEmail } from "../api/authApi";
import ResendVerificationForm from "../components/Auth/ResendVerificationForm";
import "./AuthPages.css";

function VerificationStatus({ status, message }) {
  if (status === "verifying") {
    return (
      <div className="auth-status" aria-live="polite">
        <h2>Verifying...</h2>
        <p>Please wait while we confirm your email.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="auth-status">
        <h2>Email verified</h2>
        <p>Your account is ready. You can now sign in.</p>
        <p className="auth-status__links">
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-status" role={status === "error" ? "alert" : undefined}>
      <h2>Verification link unavailable</h2>
      <p>{message}</p>
      <p className="auth-status__links">
        <Link to="/login">Sign in</Link>
        <Link to="/register">Create account</Link>
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [verifyState, setVerifyState] = useState({
    status: token ? "verifying" : "missing",
    message: token
      ? ""
      : "This verification link is missing a token.",
  });

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const controller = new AbortController();

    async function confirmEmail() {
      setVerifyState({
        status: "verifying",
        message: "",
      });

      try {
        await verifyEmail(token, { signal: controller.signal });
        setVerifyState({
          status: "success",
          message: "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        if (error.status === 400) {
          setVerifyState({
            status: "invalid",
            message: "This verification link is invalid or expired.",
          });
          return;
        }

        setVerifyState({
          status: "error",
          message: "Unable to verify your email right now.",
        });
      }
    }

    confirmEmail();

    return () => {
      controller.abort();
    };
  }, [token]);

  return (
    <div className="auth-page">
      <section className="auth-page__intro" aria-labelledby="verify-title">
        <p className="auth-page__brand">CHẬM Account</p>
        <h1 id="verify-title">Verify email</h1>
        <p>
          Email verification protects your account before the first sign in.
        </p>
      </section>

      <section className="auth-panel" aria-label="Email verification status">
        <VerificationStatus
          status={verifyState.status}
          message={verifyState.message}
        />
        {verifyState.status !== "success" && verifyState.status !== "verifying" ? (
          <ResendVerificationForm />
        ) : null}
      </section>
    </div>
  );
}
