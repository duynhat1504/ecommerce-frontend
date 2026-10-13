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
    return "Không khả dụng";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không khả dụng";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getRoleLabel(role) {
  return role === "ADMIN" ? "Quản trị viên" : "Người dùng";
}

function getStatusLabel(active) {
  if (active === true) {
    return "Đang hoạt động";
  }

  if (active === false) {
    return "Ngừng hoạt động";
  }

  return "Không khả dụng";
}

function getBooleanLabel(value) {
  if (value === true) {
    return "Có";
  }

  if (value === false) {
    return "Không";
  }

  return "Không khả dụng";
}

function getUserTitle(user) {
  return user?.fullName || user?.email || "Người dùng";
}

function getDetailErrorState(error) {
  if (error?.status === 404) {
    return {
      status: "missing",
      message: "Không tìm thấy người dùng.",
    };
  }

  if (error?.status === 400) {
    return {
      status: "missing",
      message: "Mã định danh người dùng không hợp lệ.",
    };
  }

  if (error?.status === 401 || error?.status === 403) {
    return {
      status: "error",
      message: "Cần quyền quản trị. Hãy đăng nhập lại bằng tài khoản quản trị.",
    };
  }

  if (error?.status >= 500) {
    return {
      status: "error",
      message: "Dịch vụ người dùng hiện không khả dụng.",
    };
  }

  if (!error?.status) {
    return {
      status: "network",
      message: "Kết nối mạng thất bại. Hãy kiểm tra máy chủ API rồi thử lại.",
    };
  }

  return {
    status: "error",
    message: "Không thể tải chi tiết người dùng.",
  };
}

function getMutationMessage(error, fallbackMessage) {
  if (error?.status === 404) {
    return "Không tìm thấy người dùng. Tài khoản có thể không còn tồn tại hoặc mã không hợp lệ.";
  }

  if (error?.status === 400) {
    return "Backend từ chối thay đổi tài khoản này.";
  }

  if (error?.status === 401 || error?.status === 403) {
    return "Cần quyền quản trị để thay đổi tài khoản này.";
  }

  if (error?.status >= 500) {
    return "Dịch vụ người dùng hiện không thể thay đổi tài khoản.";
  }

  if (!error?.status) {
    return "Kết nối mạng thất bại. Tài khoản chưa được thay đổi.";
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
      <p className="admin-users__kicker">Quản lý người dùng</p>
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
        <dt>Họ và tên</dt>
        <dd>{user?.fullName || "Không khả dụng"}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>{user?.email || "Không khả dụng"}</dd>
      </div>
      <div>
        <dt>Email đã xác thực</dt>
        <dd>{getBooleanLabel(user?.emailVerified)}</dd>
      </div>
      <div>
        <dt>Mã định danh người dùng</dt>
        <dd>{user?.id || "Không khả dụng"}</dd>
      </div>
      <div>
        <dt>Ngày tạo</dt>
        <dd>{getDateTimeLabel(user?.createdAt)}</dd>
      </div>
      <div>
        <dt>Cập nhật</dt>
        <dd>{getDateTimeLabel(user?.updatedAt)}</dd>
      </div>
    </dl>
  );
}

function LifecycleFacts({ user }) {
  return (
    <dl className="admin-user-facts admin-user-facts--compact">
      <div>
        <dt>Vai trò</dt>
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
        <dt>Trạng thái</dt>
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
        <h2 id="admin-user-actions-title">Thao tác tài khoản</h2>
        <span className="admin-users-number">{user?.email || "Không khả dụng"}</span>
      </div>

      <LifecycleFacts user={user} />

      <div className="admin-user-actions" aria-label="Các thao tác tài khoản được hỗ trợ">
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
            ? "Đang lưu..."
            : nextActive
              ? "Kích hoạt tài khoản"
              : "Vô hiệu hóa tài khoản"}
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
            ? "Đang lưu..."
            : nextRole === "ADMIN"
              ? "Nâng thành quản trị viên"
              : "Hạ thành người dùng"}
        </button>
      </div>

      {disableSelfDeactivate || disableSelfDemote ? (
        <p className="admin-user-note">
          Backend không cho phép tự vô hiệu hóa hoặc tự hạ quyền.
        </p>
      ) : (
        <p className="admin-user-note">
          Thay đổi được lưu bởi backend, sau đó tài khoản này được tải lại.
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
          "Đã gửi yêu cầu trạng thái, nhưng không thể tải lại người dùng.",
        );
      }
    } catch (error) {
      setActionMessage(
        getMutationMessage(error, "Không thể đổi trạng thái tài khoản."),
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
          "Đã gửi yêu cầu vai trò, nhưng không thể tải lại người dùng.",
        );
      }
    } catch (error) {
      setActionMessage(getMutationMessage(error, "Không thể đổi vai trò người dùng."));
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
        title="Không tìm thấy người dùng."
        message="Mã định danh người dùng không phải UUID hợp lệ."
        action={
          <Link className="button button--primary" to="/admin/users">
            Quay lại người dùng
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
        title="Không tìm thấy người dùng."
        message={userState.message}
        action={
          <Link className="button button--primary" to="/admin/users">
            Quay lại người dùng
          </Link>
        }
      />
    );
  }

  if (userState.status === "error" || userState.status === "network") {
    return (
      <AdminUserDetailState
        title="Người dùng không khả dụng."
        message={userState.message}
        alert
        action={
          <div className="admin-users-state__actions">
            <button type="button" className="button button--ghost" onClick={handleRetry}>
              Thử lại
            </button>
            <Link className="button button--primary" to="/admin/users">
              Quay lại người dùng
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
          Quay lại người dùng
        </Link>
        <div className="admin-user-detail__heading">
          <div>
            <p className="admin-users__kicker">Người dùng quản trị</p>
            <h1 id="admin-user-detail-title">{getUserTitle(user)}</h1>
          </div>
          <button
            type="button"
            className="button button--ghost"
            onClick={handleRetry}
            disabled={userState.status === "loading" || Boolean(mutatingAction)}
          >
            Làm mới
          </button>
        </div>
      </header>

      <div className="admin-user-detail__layout">
        <div className="admin-user-detail__main">
          <section className="admin-user-section" aria-labelledby="admin-user-account-title">
            <h2 id="admin-user-account-title">Thông tin tài khoản</h2>
            <UserFacts user={user} />
          </section>

          <section className="admin-user-section" aria-labelledby="admin-user-lifecycle-title">
            <h2 id="admin-user-lifecycle-title">Vai trò và trạng thái</h2>
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
