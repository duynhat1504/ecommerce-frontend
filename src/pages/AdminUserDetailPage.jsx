import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getAdminUserById,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "../api/adminUserApi";
import useAuth from "../auth/useAuth";
import "./AdminUsersPage.css";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getDateTimeLabel(value) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getRoleLabel(role) {
  return role === "ADMIN" ? "Admin" : "User";
}

function getStatusLabel(active) {
  if (active === true) {
    return "Active";
  }

  if (active === false) {
    return "Inactive";
  }

  return "Unavailable";
}

function getBooleanLabel(value) {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  return "Unavailable";
}

function getUserTitle(user) {
  return user?.fullName || user?.email || "User";
}

function getDetailErrorState(error) {
  if (error?.status === 404) {
    return {
      status: "missing",
      message: "User not found.",
    };
  }

  if (error?.status === 400) {
    return {
      status: "missing",
      message: error.message || "The user identifier was rejected.",
    };
  }

  if (error?.status === 401 || error?.status === 403) {
    return {
      status: "error",
      message: "Admin access is required. Sign in again with an admin account.",
    };
  }

  if (error?.status >= 500) {
    return {
      status: "error",
      message: "The user service is unavailable right now.",
    };
  }

  if (!error?.status) {
    return {
      status: "network",
      message: "Network connection failed. Check the API server and try again.",
    };
  }

  return {
    status: "error",
    message: "User details could not be loaded.",
  };
}

function getMutationMessage(error, fallbackMessage) {
  if (error?.status === 404) {
    return "User not found. The account may no longer exist or the id is invalid.";
  }

  if (error?.status === 400) {
    return error.message || "The backend rejected this account change.";
  }

  if (error?.status === 401 || error?.status === 403) {
    return error.message || "Admin access is required for this account change.";
  }

  if (error?.status >= 500) {
    return "The user service rejected the account change right now.";
  }

  if (!error?.status) {
    return "Network connection failed. The account was not changed locally.";
  }

  return fallbackMessage;
}

function AdminUserDetailState({ alert = false, action, message, title }) {
  return (
    <section
      className="admin-users-state admin-users-state--page"
      aria-labelledby="admin-user-detail-state-title"
      role={alert ? "alert" : undefined}
    >
      <p className="admin-users__kicker">Admin users</p>
      <h1 id="admin-user-detail-state-title">{title}</h1>
      <p>{message}</p>
      {action}
    </section>
  );
}

function AdminUserDetailSkeleton() {
  return (
    <section className="admin-user-detail" aria-hidden="true">
      <div className="admin-user-detail__header">
        <span className="admin-users-skeleton admin-users-skeleton--action" />
        <span className="admin-users-skeleton admin-users-skeleton--heading" />
        <span className="admin-users-skeleton admin-users-skeleton--wide" />
      </div>
      <div className="admin-user-detail__layout">
        <div className="admin-user-detail__main">
          <span className="admin-users-skeleton admin-users-skeleton--block" />
          <span className="admin-users-skeleton admin-users-skeleton--block" />
        </div>
        <span className="admin-users-skeleton admin-users-skeleton--panel" />
      </div>
    </section>
  );
}

function UserFacts({ user }) {
  return (
    <dl className="admin-user-facts">
      <div>
        <dt>Full name</dt>
        <dd>{user?.fullName || "Unavailable"}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>{user?.email || "Unavailable"}</dd>
      </div>
      <div>
        <dt>Email verified</dt>
        <dd>{getBooleanLabel(user?.emailVerified)}</dd>
      </div>
      <div>
        <dt>User id</dt>
        <dd>{user?.id || "Unavailable"}</dd>
      </div>
      <div>
        <dt>Created</dt>
        <dd>{getDateTimeLabel(user?.createdAt)}</dd>
      </div>
      <div>
        <dt>Updated</dt>
        <dd>{getDateTimeLabel(user?.updatedAt)}</dd>
      </div>
    </dl>
  );
}

