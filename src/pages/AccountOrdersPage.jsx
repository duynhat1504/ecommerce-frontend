import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { getMyOrders } from "../api/orderApi";
import AccountNavigation from "../components/Account/AccountNavigation";
import { formatCurrency } from "../utils/formatCurrency";
import "./AccountOrdersPage.css";

const PAGE_SIZE = 10;

function getPositivePage(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
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

function formatOrderDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatItemCount(count) {
  const itemCount = Number(count);

  if (!Number.isFinite(itemCount)) {
    return "0 items";
  }

  return `${itemCount} ${itemCount === 1 ? "item" : "items"}`;
}

function getOrderReference(order) {
  return order?.orderCode || order?.id || "Order";
}

function getOrdersErrorMessage(error) {
  if (error?.status === 401 || error?.status === 403) {
    return "Sign in again to view your orders.";
  }

  if (error?.status >= 500) {
    return "Order history is unavailable right now. Please try again later.";
  }

  return "Order history could not be loaded right now.";
}

function AccountOrdersState({ title, message, action, alert = false }) {
  return (
    <section
      className="account-orders-state"
      aria-labelledby="account-orders-state-title"
      role={alert ? "alert" : undefined}
    >
      <p className="account-orders-state__kicker">Account</p>
      <h1 id="account-orders-state-title">{title}</h1>
      <p>{message}</p>
      {action}
    </section>
  );
}

function AccountOrdersSkeleton() {
  return (
    <div className="account-orders-list" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="account-order-row account-order-row--loading" key={index}>
          <span className="account-orders-skeleton account-orders-skeleton--reference" />
          <span className="account-orders-skeleton account-orders-skeleton--date" />
          <span className="account-orders-skeleton account-orders-skeleton--status" />
          <span className="account-orders-skeleton account-orders-skeleton--items" />
          <span className="account-orders-skeleton account-orders-skeleton--total" />
        </div>
      ))}
    </div>
  );
}

function AccountOrdersPagination({ currentPage, totalPages, onPageChange }) {
  const visiblePages = getPaginationPages(currentPage, totalPages);

  if (!visiblePages.length) {
    return null;
  }

  return (
    <nav className="account-orders-pagination" aria-label="Order history pagination">
      <button
        type="button"
        className="account-orders-pagination__control"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </button>

      <div className="account-orders-pagination__pages">
        {visiblePages.map((pageNumber, index) => {
          const previousPage = visiblePages[index - 1];
          const needsGap = previousPage && pageNumber - previousPage > 1;

          return (
            <span className="account-orders-pagination__item" key={pageNumber}>
              {needsGap ? (
                <span className="account-orders-pagination__gap" aria-hidden="true">
                  ...
                </span>
              ) : null}
              <button
                type="button"
                className={
                  pageNumber === currentPage
                    ? "account-orders-pagination__page is-current"
                    : "account-orders-pagination__page"
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
        className="account-orders-pagination__control"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </button>
    </nav>
  );
}

function AccountOrderRow({ order }) {
  const orderPath = order?.id
    ? `/account/orders/${encodeURIComponent(order.id)}`
    : "/account/orders";

  return (
    <article className="account-order-row" aria-label={getOrderReference(order)}>
      <div className="account-order-row__reference">
        <span>Order</span>
        <Link to={orderPath}>{getOrderReference(order)}</Link>
      </div>
      <div>
        <span>Date</span>
        <strong>{formatOrderDate(order?.createdAt)}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong className="account-order-status">{order?.status || "Unavailable"}</strong>
      </div>
      <div>
        <span>Items</span>
        <strong>{formatItemCount(order?.totalItems)}</strong>
      </div>
      <div className="account-order-row__total">
        <span>Total</span>
        <strong>{formatCurrency(order?.totalAmount) || "Unavailable"}</strong>
      </div>
    </article>
  );
}

export default function AccountOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = useMemo(
    () => getPositivePage(searchParams.get("page")),
    [searchParams],
  );
  const [ordersState, setOrdersState] = useState({
    status: "loading",
    data: null,
    message: "",
  });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      setOrdersState({
        status: "loading",
        data: null,
        message: "",
      });

      try {
        const response = await getMyOrders(
          {
            page: currentPage - 1,
            size: PAGE_SIZE,
          },
          {
            signal: controller.signal,
          },
        );
        const data = normalizeOrderPage(response, currentPage - 1, PAGE_SIZE);

        setOrdersState({
          status: "success",
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
          message: getOrdersErrorMessage(error),
        });
      }
    }

    loadOrders();

    return () => {
      controller.abort();
    };
  }, [currentPage, retryKey]);

  useEffect(() => {
    const totalPages = ordersState.data?.totalPages || 0;

    if (ordersState.status === "success" && totalPages > 0 && currentPage > totalPages) {
      const nextParams = new URLSearchParams(searchParams);

      nextParams.set("page", String(totalPages));
      setSearchParams(nextParams, { replace: true });
    }
  }, [currentPage, ordersState.data, ordersState.status, searchParams, setSearchParams]);

  function handlePageChange(pageNumber) {
    const totalPages = ordersState.data?.totalPages || 1;
    const nextPage = Math.min(Math.max(pageNumber, 1), totalPages);
    const nextParams = new URLSearchParams(searchParams);

    if (nextPage <= 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(nextPage));
    }

    setSearchParams(nextParams);
  }

  const data = ordersState.data;
  const orders = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const resultStart = data?.totalElements
    ? data.page * data.size + 1
    : 0;
  const resultEnd = data?.totalElements
    ? data.page * data.size + data.numberOfElements
    : 0;
  const displayedPage = data ? data.page + 1 : currentPage;

  if (ordersState.status === "error") {
    return (
      <AccountOrdersState
        title="Orders unavailable."
        message={ordersState.message}
        alert
        action={
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setRetryKey((key) => key + 1)}
          >
            Retry
          </button>
        }
      />
    );
  }

  return (
    <section className="account-orders-page" aria-labelledby="account-orders-title">
      <div className="account-orders-page__header">
        <p className="account-orders-page__kicker">Account</p>
        <h1 id="account-orders-title">Orders</h1>
        <p>Review orders placed from this account.</p>
        <AccountNavigation />
      </div>

      <div className="account-orders-panel">
        <div className="account-orders-panel__header">
          <h2>Order history</h2>
          {ordersState.status === "success" && data?.totalElements ? (
            <p>
              Showing {resultStart}-{resultEnd} of {data.totalElements}
            </p>
          ) : null}
        </div>

        {ordersState.status === "loading" ? (
          <AccountOrdersSkeleton />
        ) : null}

        {ordersState.status === "success" && orders.length === 0 ? (
          <div className="account-orders-empty">
            <h2>No orders yet.</h2>
            <p>Your completed checkouts will appear here.</p>
            <Link className="button button--primary" to="/products">
              Browse products
            </Link>
          </div>
        ) : null}

        {ordersState.status === "success" && orders.length > 0 ? (
          <>
            <div className="account-orders-list">
              <div className="account-order-row account-order-row--head" aria-hidden="true">
                <span>Reference</span>
                <span>Date</span>
                <span>Status</span>
                <span>Items</span>
                <span>Total</span>
              </div>
              {orders.map((order) => (
                <AccountOrderRow key={order.id || order.orderCode} order={order} />
              ))}
            </div>

            <AccountOrdersPagination
              currentPage={displayedPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
