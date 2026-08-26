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
    return "Sign in again to view your profile.";
  }

  if (error?.status === 404) {
    return "Profile could not be found.";
  }

  if (error?.status >= 500) {
    return "Profile is unavailable right now. Please try again later.";
  }

  if (!error?.status) {
    return "Network connection failed. Please check your connection and try again.";
  }

  return "Profile could not be loaded right now.";
}

function getPasswordErrorMessage(error) {
  if (error?.status === 401 || error?.status === 403) {
    return "Sign in again before changing your password.";
  }

  if (error?.status === 400) {
    return "Check the highlighted fields and try again.";
  }

  if (error?.status >= 500) {
    return "Password could not be changed right now. Please try again later.";
  }

  if (!error?.status) {
    return "Network connection failed. Please check your connection and try again.";
  }

  return "Password could not be changed right now.";
}

function getPasswordFieldErrors(error) {
  const backendErrors = getBackendFieldErrors(error);
  const nextErrors = {
    currentPassword: backendErrors.currentPassword || "",
    newPassword: backendErrors.newPassword || "",
    confirmNewPassword: backendErrors.confirmNewPassword || "",
  };

  if (error?.message === "Current password is incorrect") {
    nextErrors.currentPassword = "Current password is incorrect.";
  }

  if (error?.message === "Password confirmation does not match") {
    nextErrors.confirmNewPassword = "Password confirmation does not match.";
  }

  if (error?.message === "New password must be different from current password") {
    nextErrors.newPassword = "New password must be different from current password.";
  }

  return nextErrors;
}

function formatRole(role) {
  if (!role) {
    return "Unavailable";
  }

  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function formatStatus(active) {
  if (active === true) {
    return "Active";
  }

  if (active === false) {
    return "Inactive";
  }

  return "Unavailable";
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
        <p className="account-profile-field__error" id={errorId}>
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
        <dt>Full name</dt>
        <dd>{profile?.fullName || "Unavailable"}</dd>
      </div>
      <div className="account-profile-fact">
        <dt>Email</dt>
        <dd>{profile?.email || "Unavailable"}</dd>
      </div>
      <div className="account-profile-fact">
        <dt>Status</dt>
        <dd>{formatStatus(profile?.active)}</dd>
      </div>
      <div className="account-profile-fact">
        <dt>Role</dt>
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
      nextErrors.currentPassword = "Current password is required.";
    }

    if (!newPassword.trim()) {
      nextErrors.newPassword = "New password is required.";
    } else if (newPassword.length < 6) {
      nextErrors.newPassword = "Password must be at least 6 characters.";
    } else if (newPassword.length > 100) {
      nextErrors.newPassword = "Password must not exceed 100 characters.";
    }

    if (!confirmNewPassword.trim()) {
      nextErrors.confirmNewPassword = "Password confirmation is required.";
    } else if (confirmNewPassword !== newPassword) {
      nextErrors.confirmNewPassword = "Password confirmation does not match.";
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
          notice: "Password changed. Sign in with your new password.",
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
        <p className="account-profile-page__kicker">Account</p>
        <h1 id="account-profile-title">Profile</h1>
        <p>View the account details currently held by CHẬM.</p>
        <AccountNavigation />
      </div>

      <div className="account-profile-layout">
        <section
          className="account-profile-section"
          aria-labelledby="account-profile-details-title"
        >
          <div className="account-profile-section__header">
            <h2 id="account-profile-details-title">Profile details</h2>
            {profileState.status === "error" ? (
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setRetryKey((key) => key + 1)}
              >
                Retry
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
              Name and email changes are not available from your account page.
            </p>
          ) : null}
        </section>

        <section
          className="account-profile-section"
          aria-labelledby="account-password-title"
        >
          <div className="account-profile-section__header">
            <h2 id="account-password-title">Change password</h2>
          </div>

          <form className="account-profile-form" onSubmit={handlePasswordSubmit}>
            <PasswordField
              id="account-current-password"
              name="currentPassword"
              label="Current password"
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
              label="New password"
              autoComplete="new-password"
              value={passwordValues.newPassword}
              onChange={(event) =>
                updatePasswordField("newPassword", event.target.value)
              }
              error={passwordFieldErrors.newPassword}
              hint="6 to 100 characters."
            />

            <PasswordField
              id="account-confirm-new-password"
              name="confirmNewPassword"
              label="Confirm new password"
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
                {isPasswordSubmitting ? "Changing password..." : "Change password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
