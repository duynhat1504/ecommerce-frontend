import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { verifyEmail } from "../api/authApi";
import ResendVerificationForm from "../components/Auth/ResendVerificationForm";
import "./AuthPages.css";

function VerificationStatus({ status, message }) {
  if (status === "verifying") {
    return (
      <div className="auth-status" aria-live="polite">
        <h2>Đang xác thực...</h2>
        <p>Vui lòng chờ trong khi chúng tôi xác nhận email của bạn.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="auth-status">
        <h2>Email đã được xác thực</h2>
        <p>Tài khoản của bạn đã sẵn sàng. Bạn có thể đăng nhập ngay bây giờ.</p>
        <p className="auth-status__links">
          <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-status" role={status === "error" ? "alert" : undefined}>
      <h2>Liên kết xác thực không khả dụng</h2>
      <p>{message}</p>
      <p className="auth-status__links">
        <Link to="/login">Đăng nhập</Link>
        <Link to="/register">Tạo tài khoản</Link>
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
      : "Liên kết xác thực này thiếu mã xác thực.",
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
            message: "Liên kết xác thực này không hợp lệ hoặc đã hết hạn.",
          });
          return;
        }

        setVerifyState({
          status: "error",
          message: "Không thể xác thực email của bạn vào lúc này.",
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
        <h1 id="verify-title">Xác thực email</h1>
        <p>
          Xác thực email giúp bảo vệ tài khoản của bạn trước lần đăng nhập đầu tiên.
        </p>
      </section>

      <section className="auth-panel" aria-label="Trạng thái xác thực email">
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
