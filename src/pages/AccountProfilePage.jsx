import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { changePassword } from "../api/authApi";
import useAuth from "../auth/useAuth";
import AccountNavigation from "../components/Account/AccountNavigation";
import { getBackendFieldErrors } from "../utils/authFormUtils";
import "./AccountProfilePage.css";

const initialPasswordValues = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

function getProfileErrorMessage(error) {
  if (error?.status === 401 || error?.status === 403) {
    return "Hãy đăng nhập lại để xem hồ sơ.";
  }

  if (error?.status === 404) {
    return "Không tìm thấy hồ sơ.";
  }

  if (error?.status >= 500) {
    return "Hồ sơ hiện không khả dụng. Vui lòng thử lại sau.";
  }

  if (!error?.status) {
    return "Kết nối mạng thất bại. Vui lòng kiểm tra kết nối rồi thử lại.";
  }

  return "Không thể tải hồ sơ vào lúc này.";
}

function getPasswordErrorMessage(error) {
  if (error?.status === 401 || error?.status === 403) {
    return "Hãy đăng nhập lại trước khi đổi mật khẩu.";
  }

  if (error?.status === 400) {
    return "Kiểm tra các trường được đánh dấu rồi thử lại.";
  }

  if (error?.status >= 500) {
    return "Không thể đổi mật khẩu vào lúc này. Vui lòng thử lại sau.";
  }

  if (!error?.status) {
    return "Kết nối mạng thất bại. Vui lòng kiểm tra kết nối rồi thử lại.";
  }

  return "Không thể đổi mật khẩu vào lúc này.";
}

function getPasswordFieldErrors(error) {
  const backendErrors = getBackendFieldErrors(error);
  const nextErrors = {
    currentPassword: backendErrors.currentPassword || "",
    newPassword: backendErrors.newPassword || "",
    confirmNewPassword: backendErrors.confirmNewPassword || "",
  };

  if (error?.message === "Current password is incorrect") {
    nextErrors.currentPassword = "Mật khẩu hiện tại không chính xác.";
  }

  if (error?.message === "Password confirmation does not match") {
    nextErrors.confirmNewPassword = "Xác nhận mật khẩu không khớp.";
  }

  if (error?.message === "New password must be different from current password") {
    nextErrors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại.";
  }

  return nextErrors;
}

function formatRole(role) {
  if (!role) {
    return "Không khả dụng";
  }

  return role === "ADMIN" ? "Quản trị viên" : "Người dùng";
}

function formatStatus(active) {
  if (active === true) {
    return "Đang hoạt động";
  }

  if (active === false) {
    return "Ngừng hoạt động";
  }

  return "Không khả dụng";
}

