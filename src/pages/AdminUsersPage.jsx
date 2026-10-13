import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { getAdminUsers } from "../api/adminUserApi";
import "./AdminUsersPage.css";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const ROLES = ["USER", "ADMIN"];
const SORT_OPTIONS = [
  { value: "createdAt,desc", label: "Mới nhất" },
  { value: "createdAt,asc", label: "Cũ nhất" },
  { value: "email,asc", label: "Email A-Z" },
  { value: "fullName,asc", label: "Tên A-Z" },
  { value: "role,asc", label: "Vai trò A-Z" },
  { value: "active,desc", label: "Đang hoạt động trước" },
];

function getPositivePage(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function getAllowedPageSize(value) {
  const parsed = Number.parseInt(value, 10);

  if (PAGE_SIZE_OPTIONS.includes(parsed)) {
    return parsed;
  }

  return PAGE_SIZE_OPTIONS[0];
}

function getAllowedRole(value) {
  if (ROLES.includes(value)) {
    return value;
  }

  return "all";
}

function getAllowedActive(value) {
  if (value === "true" || value === "false") {
    return value;
  }

  return "all";
}

function getAllowedSort(value) {
  if (SORT_OPTIONS.some((option) => option.value === value)) {
    return value;
  }

  return SORT_OPTIONS[0].value;
}

function parseAdminUserQuery(searchParams) {
  return {
    active: getAllowedActive(searchParams.get("active")),
    keyword: (searchParams.get("keyword") || "").trim(),
    page: getPositivePage(searchParams.get("page")),
    role: getAllowedRole(searchParams.get("role")),
    size: getAllowedPageSize(searchParams.get("size")),
    sort: getAllowedSort(searchParams.get("sort")),
  };
}

function normalizeUserPage(response, fallbackPage, fallbackSize) {
  return {
    content: Array.isArray(response?.content) ? response.content : [],
    page: Number.isInteger(response?.page) ? response.page : fallbackPage,
    size: Number.isInteger(response?.size) ? response.size : fallbackSize,
    totalElements: Number.isFinite(response?.totalElements)
      ? response.totalElements
      : 0,
    totalPages: Number.isInteger(response?.totalPages) ? response.totalPages : 0,
    first: Boolean(response?.first),
    last: Boolean(response?.last),
    numberOfElements: Number.isInteger(response?.numberOfElements)
      ? response.numberOfElements
      : 0,
  };
}

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 1) {
    return [];
  }

  const pages = new Set([1, totalPages, currentPage]);

  if (currentPage > 1) {
    pages.add(currentPage - 1);
  }

  if (currentPage < totalPages) {
    pages.add(currentPage + 1);
  }

  return [...pages].sort((a, b) => a - b);
}

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

