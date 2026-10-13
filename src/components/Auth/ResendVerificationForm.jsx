import { useState } from "react";

import { resendVerification } from "../../api/authApi";
import AuthField from "./AuthField";
import { isValidEmail } from "../../utils/authFormUtils";

const RESEND_SUCCESS_MESSAGE =
  "Nếu email này đủ điều kiện, một liên kết xác thực mới đã được gửi.";

export default function ResendVerificationForm({
  initialEmail = "",
  title = "Cần gửi lại liên kết xác thực?",
}) {
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    const nextEmail = email.trim();

    if (!nextEmail) {
      setEmailError("Vui lòng nhập email.");
      return;
    }

    if (!isValidEmail(nextEmail)) {
      setEmailError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }

    setEmailError("");
    setStatus("submitting");
    setMessage("");

    try {
      await resendVerification({ email: nextEmail });
      setStatus("success");
      setMessage(RESEND_SUCCESS_MESSAGE);
    } catch {
      setStatus("error");
      setMessage("Không thể yêu cầu email xác thực vào lúc này.");
    }
  }

  return (
    <section className="auth-resend" aria-labelledby="resend-title">
      <div>
        <h2 id="resend-title">{title}</h2>
        <p className="auth-page__fine-print">
          Dùng địa chỉ email của tài khoản CHẬM của bạn.
        </p>
      </div>
      <form className="auth-resend__form" onSubmit={handleSubmit}>
        <AuthField
          id="resend-email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={emailError}
        />
        <button
          type="submit"
          className="button button--ghost"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Đang gửi..." : "Gửi lại email xác thực"}
        </button>
      </form>
      {message ? (
        <p
          className={
            status === "error"
              ? "auth-form__error"
              : "auth-resend__message"
          }
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
