import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { getAdminOrders } from "../api/adminOrderApi";
import { formatCurrency } from "../utils/formatCurrency";
import "./AdminOrdersPage.css";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "SHIPPING",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
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

function getAllowedStatus(value) {
  if (ORDER_STATUSES.includes(value)) {
    return value;
  }

  return "all";
}

function parseAdminOrderQuery(searchParams) {
  return {
    orderCode: (searchParams.get("orderCode") || "").trim(),
    page: getPositivePage(searchParams.get("page")),
    size: getAllowedPageSize(searchParams.get("size")),
    status: getAllowedStatus(searchParams.get("status")),
  };
}

function normalizeOrderPage(response, fallbackPage, fallbackSize) {
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

function getOrderReference(order) {
  return order?.orderCode || order?.id || "Order";
}

function getStatusLabel(status) {
  return status ? status.replaceAll("_", " ") : "Unavailable";
}

function getOrderListErrorMessage(error) {
  if (error?.status === 401 || error?.status === 403) {
    return "Admin access is required. Sign in again with an admin account.";
  }

  if (error?.status === 400) {
    return error.message || "Order filters were rejected by the backend.";
  }

  if (error?.status >= 500) {
    return "The order service is unavailable right now.";
  }

  if (!error?.status) {
    return "Network connection failed. Check the API server and try again.";
  }

  return "Orders could not be loaded.";
}

function OrderSkeletonRows() {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: 7 }).map((_, index) => (
        <tr className="admin-orders-row" key={index}>
          <td>
            <span className="admin-orders-skeleton admin-orders-skeleton--title" />
            <span className="admin-orders-skeleton admin-orders-skeleton--meta" />
          </td>
          <td>
            <span className="admin-orders-skeleton admin-orders-skeleton--short" />
          </td>
          <td>
            <span className="admin-orders-skeleton admin-orders-skeleton--short" />
          </td>
          <td>
            <span className="admin-orders-skeleton admin-orders-skeleton--short" />
          </td>
          <td>
            <span className="admin-orders-skeleton admin-orders-skeleton--wide" />
          </td>
          <td>
            <span className="admin-orders-skeleton admin-orders-skeleton--action" />
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
    <nav className="admin-orders-pagination" aria-label="Admin orders pagination">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </button>
      <div className="admin-orders-pagination__pages">
        {pages.map((pageNumber, index) => {
          const previousPage = pages[index - 1];
          const needsGap = previousPage && pageNumber - previousPage > 1;

          return (
            <span className="admin-orders-pagination__item" key={pageNumber}>
              {needsGap ? (
                <span className="admin-orders-pagination__gap" aria-hidden="true">
                  ...
                </span>
              ) : null}
              <button
                type="button"
                className={
                  pageNumber === currentPage
                    ? "admin-orders-pagination__page is-current"
                    : "admin-orders-pagination__page"
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

function OrderRow({ order }) {
  const orderPath = order?.id
    ? `/admin/orders/${encodeURIComponent(order.id)}`
    : "/admin/orders";

  return (
    <tr className="admin-orders-row">
      <th scope="row" data-label="Order">
        <Link className="admin-orders-row__reference" to={orderPath}>
          {getOrderReference(order)}
        </Link>
        <span className="admin-orders-row__meta">{order?.id || "No order id"}</span>
      </th>
      <td data-label="Status">
        <span
          className={`admin-orders-status admin-orders-status--${String(
            order?.status || "unknown",
          ).toLowerCase()}`}
        >
          {getStatusLabel(order?.status)}
        </span>
      </td>
      <td data-label="Items" className="admin-orders-number">
        {Number.isFinite(Number(order?.totalItems)) ? order.totalItems : "0"}
      </td>
      <td data-label="Total" className="admin-orders-number">
        {formatCurrency(order?.totalAmount) || "Unavailable"}
      </td>
      <td data-label="Created" className="admin-orders-number">
        {getDateTimeLabel(order?.createdAt)}
      </td>
      <td data-label="Actions">
        <Link className="admin-orders-text-link" to={orderPath}>
          Open
        </Link>
      </td>
    </tr>
  );
}

export default function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderQuery = useMemo(
    () => parseAdminOrderQuery(searchParams),
    [searchParams],
  );
  const [ordersState, setOrdersState] = useState({
    status: "loading",
    data: null,
    message: "",
  });
  const [retryKey, setRetryKey] = useState(0);

  const backendQuery = useMemo(
    () => ({
      orderCode: orderQuery.orderCode || undefined,
      page: orderQuery.page - 1,
      size: orderQuery.size,
      status: orderQuery.status === "all" ? undefined : orderQuery.status,
    }),
    [orderQuery.orderCode, orderQuery.page, orderQuery.size, orderQuery.status],
  );

  const orderData = ordersState.data;
  const orders = orderData?.content || [];
  const currentPage = orderData ? orderData.page + 1 : orderQuery.page;
  const resultStart = orderData?.totalElements
    ? orderData.page * orderData.size + 1
    : 0;
  const resultEnd = orderData?.totalElements
    ? orderData.page * orderData.size + orderData.numberOfElements
    : 0;

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      setOrdersState((current) => ({
        status: "loading",
        data: current.data,
        message: "",
      }));

      try {
        const response = await getAdminOrders(backendQuery, {
          signal: controller.signal,
        });
        const data = normalizeOrderPage(
          response,
          backendQuery.page,
          backendQuery.size,
        );

        if (controller.signal.aborted) {
          return;
        }

        setOrdersState({
          status: data.content.length ? "success" : "empty",
          data,
          message: "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setOrdersState({
          status: "error",
          data: null,
          message: getOrderListErrorMessage(error),
        });
      }
    }

    loadOrders();

    return () => {
      controller.abort();
    };
  }, [backendQuery, retryKey]);

  useEffect(() => {
    const total = ordersState.data?.totalPages || 0;

    if (total > 0 && orderQuery.page > total) {
      const nextParams = new URLSearchParams(searchParams);

      if (total === 1) {
        nextParams.delete("page");
      } else {
        nextParams.set("page", String(total));
      }

      setSearchParams(nextParams, { replace: true });
    }
  }, [orderQuery.page, ordersState.data, searchParams, setSearchParams]);

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

    setSearchParams(nextParams);
  }

  function handleFilterSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const orderCode = String(formData.get("orderCode") || "").trim();

    updateQuery({ orderCode });
  }

  function handleResetFilters() {
    updateQuery({
      orderCode: "",
      status: "all",
      size: PAGE_SIZE_OPTIONS[0],
    });
  }

  function handlePageChange(pageNumber) {
    const nextPage = Math.min(
      Math.max(pageNumber, 1),
      orderData?.totalPages || 1,
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
    <section className="admin-orders" aria-labelledby="admin-orders-title">
      <header className="admin-orders__header">
        <div>
          <p className="admin-orders__kicker">Admin orders</p>
          <h1 id="admin-orders-title">Orders</h1>
        </div>
        <button
          type="button"
          className="button button--ghost"
          onClick={handleRetry}
          disabled={ordersState.status === "loading"}
        >
          Refresh
        </button>
      </header>

      <form
        className="admin-orders-toolbar"
        aria-label="Order list controls"
        onSubmit={handleFilterSubmit}
      >
        <div className="admin-orders-control">
          <label htmlFor="admin-orders-code">Order code</label>
          <input
            id="admin-orders-code"
            name="orderCode"
            type="search"
            defaultValue={orderQuery.orderCode}
            key={orderQuery.orderCode}
            autoComplete="off"
          />
        </div>

        <div className="admin-orders-control">
          <label htmlFor="admin-orders-status">Status</label>
          <select
            id="admin-orders-status"
            value={orderQuery.status}
            onChange={(event) => updateQuery({ status: event.target.value })}
          >
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-orders-control">
          <label htmlFor="admin-orders-size">Rows</label>
          <select
            id="admin-orders-size"
            value={orderQuery.size}
            onChange={(event) => updateQuery({ size: event.target.value })}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-orders-toolbar__actions">
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

      <section className="admin-orders-list" aria-labelledby="admin-orders-list-title">
        <div className="admin-orders-list__header">
          <div>
            <h2 id="admin-orders-list-title">Order list</h2>
            {ordersState.status === "success" ? (
              <p>
                Showing {resultStart}-{resultEnd} of {orderData.totalElements}
                {" "}orders. Newest first.
              </p>
            ) : null}
            {ordersState.status === "loading" ? (
              <p aria-live="polite">Loading orders...</p>
            ) : null}
          </div>
        </div>

        {ordersState.status === "error" ? (
          <div className="admin-orders-state" role="alert">
            <h2>Orders unavailable.</h2>
            <p>{ordersState.message}</p>
            <button type="button" className="button button--ghost" onClick={handleRetry}>
              Retry
            </button>
          </div>
        ) : null}

        {ordersState.status === "empty" ? (
          <div className="admin-orders-state">
            <h2>No orders returned.</h2>
            <p>Adjust the supported status or order-code filters.</p>
          </div>
        ) : null}

        {ordersState.status === "loading" || ordersState.status === "success" ? (
          <div className="admin-orders-table-wrap">
            <table className="admin-orders-table">
              <caption className="sr-only">Admin order records</caption>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Status</th>
                  <th scope="col">Items</th>
                  <th scope="col">Total</th>
                  <th scope="col">Created</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              {ordersState.status === "loading" ? (
                <OrderSkeletonRows />
              ) : (
                <tbody>
                  {orders.map((order) => (
                    <OrderRow key={order.id || order.orderCode} order={order} />
                  ))}
                </tbody>
              )}
            </table>
          </div>
        ) : null}

        {ordersState.status === "success" ? (
          <Pagination
            currentPage={currentPage}
            totalPages={orderData.totalPages}
            onPageChange={handlePageChange}
          />
        ) : null}
      </section>
    </section>
  );
}