function LifecycleFacts({ user }) {
  return (
    <dl className="admin-user-facts admin-user-facts--compact">
      <div>
        <dt>Role</dt>
        <dd>
          <span
            className={`admin-users-status admin-users-status--${String(
              user?.role || "unknown",
            ).toLowerCase()}`}
          >
            {getRoleLabel(user?.role)}
          </span>
        </dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>
          <span
            className={`admin-users-status admin-users-status--${
              user?.active ? "active" : "inactive"
            }`}
          >
            {getStatusLabel(user?.active)}
          </span>
        </dd>
      </div>
    </dl>
  );
}

function AccountActions({
  actionMessage,
  currentUserId,
  mutatingAction,
  onChangeRole,
  onChangeStatus,
  user,
}) {
  const isCurrentUser = currentUserId && user?.id === currentUserId;
  const isMutating = Boolean(mutatingAction);
  const nextActive = !user?.active;
  const nextRole = user?.role === "ADMIN" ? "USER" : "ADMIN";
  const disableSelfDeactivate = isCurrentUser && user?.active === true;
  const disableSelfDemote = isCurrentUser && user?.role === "ADMIN";

  return (
    <aside className="admin-user-panel" aria-labelledby="admin-user-actions-title">
      <div className="admin-user-panel__header">
        <h2 id="admin-user-actions-title">Account actions</h2>
        <span className="admin-users-number">{user?.email || "Unavailable"}</span>
      </div>

      <LifecycleFacts user={user} />

      <div className="admin-user-actions" aria-label="Supported account actions">
        <button
          type="button"
          className={
            nextActive
              ? "button button--primary"
              : "button button--ghost admin-user-actions__danger"
          }
          onClick={() => onChangeStatus(nextActive)}
          disabled={isMutating || disableSelfDeactivate}
        >
          {mutatingAction === "status"
            ? "Saving..."
            : nextActive
              ? "Activate account"
              : "Deactivate account"}
        </button>
        <button
          type="button"
          className={
            nextRole === "ADMIN"
              ? "button button--primary"
              : "button button--ghost admin-user-actions__danger"
          }
          onClick={() => onChangeRole(nextRole)}
          disabled={isMutating || disableSelfDemote}
        >
          {mutatingAction === "role"
            ? "Saving..."
            : nextRole === "ADMIN"
              ? "Promote to admin"
              : "Demote to user"}
        </button>
      </div>

      {disableSelfDeactivate || disableSelfDemote ? (
        <p className="admin-user-note">
          Self deactivation and self demotion are blocked by the backend.
        </p>
      ) : (
        <p className="admin-user-note">
          Changes are saved by the backend, then this account is reloaded.
        </p>
      )}

      {actionMessage ? (
        <p className="admin-users-alert" role="alert">
          {actionMessage}
        </p>
      ) : null}
    </aside>
  );
}