function PasswordField({
  autoComplete,
  error,
  hint,
  id,
  label,
  name,
  onChange,
  value,
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="account-profile-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type="password"
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
      />
      {hint ? (
        <p className="account-profile-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="account-profile-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function AccountProfileSkeleton() {
  return (
    <div className="account-profile-facts" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="account-profile-fact" key={index}>
          <span className="account-profile-skeleton account-profile-skeleton--label" />
          <span className="account-profile-skeleton account-profile-skeleton--value" />
        </div>
      ))}
    </div>
  );
}

function ProfileDetails({ profile }) {
  return (
    <dl className="account-profile-facts">
      <div className="account-profile-fact">
        <dt>Họ và tên</dt>
        <dd>{profile?.fullName || "Không khả dụng"}</dd>
      </div>
      <div className="account-profile-fact">
        <dt>Email</dt>
        <dd>{profile?.email || "Không khả dụng"}</dd>
      </div>
      <div className="account-profile-fact">
        <dt>Trạng thái</dt>
        <dd>{formatStatus(profile?.active)}</dd>
      </div>
      <div className="account-profile-fact">
        <dt>Vai trò</dt>
        <dd>{formatRole(profile?.role)}</dd>
      </div>
    </dl>
  );
}

export default function AccountProfilePage() {
  const { clearSession, refreshUser, user } = useAuth();
  const navigate = useNavigate();
  const [profileState, setProfileState] = useState({
    status: "loading",
    data: null,
    message: "",
  });
  const [retryKey, setRetryKey] = useState(0);
  const [passwordValues, setPasswordValues] = useState(initialPasswordValues);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({});
  const [passwordError, setPasswordError] = useState("");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const profile = profileState.data || user;
  const hasLoadedProfile =
    profileState.status === "success" && Boolean(profileState.data);
  const isPasswordUnchanged = useMemo(
    () =>
      !passwordValues.currentPassword &&
      !passwordValues.newPassword &&
      !passwordValues.confirmNewPassword,
    [passwordValues],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setProfileState({
        status: "loading",
        data: null,
        message: "",
      });

      try {
        const currentUser = await refreshUser({ signal: controller.signal });

        setProfileState({
          status: "success",
          data: currentUser,
          message: "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setProfileState({
          status: "error",
          data: null,
          message: getProfileErrorMessage(error),
        });
      }
    }

    loadProfile();

    return () => {
      controller.abort();
    };
  }, [refreshUser, retryKey]);

  function updatePasswordField(field, value) {
    setPasswordValues((current) => ({
      ...current,
      [field]: value,
    }));
    setPasswordFieldErrors((current) => ({
      ...current,
      [field]: "",
    }));
    setPasswordError("");
  }

  function validatePasswordForm() {
    const nextErrors = {};
    const currentPassword = passwordValues.currentPassword.trim();
    const newPassword = passwordValues.newPassword;
    const confirmNewPassword = passwordValues.confirmNewPassword;

    if (!currentPassword) {
      nextErrors.currentPassword = "Vui lòng nhập mật khẩu hiện tại.";
    }

    if (!newPassword.trim()) {
      nextErrors.newPassword = "Vui lòng nhập mật khẩu mới.";
    } else if (newPassword.length < 6) {
      nextErrors.newPassword = "Mật khẩu phải có ít nhất 6 ký tự.";
    } else if (newPassword.length > 100) {
      nextErrors.newPassword = "Mật khẩu không được vượt quá 100 ký tự.";
    }

    if (!confirmNewPassword.trim()) {
      nextErrors.confirmNewPassword = "Vui lòng xác nhận mật khẩu.";
    } else if (confirmNewPassword !== newPassword) {
      nextErrors.confirmNewPassword = "Xác nhận mật khẩu không khớp.";
    }

    setPasswordFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    if (isPasswordSubmitting || !validatePasswordForm()) {
      return;
    }

    setIsPasswordSubmitting(true);
    setPasswordError("");

    try {
      await changePassword({
        currentPassword: passwordValues.currentPassword,
        newPassword: passwordValues.newPassword,
        confirmNewPassword: passwordValues.confirmNewPassword,
      });
      setPasswordValues(initialPasswordValues);
      setIsPasswordSubmitting(false);
      clearSession();
      navigate("/login", {
        replace: true,
        state: {
          notice: "Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.",
        },
      });
    } catch (error) {
      setPasswordFieldErrors(getPasswordFieldErrors(error));
      setPasswordError(getPasswordErrorMessage(error));
      setIsPasswordSubmitting(false);
    }
  }

  return (
    <section className="account-profile-page" aria-labelledby="account-profile-title">
      <div className="account-profile-page__header">
        <p className="account-profile-page__kicker">Tài khoản</p>
        <h1 id="account-profile-title">Hồ sơ</h1>
        <p>Xem thông tin tài khoản hiện có tại CHẬM.</p>
        <AccountNavigation />
      </div>

      <div className="account-profile-layout">
        <section
          className="account-profile-section"
          aria-labelledby="account-profile-details-title"
        >
          <div className="account-profile-section__header">
            <h2 id="account-profile-details-title">Thông tin hồ sơ</h2>
            {profileState.status === "error" ? (
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setRetryKey((key) => key + 1)}
              >
                Thử lại
              </button>
            ) : null}
          </div>

          {profileState.status === "loading" ? <AccountProfileSkeleton /> : null}

          {profileState.status === "error" ? (
            <p className="account-profile-alert" role="alert">
              {profileState.message}
            </p>
          ) : null}

          {hasLoadedProfile ? <ProfileDetails profile={profile} /> : null}

          {hasLoadedProfile ? (
            <p className="account-profile-note">
              Bạn không thể đổi họ tên và email từ trang tài khoản.
            </p>
          ) : null}
        </section>

        <section
          className="account-profile-section"
          aria-labelledby="account-password-title"
        >
          <div className="account-profile-section__header">
            <h2 id="account-password-title">Đổi mật khẩu</h2>
          </div>

          <form className="account-profile-form" onSubmit={handlePasswordSubmit}>
            <PasswordField
              id="account-current-password"
              name="currentPassword"
              label="Mật khẩu hiện tại"
              autoComplete="current-password"
              value={passwordValues.currentPassword}
              onChange={(event) =>
                updatePasswordField("currentPassword", event.target.value)
              }
              error={passwordFieldErrors.currentPassword}
            />

            <PasswordField
              id="account-new-password"
              name="newPassword"
              label="Mật khẩu mới"
              autoComplete="new-password"
              value={passwordValues.newPassword}
              onChange={(event) =>
                updatePasswordField("newPassword", event.target.value)
              }
              error={passwordFieldErrors.newPassword}
              hint="Từ 6 đến 100 ký tự."
            />

            <PasswordField
              id="account-confirm-new-password"
              name="confirmNewPassword"
              label="Xác nhận mật khẩu mới"
              autoComplete="new-password"
              value={passwordValues.confirmNewPassword}
              onChange={(event) =>
                updatePasswordField("confirmNewPassword", event.target.value)
              }
              error={passwordFieldErrors.confirmNewPassword}
            />

            {passwordError ? (
              <p className="account-profile-alert" role="alert">
                {passwordError}
              </p>
            ) : null}

            <div className="account-profile-form__actions">
              <button
                type="submit"
                className="button button--primary"
                disabled={isPasswordSubmitting || isPasswordUnchanged}
              >
                {isPasswordSubmitting ? "Đang đổi mật khẩu..." : "Đổi mật khẩu"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
