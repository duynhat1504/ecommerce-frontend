import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { getAdminUsers } from "../api/adminUserApi";
import "./AdminUsersPage.css";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const ROLES = ["USER", "ADMIN"];
const SORT_OPTIONS = [
  { value: "createdAt,desc", label: "Newest first" },
  { value: "createdAt,asc", label: "Oldest first" },
  { value: "email,asc", label: "Email A-Z" },
  { value: "fullName,asc", label: "Name A-Z" },
  { value: "role,asc", label: "Role A-Z" },
  { value: "active,desc", label: "Active first" },
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

function getBooleanLabel(value) {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return "No";
  }

  return "Unavailable";
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

function getUserListErrorMessage(error) {
  if (error?.status === 401 || error?.status === 403) {
    return "Admin access is required. Sign in again with an admin account.";
  }

  if (error?.status === 400) {
    return error.message || "User filters were rejected by the backend.";
  }

  if (error?.status >= 500) {
    return "The user service is unavailable right now.";
  }

  if (!error?.status) {
    return "Network connection failed. Check the API server and try again.";
  }

  return "Users could not be loaded.";
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
    <nav className="admin-users-pagination" aria-label="Admin users pagination">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
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
        Next
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
      <th scope="row" data-label="User">
        <Link className="admin-users-row__reference" to={userPath}>
          {user?.fullName || "Unnamed user"}
        </Link>
        <span className="admin-users-row__meta">{user?.email || "No email"}</span>
      </th>
      <td data-label="Role">
        <span
          className={`admin-users-status admin-users-status--${String(
            user?.role || "unknown",
          ).toLowerCase()}`}
        >
          {getRoleLabel(user?.role)}
        </span>
      </td>
      <td data-label="Status">
        <span
          className={`admin-users-status admin-users-status--${
            user?.active ? "active" : "inactive"
          }`}
        >
          {getStatusLabel(user?.active)}
        </span>
      </td>
      <td data-label="Verified">{getBooleanLabel(user?.emailVerified)}</td>
      <td data-label="Created" className="admin-users-number">
        {getDateTimeLabel(user?.createdAt)}
      </td>
      <td data-label="Actions">
        <Link className="admin-users-text-link" to={userPath}>
          Open
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
          <p className="admin-users__kicker">Admin users</p>
          <h1 id="admin-users-title">Users</h1>
        </div>
        <button
          type="button"
          className="button button--ghost"
          onClick={handleRetry}
          disabled={usersState.status === "loading"}
        >
          Refresh
        </button>
      </header>

      <form
        className="admin-users-toolbar"
        aria-label="User list controls"
        onSubmit={handleFilterSubmit}
      >
        <div className="admin-users-control">
          <label htmlFor="admin-users-keyword">Keyword</label>
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
          <label htmlFor="admin-users-role">Role</label>
          <select
            id="admin-users-role"
            value={userQuery.role}
            onChange={(event) => updateQuery({ role: event.target.value })}
          >
            <option value="all">All roles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {getRoleLabel(role)}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-users-control">
          <label htmlFor="admin-users-active">Status</label>
          <select
            id="admin-users-active"
            value={userQuery.active}
            onChange={(event) => updateQuery({ active: event.target.value })}
          >
            <option value="all">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div className="admin-users-control">
          <label htmlFor="admin-users-sort">Sort</label>
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
          <label htmlFor="admin-users-size">Rows</label>
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
            Apply
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={handleResetFilters}
          >
            Reset
          </button>
        </div>
      </form>

      <section className="admin-users-list" aria-labelledby="admin-users-list-title">
        <div className="admin-users-list__header">
          <div>
            <h2 id="admin-users-list-title">User list</h2>
            {usersState.status === "success" ? (
              <p>
                Showing {resultStart}-{resultEnd} of {userData.totalElements}
                {" "}users.
              </p>
            ) : null}
            {usersState.status === "loading" ? (
              <p aria-live="polite">Loading users...</p>
            ) : null}
          </div>
        </div>

        {usersState.status === "error" ? (
          <div className="admin-users-state" role="alert">
            <h2>Users unavailable.</h2>
            <p>{usersState.message}</p>
            <button type="button" className="button button--ghost" onClick={handleRetry}>
              Retry
            </button>
          </div>
        ) : null}

        {usersState.status === "empty" ? (
          <div className="admin-users-state">
            <h2>No users returned.</h2>
            <p>Adjust the supported keyword, role, or status filters.</p>
          </div>
        ) : null}

        {usersState.status === "loading" || usersState.status === "success" ? (
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <caption className="sr-only">Admin user records</caption>
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Verified</th>
                  <th scope="col">Created</th>
                  <th scope="col">Actions</th>
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