export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const isValidUserId = useMemo(
    () => UUID_PATTERN.test(userId || ""),
    [userId],
  );
  const [userState, setUserState] = useState({
    status: "loading",
    user: null,
    message: "",
  });
  const [retryKey, setRetryKey] = useState(0);
  const [mutatingAction, setMutatingAction] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const mutationInFlightRef = useRef(false);

  const loadUser = useCallback(async (options = {}) => {
    const user = await getAdminUserById(userId, options);

    setUserState({
      status: "success",
      user,
      message: "",
    });
    return user;
  }, [userId]);

  useEffect(() => {
    if (!isValidUserId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadUserForPage() {
      setUserState((current) => ({
        status: "loading",
        user: current.user,
        message: "",
      }));
      setActionMessage("");

      try {
        await loadUser({ signal: controller.signal });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        const nextState = getDetailErrorState(error);

        setUserState({
          status: nextState.status,
          user: null,
          message: nextState.message,
        });
      }
    }

    loadUserForPage();

    return () => {
      controller.abort();
    };
  }, [isValidUserId, loadUser, retryKey]);

  async function handleChangeStatus(nextActive) {
    if (!userState.user?.id || mutationInFlightRef.current) {
      return;
    }

    mutationInFlightRef.current = true;
    setMutatingAction("status");
    setActionMessage("");

    try {
      await updateAdminUserStatus(userState.user.id, nextActive);

      try {
        await loadUser();
      } catch {
        setActionMessage(
          "Status request finished, but the refreshed user could not be loaded.",
        );
      }
    } catch (error) {
      setActionMessage(
        getMutationMessage(error, "Could not change account status."),
      );
      await loadUser().catch(() => {});
    } finally {
      mutationInFlightRef.current = false;
      setMutatingAction("");
    }
  }

  async function handleChangeRole(nextRole) {
    if (!userState.user?.id || mutationInFlightRef.current) {
      return;
    }

    mutationInFlightRef.current = true;
    setMutatingAction("role");
    setActionMessage("");

    try {
      await updateAdminUserRole(userState.user.id, nextRole);

      try {
        await loadUser();
      } catch {
        setActionMessage(
          "Role request finished, but the refreshed user could not be loaded.",
        );
      }
    } catch (error) {
      setActionMessage(getMutationMessage(error, "Could not change user role."));
      await loadUser().catch(() => {});
    } finally {
      mutationInFlightRef.current = false;
      setMutatingAction("");
    }
  }

  function handleRetry() {
    setRetryKey((key) => key + 1);
  }

  if (!isValidUserId) {
    return (
      <AdminUserDetailState
        title="User not found."
        message="The user identifier is not a valid UUID."
        action={
          <Link className="button button--primary" to="/admin/users">
            Back to users
          </Link>
        }
      />
    );
  }

  if (userState.status === "loading" && !userState.user) {
    return <AdminUserDetailSkeleton />;
  }

  if (userState.status === "missing") {
    return (
      <AdminUserDetailState
        title="User not found."
        message={userState.message}
        action={
          <Link className="button button--primary" to="/admin/users">
            Back to users
          </Link>
        }
      />
    );
  }

  if (userState.status === "error" || userState.status === "network") {
    return (
      <AdminUserDetailState
        title="User unavailable."
        message={userState.message}
        alert
        action={
          <div className="admin-users-state__actions">
            <button type="button" className="button button--ghost" onClick={handleRetry}>
              Retry
            </button>
            <Link className="button button--primary" to="/admin/users">
              Back to users
            </Link>
          </div>
        }
      />
    );
  }

  const user = userState.user;

  return (
    <article className="admin-user-detail" aria-labelledby="admin-user-detail-title">
      <header className="admin-user-detail__header">
        <Link className="admin-users-text-link" to="/admin/users">
          Back to users
        </Link>
        <div className="admin-user-detail__heading">
          <div>
            <p className="admin-users__kicker">Admin user</p>
            <h1 id="admin-user-detail-title">{getUserTitle(user)}</h1>
          </div>
          <button
            type="button"
            className="button button--ghost"
            onClick={handleRetry}
            disabled={userState.status === "loading" || Boolean(mutatingAction)}
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="admin-user-detail__layout">
        <div className="admin-user-detail__main">
          <section className="admin-user-section" aria-labelledby="admin-user-account-title">
            <h2 id="admin-user-account-title">Account information</h2>
            <UserFacts user={user} />
          </section>

          <section className="admin-user-section" aria-labelledby="admin-user-lifecycle-title">
            <h2 id="admin-user-lifecycle-title">Role and status</h2>
            <LifecycleFacts user={user} />
          </section>
        </div>

        <AccountActions
          actionMessage={actionMessage}
          currentUserId={currentUser?.id}
          mutatingAction={mutatingAction}
          onChangeRole={handleChangeRole}
          onChangeStatus={handleChangeStatus}
          user={user}
        />
      </div>
    </article>
  );
}
