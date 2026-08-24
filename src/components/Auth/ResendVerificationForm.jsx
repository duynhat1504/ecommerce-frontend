import { useState } from "react";

import { resendVerification } from "../../api/authApi";
import AuthField from "./AuthField";
import { isValidEmail } from "../../utils/authFormUtils";

const RESEND_SUCCESS_MESSAGE =
  "If this email is eligible, a new verification link has been sent.";

export default function ResendVerificationForm({
  initialEmail = "",
  title = "Need a new verification link?",
}) {
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    const nextEmail = email.trim();

    if (!nextEmail) {
      setEmailError("Email is required.");
      return;
    }

    if (!isValidEmail(nextEmail)) {
      setEmailError("Enter a valid email address.");
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
      setMessage("Unable to request a verification email right now.");
    }
  }

  return (
    <section className="auth-resend" aria-labelledby="resend-title">
      <div>
        <h2 id="resend-title">{title}</h2>
        <p className="auth-page__fine-print">
          Use the email address from your CHẬM account.
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
          {status === "submitting" ? "Sending..." : "Resend verification"}
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