function getBooleanLabel(value) {
  if (value === true) {
    return "Có";
  }

  if (value === false) {
    return "Không";
  }

  return "Không khả dụng";
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

function getUserListErrorMessage(error) {
  if (error?.status === 401 || error?.status === 403) {
    return "Cần quyền quản trị. Hãy đăng nhập lại bằng tài khoản quản trị.";
  }

  if (error?.status === 400) {
    return "Bộ lọc người dùng không hợp lệ.";
  }

  if (error?.status >= 500) {
    return "Dịch vụ người dùng hiện không khả dụng.";
  }

  if (!error?.status) {
    return "Kết nối mạng thất bại. Hãy kiểm tra máy chủ API rồi thử lại.";
  }

  return "Không thể tải người dùng.";
}

function UserSkeletonRows() {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <tr className="admin-users-row" key={index}>
          <td>
            <span className="admin-users-skeleton admin-users-skeleton--title" />
            <span className="admin-users-skeleton admin-users-skeleton--meta" />
          </td>
          <td>
            <span className="admin-users-skeleton admin-users-skeleton--short" />
          </td>
          <td>
            <span className="admin-users-skeleton admin-users-skeleton--short" />
          </td>
          <td>
            <span className="admin-users-skeleton admin-users-skeleton--short" />
          </td>
          <td>
            <span className="admin-users-skeleton admin-users-skeleton--wide" />
          </td>
          <td>
            <span className="admin-users-skeleton admin-users-skeleton--action" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function Pagination({ currentPage, onPageChange, totalPages }) {
  const pages = getPaginationPages(currentPage, totalPages);

  if (!pages.length) {
    return null;
  }

  return (
    <nav className="admin-users-pagination" aria-label="Phân trang người dùng quản trị">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Trước
      </button>
      <div className="admin-users-pagination__pages">
        {pages.map((pageNumber, index) => {
          const previousPage = pages[index - 1];
          const needsGap = previousPage && pageNumber - previousPage > 1;

          return (
            <span className="admin-users-pagination__item" key={pageNumber}>
              {needsGap ? (
                <span className="admin-users-pagination__gap" aria-hidden="true">
                  ...
                </span>
              ) : null}
              <button
                type="button"
                className={
                  pageNumber === currentPage
                    ? "admin-users-pagination__page is-current"
                    : "admin-users-pagination__page"
                }
                aria-current={pageNumber === currentPage ? "page" : undefined}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </button>
            </span>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Sau
      </button>
    </nav>
  );
}

function UserRow({ user }) {
  const userPath = user?.id
    ? `/admin/users/${encodeURIComponent(user.id)}`
    : "/admin/users";

  return (
    <tr className="admin-users-row">
      <th scope="row" data-label="Người dùng">
        <Link className="admin-users-row__reference" to={userPath}>
          {user?.fullName || "Người dùng chưa có tên"}
        </Link>
        <span className="admin-users-row__meta">{user?.email || "Không có email"}</span>
      </th>
      <td data-label="Vai trò">
        <span
          className={`admin-users-status admin-users-status--${String(
            user?.role || "unknown",
          ).toLowerCase()}`}
        >
          {getRoleLabel(user?.role)}
        </span>
      </td>
      <td data-label="Trạng thái">
        <span
          className={`admin-users-status admin-users-status--${
            user?.active ? "active" : "inactive"
          }`}
        >
          {getStatusLabel(user?.active)}
        </span>
      </td>
      <td data-label="Đã xác thực">{getBooleanLabel(user?.emailVerified)}</td>
      <td data-label="Ngày tạo" className="admin-users-number">
        {getDateTimeLabel(user?.createdAt)}
      </td>
      <td data-label="Thao tác">
        <Link className="admin-users-text-link" to={userPath}>
          Mở
        </Link>
      </td>
    </tr>
  );
}

export default function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userQuery = useMemo(
    () => parseAdminUserQuery(searchParams),
    [searchParams],
  );
  const [usersState, setUsersState] = useState({
    status: "loading",
    data: null,
    message: "",
  });
  const [retryKey, setRetryKey] = useState(0);

  const backendQuery = useMemo(
    () => ({
      active:
        userQuery.active === "all" ? undefined : userQuery.active === "true",
      keyword: userQuery.keyword || undefined,
      page: userQuery.page - 1,
      role: userQuery.role === "all" ? undefined : userQuery.role,
      size: userQuery.size,
      sort: userQuery.sort,
    }),
    [
      userQuery.active,
      userQuery.keyword,
      userQuery.page,
      userQuery.role,
      userQuery.size,
      userQuery.sort,
    ],
  );

  const userData = usersState.data;
  const users = userData?.content || [];
  const currentPage = userData ? userData.page + 1 : userQuery.page;
  const resultStart = userData?.totalElements
    ? userData.page * userData.size + 1
    : 0;
  const resultEnd = userData?.totalElements
    ? userData.page * userData.size + userData.numberOfElements
    : 0;

  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      setUsersState((current) => ({
        status: "loading",
        data: current.data,
        message: "",
      }));

      try {
        const response = await getAdminUsers(backendQuery, {
          signal: controller.signal,
        });
        const data = normalizeUserPage(
          response,
          backendQuery.page,
          backendQuery.size,
        );

        if (controller.signal.aborted) {
          return;
        }

        setUsersState({
          status: data.content.length ? "success" : "empty",
          data,
          message: "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setUsersState({
          status: "error",
          data: null,
          message: getUserListErrorMessage(error),
        });
      }
    }

    loadUsers();

    return () => {
      controller.abort();
    };
  }, [backendQuery, retryKey]);

  useEffect(() => {
    const total = usersState.data?.totalPages || 0;

    if (total > 0 && userQuery.page > total) {
      const nextParams = new URLSearchParams(searchParams);

      if (total === 1) {
        nextParams.delete("page");
      } else {
        nextParams.set("page", String(total));
      }

      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams, userQuery.page, usersState.data]);

  function updateQuery(updates, { resetPage = true } = {}) {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "" || value === "all") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    if (resetPage) {
      nextParams.delete("page");
    }

    if (nextParams.get("size") === String(PAGE_SIZE_OPTIONS[0])) {
      nextParams.delete("size");
    }

    if (nextParams.get("sort") === SORT_OPTIONS[0].value) {
      nextParams.delete("sort");
    }

    setSearchParams(nextParams);
  }

  function handleFilterSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const keyword = String(formData.get("keyword") || "").trim();

    updateQuery({ keyword });
  }

  function handleResetFilters() {
    updateQuery({
      active: "all",
      keyword: "",
      role: "all",
      size: PAGE_SIZE_OPTIONS[0],
      sort: SORT_OPTIONS[0].value,
    });
  }

  function handlePageChange(pageNumber) {
    const nextPage = Math.min(
      Math.max(pageNumber, 1),
      userData?.totalPages || 1,
    );
    const nextParams = new URLSearchParams(searchParams);

    if (nextPage <= 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(nextPage));
    }

    setSearchParams(nextParams);
  }

  function handleRetry() {
    setRetryKey((key) => key + 1);
  }

  return (
    <section className="admin-users" aria-labelledby="admin-users-title">
      <header className="admin-users__header">
        <div>
          <p className="admin-users__kicker">Quản lý người dùng</p>
          <h1 id="admin-users-title">Người dùng</h1>
        </div>
        <button
          type="button"
          className="button button--ghost"
          onClick={handleRetry}
          disabled={usersState.status === "loading"}
        >
          Làm mới
        </button>
      </header>

      <form
        className="admin-users-toolbar"
        aria-label="Điều khiển danh sách người dùng"
        onSubmit={handleFilterSubmit}
      >
        <div className="admin-users-control">
          <label htmlFor="admin-users-keyword">Từ khóa</label>
          <input
            id="admin-users-keyword"
            name="keyword"
            type="search"
            defaultValue={userQuery.keyword}
            key={userQuery.keyword}
            autoComplete="off"
            maxLength="100"
          />
        </div>

        <div className="admin-users-control">
          <label htmlFor="admin-users-role">Vai trò</label>
          <select
            id="admin-users-role"
            value={userQuery.role}
            onChange={(event) => updateQuery({ role: event.target.value })}
          >
            <option value="all">Tất cả vai trò</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {getRoleLabel(role)}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-users-control">
          <label htmlFor="admin-users-active">Trạng thái</label>
          <select
            id="admin-users-active"
            value={userQuery.active}
            onChange={(event) => updateQuery({ active: event.target.value })}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Ngừng hoạt động</option>
          </select>
        </div>

        <div className="admin-users-control">
          <label htmlFor="admin-users-sort">Sắp xếp</label>
          <select
            id="admin-users-sort"
            value={userQuery.sort}
            onChange={(event) => updateQuery({ sort: event.target.value })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-users-control">
          <label htmlFor="admin-users-size">Số dòng</label>
          <select
            id="admin-users-size"
            value={userQuery.size}
            onChange={(event) => updateQuery({ size: event.target.value })}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-users-toolbar__actions">
          <button type="submit" className="button button--primary">
            Áp dụng
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={handleResetFilters}
          >
            Đặt lại
          </button>
        </div>
      </form>

      <section className="admin-users-list" aria-labelledby="admin-users-list-title">
        <div className="admin-users-list__header">
          <div>
            <h2 id="admin-users-list-title">Danh sách người dùng</h2>
            {usersState.status === "success" ? (
              <p>
                Hiển thị {resultStart}-{resultEnd} trong tổng số {userData.totalElements} người dùng.
              </p>
            ) : null}
            {usersState.status === "loading" ? (
              <p aria-live="polite">Đang tải người dùng...</p>
            ) : null}
          </div>
        </div>

        {usersState.status === "error" ? (
          <div className="admin-users-state" role="alert">
            <h2>Người dùng không khả dụng.</h2>
            <p>{usersState.message}</p>
            <button type="button" className="button button--ghost" onClick={handleRetry}>
              Thử lại
            </button>
          </div>
        ) : null}

        {usersState.status === "empty" ? (
          <div className="admin-users-state">
            <h2>Không có người dùng.</h2>
            <p>Điều chỉnh bộ lọc từ khóa, vai trò hoặc trạng thái.</p>
          </div>
        ) : null}

        {usersState.status === "loading" || usersState.status === "success" ? (
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <caption className="sr-only">Danh sách người dùng quản trị</caption>
              <thead>
                <tr>
                  <th scope="col">Người dùng</th>
                  <th scope="col">Vai trò</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Đã xác thực</th>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              {usersState.status === "loading" ? (
                <UserSkeletonRows />
              ) : (
                <tbody>
                  {users.map((user) => (
                    <UserRow key={user.id || user.email} user={user} />
                  ))}
                </tbody>
              )}
            </table>
          </div>
        ) : null}

        {usersState.status === "success" ? (
          <Pagination
            currentPage={currentPage}
            totalPages={userData.totalPages}
            onPageChange={handlePageChange}
          />
        ) : null}
      </section>
    </section>
  );
}
