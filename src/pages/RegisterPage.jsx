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
    return "Không thể đăng ký email này. Nếu bạn đã có tài khoản, hãy đăng nhập hoặc yêu cầu liên kết xác thực mới.";
  }

  if (error?.status === 400) {
    return "Kiểm tra các trường được đánh dấu rồi thử lại.";
  }

  return "Không thể tạo tài khoản vào lúc này. Vui lòng thử lại.";
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
        <p>Đang kiểm tra phiên đăng nhập...</p>
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
      nextErrors.fullName = "Vui lòng nhập họ và tên.";
    } else if (fullName.length > 100) {
      nextErrors.fullName = "Họ và tên không được vượt quá 100 ký tự.";
    }

    if (!email) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Vui lòng nhập địa chỉ email hợp lệ.";
    } else if (email.length > 100) {
      nextErrors.email = "Email không được vượt quá 100 ký tự.";
    }

    if (!values.password) {
      nextErrors.password = "Vui lòng nhập mật khẩu.";
    } else if (values.password.length < 6) {
      nextErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
    } else if (values.password.length > 100) {
      nextErrors.password = "Mật khẩu không được vượt quá 100 ký tự.";
    }

    if (!values.confirmPassword) {
      nextErrors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
    } else if (values.confirmPassword !== values.password) {
      nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
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
          <h1 id="register-success-title">Kiểm tra email</h1>
          <p>
            Chúng tôi đã gửi liên kết xác thực đến {registeredEmail}. Hãy mở liên kết đó để
            kích hoạt tài khoản trước khi đăng nhập.
          </p>
        </section>

        <section className="auth-panel" aria-label="Các bước tiếp theo sau khi đăng ký">
          <div className="auth-status">
            <h2>Sắp hoàn tất</h2>
            <p>
              Đăng ký không tự động đăng nhập. Bạn cần xác thực email trước khi đăng nhập.
            </p>
            <p className="auth-status__links">
              <Link to="/login">Đã xác thực? Đăng nhập</Link>
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
        <h1 id="register-title">Tạo tài khoản</h1>
        <p>
          Tạo tài khoản, sau đó xác thực email trước khi đăng nhập.
        </p>
      </section>

      <section className="auth-panel" aria-label="Biểu mẫu tạo tài khoản">
        <form className="auth-form" onSubmit={handleSubmit}>
          <AuthField
            id="register-full-name"
            name="fullName"
            label="Họ và tên"
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
            label="Mật khẩu"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(event) => updateField("password", event.target.value)}
            error={fieldErrors.password}
            hint="Ít nhất 6 ký tự."
          />

          <AuthField
            id="register-confirm-password"
            name="confirmPassword"
            label="Xác nhận mật khẩu"
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
              {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </button>
            <p className="auth-form__links">
              <span>Đã có tài khoản?</span>
              <Link to="/login">Đăng nhập</Link>
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
