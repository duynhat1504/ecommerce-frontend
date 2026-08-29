import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  adjustProductStock,
  getProductInventoryTransactions,
} from "../api/adminInventoryApi";
import { getAdminProductById, getAdminProducts } from "../api/adminProductApi";
import { getBackendFieldErrors } from "../utils/authFormUtils";
import "./AdminInventoryPage.css";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const TRANSACTION_SIZE_OPTIONS = [10, 20, 50, 100];

const PRODUCT_SORT_OPTIONS = [
  { label: "Stock low", value: "stock,asc" },
  { label: "Stock high", value: "stock,desc" },
  { label: "Updated recently", value: "updatedAt,desc" },
  { label: "Name A to Z", value: "name,asc" },
  { label: "Name Z to A", value: "name,desc" },
  { label: "Newest", value: "createdAt,desc" },
];

const PRODUCT_SORT_VALUES = PRODUCT_SORT_OPTIONS.map((option) => option.value);

const TRANSACTION_TYPES = [
  { label: "All types", value: "all" },
  { label: "Admin adjustment", value: "ADMIN_ADJUSTMENT" },
  { label: "Order created", value: "ORDER_CREATED" },
  { label: "Order cancelled", value: "ORDER_CANCELLED" },
  { label: "Order expired", value: "ORDER_EXPIRED" },
];

const TRANSACTION_TYPE_VALUES = TRANSACTION_TYPES.map((option) => option.value);

const EMPTY_ADJUSTMENT_FORM = {
  direction: "increase",
  quantity: "",
  reason: "",
};

function getPositivePage(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function getAllowedPageSize(value, options) {
  const parsed = Number.parseInt(value, 10);

  if (options.includes(parsed)) {
    return parsed;
  }

  return options[0];
}

function getAllowedProductSort(value) {
  if (PRODUCT_SORT_VALUES.includes(value)) {
    return value;
  }

  return PRODUCT_SORT_OPTIONS[0].value;
}

function getActiveFilter(value) {
  if (value === "true" || value === "false") {
    return value;
  }

  return "all";
}

function getTransactionType(value) {
  if (TRANSACTION_TYPE_VALUES.includes(value)) {
    return value;
  }

  return "all";
}

function getDateValue(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return value;
  }

  return "";
}

function parseInventoryQuery(searchParams) {
  return {
    active: getActiveFilter(searchParams.get("active")),
    page: getPositivePage(searchParams.get("page")),
    productId: searchParams.get("productId") || "",
    size: getAllowedPageSize(searchParams.get("size"), PAGE_SIZE_OPTIONS),
    sort: getAllowedProductSort(searchParams.get("sort")),
    transactionPage: getPositivePage(searchParams.get("txPage")),
    transactionSize: getAllowedPageSize(
      searchParams.get("txSize"),
      TRANSACTION_SIZE_OPTIONS,
    ),
    type: getTransactionType(searchParams.get("type")),
    fromDate: getDateValue(searchParams.get("fromDate")),
    toDate: getDateValue(searchParams.get("toDate")),
  };
}

function normalizePage(response, fallbackPage, fallbackSize) {
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
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getInventoryErrorMessage(error, fallback) {
  if (error?.status === 401 || error?.status === 403) {
    return "Admin access is required. Sign in again with an admin account.";
  }

  if (error?.status === 400 && error?.data?.errors) {
    return "Check the highlighted fields and try again.";
  }

  if (error?.status === 400) {
    return error.message || fallback;
  }

  if (error?.status === 404) {
    return error.message || "The product was not found.";
  }

  if (error?.status >= 500) {
    return "The inventory service is unavailable right now.";
  }

  if (!error?.status) {
    return "Network connection failed. Check the API server and try again.";
  }

  return fallback;
}

function getInventoryFieldErrors(error) {
  const backendErrors = getBackendFieldErrors(error);

  return Object.fromEntries(
    Object.entries(backendErrors).map(([field, message]) => [
      field,
      String(message || ""),
    ]),
  );
}

function getLifecycle(product) {
  if (product?.deletedAt) {
    return {
      label: "Deleted",
      className: "admin-inventory-status admin-inventory-status--deleted",
    };
  }

  if (product?.active) {
    return {
      label: "Active",
      className: "admin-inventory-status admin-inventory-status--active",
    };
  }

  return {
    label: "Inactive",
    className: "admin-inventory-status admin-inventory-status--inactive",
  };
}

function getTransactionLabel(type) {
  return (
    TRANSACTION_TYPES.find((option) => option.value === type)?.label || type || "Unknown"
  );
}

function ProductSkeletonRows() {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <tr className="admin-inventory-row" key={index}>
          <td>
            <span className="admin-inventory-skeleton admin-inventory-skeleton--title" />
            <span className="admin-inventory-skeleton admin-inventory-skeleton--meta" />
          </td>
          <td>
            <span className="admin-inventory-skeleton admin-inventory-skeleton--short" />
          </td>
          <td>
            <span className="admin-inventory-skeleton admin-inventory-skeleton--short" />
          </td>
          <td>
            <span className="admin-inventory-skeleton admin-inventory-skeleton--actions" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function TransactionSkeletonRows() {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <tr className="admin-inventory-row" key={index}>
          <td>
            <span className="admin-inventory-skeleton admin-inventory-skeleton--short" />
          </td>
          <td>
            <span className="admin-inventory-skeleton admin-inventory-skeleton--short" />
          </td>
          <td>
            <span className="admin-inventory-skeleton admin-inventory-skeleton--short" />
          </td>
          <td>
            <span className="admin-inventory-skeleton admin-inventory-skeleton--wide" />
          </td>
          <td>
            <span className="admin-inventory-skeleton admin-inventory-skeleton--title" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function Pagination({ currentPage, label, onPageChange, totalPages }) {
  const pages = getPaginationPages(currentPage, totalPages);

  if (!pages.length) {
    return null;
  }

  return (
    <nav className="admin-inventory-pagination" aria-label={label}>
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </button>
      <div className="admin-inventory-pagination__pages">
        {pages.map((pageNumber, index) => {
          const previousPage = pages[index - 1];
          const needsGap = previousPage && pageNumber - previousPage > 1;

          return (
            <span className="admin-inventory-pagination__item" key={pageNumber}>
              {needsGap ? (
                <span className="admin-inventory-pagination__gap" aria-hidden="true">
                  ...
                </span>
              ) : null}
              <button
                type="button"
                className={
                  pageNumber === currentPage
                    ? "admin-inventory-pagination__page is-current"
                    : "admin-inventory-pagination__page"
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

function ProductRow({ isSelected, onSelect, product }) {
  const lifecycle = getLifecycle(product);
  const stock = Number.isFinite(Number(product.stock)) ? product.stock : "Unknown";

  return (
    <tr
      className={
        product.deletedAt ? "admin-inventory-row is-deleted" : "admin-inventory-row"
      }
    >
      <th scope="row" data-label="Product">
        <span className="admin-inventory-row__name">
          {product.name || "Untitled product"}
        </span>
        <span className="admin-inventory-row__meta">
          {product.id || "No product id"}
        </span>
      </th>
      <td data-label="Stock" className="admin-inventory-number">
        {stock}
      </td>
      <td data-label="Status">
        <span className={lifecycle.className}>{lifecycle.label}</span>
      </td>
      <td data-label="Actions">
        <button
          type="button"
          className={
            isSelected
              ? "admin-inventory-text-button is-selected"
              : "admin-inventory-text-button"
          }
          onClick={() => onSelect(product)}
        >
          {isSelected ? "Selected" : "View history"}
        </button>
      </td>
    </tr>
  );
}

function TransactionRow({ transaction }) {
  const change = Number(transaction.quantityChange);
  const hasChange = Number.isFinite(change);
  const changeLabel = hasChange && change > 0 ? `+${change}` : transaction.quantityChange;

  return (
    <tr className="admin-inventory-row">
      <td data-label="Type">{getTransactionLabel(transaction.type)}</td>
      <td data-label="Change" className="admin-inventory-number">
        {hasChange ? changeLabel : "Unknown"}
      </td>
      <td data-label="Stock" className="admin-inventory-number">
        {transaction.stockBefore ?? "?"} to {transaction.stockAfter ?? "?"}
      </td>
      <td data-label="Reference">
        {transaction.orderCode ? (
          <span>{transaction.orderCode}</span>
        ) : (
          <span className="admin-inventory-row__muted">No order</span>
        )}
        {transaction.performedByEmail ? (
          <span className="admin-inventory-row__meta">
            {transaction.performedByEmail}
          </span>
        ) : null}
      </td>
      <td data-label="Reason">{transaction.reason || "No reason recorded"}</td>
      <td data-label="Created" className="admin-inventory-number">
        {getDateTimeLabel(transaction.createdAt) || "Unknown"}
      </td>
    </tr>
  );
}

function AdjustmentForm({
  fieldErrors,
  formError,
  formValues,
  isSubmitting,
  onChange,
  onSubmit,
  product,
}) {
  const cannotAdjust = Boolean(product?.deletedAt);
  const isDisabled = isSubmitting || !product?.id || cannotAdjust;

  return (
    <form className="admin-inventory-adjustment" onSubmit={onSubmit}>
      <div className="admin-inventory-adjustment__header">
        <div>
          <h2>Adjust stock</h2>
          <p>Saved values come from the backend response.</p>
        </div>
      </div>

      {formError ? (
        <p className="admin-inventory-alert" role="alert">
          {formError}
        </p>
      ) : null}

      {cannotAdjust ? (
        <p className="admin-inventory-alert" role="alert">
          Deleted products cannot be adjusted by the backend.
        </p>
      ) : null}

      <div className="admin-inventory-field">
        <label htmlFor="admin-inventory-direction">Direction</label>
        <select
          id="admin-inventory-direction"
          name="direction"
          value={formValues.direction}
          onChange={onChange}
          disabled={isDisabled}
        >
          <option value="increase">Increase</option>
          <option value="decrease">Decrease</option>
        </select>
      </div>

      <div className="admin-inventory-field">
        <label htmlFor="admin-inventory-quantity">Quantity</label>
        <input
          id="admin-inventory-quantity"
          name="quantity"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={formValues.quantity}
          onChange={onChange}
          disabled={isDisabled}
          aria-invalid={Boolean(fieldErrors.quantity)}
          aria-describedby={
            fieldErrors.quantity ? "admin-inventory-quantity-error" : undefined
          }
        />
        {fieldErrors.quantity ? (
          <p
            id="admin-inventory-quantity-error"
            className="admin-inventory-field__error"
            role="alert"
          >
            {fieldErrors.quantity}
          </p>
        ) : null}
      </div>

      <div className="admin-inventory-field">
        <label htmlFor="admin-inventory-reason">Reason</label>
        <textarea
          id="admin-inventory-reason"
          name="reason"
          rows="4"
          maxLength="255"
          value={formValues.reason}
          onChange={onChange}
          disabled={isDisabled}
          aria-invalid={Boolean(fieldErrors.reason)}
          aria-describedby={
            fieldErrors.reason ? "admin-inventory-reason-error" : undefined
          }
        />
        {fieldErrors.reason ? (
          <p
            id="admin-inventory-reason-error"
            className="admin-inventory-field__error"
            role="alert"
          >
            {fieldErrors.reason}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        className="button button--primary"
        disabled={isDisabled}
      >
        {isSubmitting ? "Saving..." : "Save adjustment"}
      </button>
    </form>
  );
}

export default function AdminInventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const inventoryQuery = useMemo(
    () => parseInventoryQuery(searchParams),
    [searchParams],
  );
  const [productsState, setProductsState] = useState({
    status: "loading",
    data: null,
    message: "",
  });
  const [selectedProductState, setSelectedProductState] = useState({
    status: "idle",
    data: null,
    message: "",
  });
  const [transactionsState, setTransactionsState] = useState({
    status: "idle",
    data: null,
    message: "",
  });
  const [retryKey, setRetryKey] = useState(0);
  const [transactionRetryKey, setTransactionRetryKey] = useState(0);
  const [adjustmentForm, setAdjustmentForm] = useState(EMPTY_ADJUSTMENT_FORM);
  const [adjustmentErrors, setAdjustmentErrors] = useState({});
  const [adjustmentError, setAdjustmentError] = useState("");
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  const productBackendQuery = useMemo(
    () => ({
      active:
        inventoryQuery.active === "all"
          ? undefined
          : inventoryQuery.active === "true",
      page: inventoryQuery.page - 1,
      size: inventoryQuery.size,
      sort: inventoryQuery.sort,
    }),
    [
      inventoryQuery.active,
      inventoryQuery.page,
      inventoryQuery.size,
      inventoryQuery.sort,
    ],
  );

  const transactionBackendQuery = useMemo(
    () => ({
      type: inventoryQuery.type === "all" ? undefined : inventoryQuery.type,
      fromDate: inventoryQuery.fromDate || undefined,
      toDate: inventoryQuery.toDate || undefined,
      page: inventoryQuery.transactionPage - 1,
      size: inventoryQuery.transactionSize,
    }),
    [
      inventoryQuery.fromDate,
      inventoryQuery.toDate,
      inventoryQuery.transactionPage,
      inventoryQuery.transactionSize,
      inventoryQuery.type,
    ],
  );

  const productData = productsState.data;
  const products = productData?.content || [];
  const selectedProductStatus = inventoryQuery.productId
    ? selectedProductState.status
    : "idle";
  const selectedProduct =
    inventoryQuery.productId &&
    selectedProductState.data?.id === inventoryQuery.productId
      ? selectedProductState.data
      : null;
  const transactionStatus = inventoryQuery.productId
    ? transactionsState.status
    : "idle";
  const transactionData = inventoryQuery.productId ? transactionsState.data : null;
  const transactions = transactionData?.content || [];
  const currentProductPage = productData
    ? productData.page + 1
    : inventoryQuery.page;
  const currentTransactionPage = transactionData
    ? transactionData.page + 1
    : inventoryQuery.transactionPage;
  const productResultStart = productData?.totalElements
    ? productData.page * productData.size + 1
    : 0;
  const productResultEnd = productData?.totalElements
    ? productData.page * productData.size + productData.numberOfElements
    : 0;
  const transactionResultStart = transactionData?.totalElements
    ? transactionData.page * transactionData.size + 1
    : 0;
  const transactionResultEnd = transactionData?.totalElements
    ? transactionData.page * transactionData.size + transactionData.numberOfElements
    : 0;

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setProductsState((current) => ({
        status: "loading",
        data: current.data,
        message: "",
      }));

      try {
        const response = await getAdminProducts(productBackendQuery, {
          signal: controller.signal,
        });
        const data = normalizePage(
          response,
          productBackendQuery.page,
          productBackendQuery.size,
        );

        if (controller.signal.aborted) {
          return;
        }

        setProductsState({
          status: data.content.length ? "success" : "empty",
          data,
          message: "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setProductsState({
          status: "error",
          data: null,
          message: getInventoryErrorMessage(
            error,
            "Inventory products could not be loaded.",
          ),
        });
      }
    }

    loadProducts();

    return () => {
      controller.abort();
    };
  }, [productBackendQuery, retryKey]);

  useEffect(() => {
    const total = productsState.data?.totalPages || 0;

    if (total > 0 && inventoryQuery.page > total) {
      const nextParams = new URLSearchParams(searchParams);

      if (total === 1) {
        nextParams.delete("page");
      } else {
        nextParams.set("page", String(total));
      }

      setSearchParams(nextParams, { replace: true });
    }
  }, [
    inventoryQuery.page,
    productsState.data,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    const productId = inventoryQuery.productId;

    if (!productId) {
      return;
    }

    const controller = new AbortController();

    async function loadSelectedProduct() {
      setSelectedProductState((current) => ({
        status: "loading",
        data: current.data?.id === productId ? current.data : null,
        message: "",
      }));

      try {
        const product = await getAdminProductById(productId, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        setSelectedProductState({
          status: "success",
          data: product,
          message: "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setSelectedProductState({
          status: "error",
          data: null,
          message: getInventoryErrorMessage(
            error,
            "Selected product could not be loaded.",
          ),
        });
      }
    }

    loadSelectedProduct();

    return () => {
      controller.abort();
    };
  }, [inventoryQuery.productId, retryKey]);

  useEffect(() => {
    const productId = inventoryQuery.productId;

    if (!productId) {
      return;
    }

    const controller = new AbortController();

    async function loadTransactions() {
      setTransactionsState((current) => ({
        status: "loading",
        data: current.data,
        message: "",
      }));

      try {
        const response = await getProductInventoryTransactions(
          productId,
          transactionBackendQuery,
          { signal: controller.signal },
        );
        const data = normalizePage(
          response,
          transactionBackendQuery.page,
          transactionBackendQuery.size,
        );

        if (controller.signal.aborted) {
          return;
        }

        setTransactionsState({
          status: data.content.length ? "success" : "empty",
          data,
          message: "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setTransactionsState({
          status: "error",
          data: null,
          message: getInventoryErrorMessage(
            error,
            "Inventory history could not be loaded.",
          ),
        });
      }
    }

    loadTransactions();

    return () => {
      controller.abort();
    };
  }, [
    inventoryQuery.productId,
    transactionBackendQuery,
    transactionRetryKey,
  ]);

  async function reloadAuthoritativeData() {
    const productResponse = await getAdminProducts(productBackendQuery);
    const productPage = normalizePage(
      productResponse,
      productBackendQuery.page,
      productBackendQuery.size,
    );

    setProductsState({
      status: productPage.content.length ? "success" : "empty",
      data: productPage,
      message: "",
    });

    if (inventoryQuery.productId) {
      const [product, transactionResponse] = await Promise.all([
        getAdminProductById(inventoryQuery.productId),
        getProductInventoryTransactions(
          inventoryQuery.productId,
          transactionBackendQuery,
        ),
      ]);
      const transactionPage = normalizePage(
        transactionResponse,
        transactionBackendQuery.page,
        transactionBackendQuery.size,
      );

      setSelectedProductState({
        status: "success",
        data: product,
        message: "",
      });
      setTransactionsState({
        status: transactionPage.content.length ? "success" : "empty",
        data: transactionPage,
        message: "",
      });
    }
  }

  function updateQuery(updates, { resetProductPage = true, resetTxPage = true } = {}) {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "" || value === "all") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    if (resetProductPage) {
      nextParams.delete("page");
    }

    if (resetTxPage) {
      nextParams.delete("txPage");
    }

    if (nextParams.get("sort") === PRODUCT_SORT_OPTIONS[0].value) {
      nextParams.delete("sort");
    }

    if (nextParams.get("size") === String(PAGE_SIZE_OPTIONS[0])) {
      nextParams.delete("size");
    }

    if (nextParams.get("txSize") === String(TRANSACTION_SIZE_OPTIONS[0])) {
      nextParams.delete("txSize");
    }

    setSearchParams(nextParams);
  }

  function handleProductPageChange(pageNumber) {
    const nextPage = Math.min(
      Math.max(pageNumber, 1),
      productData?.totalPages || 1,
    );
    const nextParams = new URLSearchParams(searchParams);

    if (nextPage <= 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(nextPage));
    }

    setSearchParams(nextParams);
  }

  function handleTransactionPageChange(pageNumber) {
    const nextPage = Math.min(
      Math.max(pageNumber, 1),
      transactionData?.totalPages || 1,
    );
    const nextParams = new URLSearchParams(searchParams);

    if (nextPage <= 1) {
      nextParams.delete("txPage");
    } else {
      nextParams.set("txPage", String(nextPage));
    }

    setSearchParams(nextParams);
  }

  function handleSelectProduct(product) {
    const nextParams = new URLSearchParams(searchParams);

    nextParams.set("productId", product.id);
    nextParams.delete("txPage");
    setSearchParams(nextParams);
    setAdjustmentForm(EMPTY_ADJUSTMENT_FORM);
    setAdjustmentErrors({});
    setAdjustmentError("");
  }

  function handleAdjustmentChange(event) {
    const { name, value } = event.target;

    setAdjustmentForm((current) => ({
      ...current,
      [name]: value,
    }));
    setAdjustmentErrors((current) => ({
      ...current,
      [name]: "",
    }));
    setAdjustmentError("");
  }

  async function handleAdjustmentSubmit(event) {
    event.preventDefault();

    if (isSubmittingAdjustment || !selectedProduct?.id || selectedProduct.deletedAt) {
      return;
    }

    setIsSubmittingAdjustment(true);
    setAdjustmentErrors({});
    setAdjustmentError("");

    try {
      const amount = Number.parseInt(adjustmentForm.quantity, 10);
      const quantity =
        adjustmentForm.direction === "decrease" ? -Math.abs(amount) : Math.abs(amount);

      await adjustProductStock(selectedProduct.id, {
        quantity,
        reason: adjustmentForm.reason,
      });
      await reloadAuthoritativeData();
      setAdjustmentForm(EMPTY_ADJUSTMENT_FORM);
    } catch (error) {
      setAdjustmentErrors(getInventoryFieldErrors(error));
      setAdjustmentError(
        getInventoryErrorMessage(error, "Stock adjustment could not be saved."),
      );
      await reloadAuthoritativeData().catch(() => {});
    } finally {
      setIsSubmittingAdjustment(false);
    }
  }

  function handleRetry() {
    setRetryKey((key) => key + 1);
  }

  function handleTransactionRetry() {
    setTransactionRetryKey((key) => key + 1);
  }

  return (
    <section className="admin-inventory" aria-labelledby="admin-inventory-title">
      <header className="admin-inventory__header">
        <div>
          <p className="admin-inventory__kicker">Admin inventory</p>
          <h1 id="admin-inventory-title">Inventory</h1>
        </div>
        <button
          type="button"
          className="button button--ghost"
          onClick={handleRetry}
          disabled={productsState.status === "loading"}
        >
          Refresh
        </button>
      </header>

      <section className="admin-inventory-toolbar" aria-label="Inventory list controls">
        <div className="admin-inventory-control">
          <label htmlFor="admin-inventory-active-filter">Product status</label>
          <select
            id="admin-inventory-active-filter"
            value={inventoryQuery.active}
            onChange={(event) => updateQuery({ active: event.target.value })}
          >
            <option value="all">All products</option>
            <option value="true">Active flag only</option>
            <option value="false">Inactive flag only</option>
          </select>
        </div>

        <div className="admin-inventory-control">
          <label htmlFor="admin-inventory-sort">Product sort</label>
          <select
            id="admin-inventory-sort"
            value={inventoryQuery.sort}
            onChange={(event) => updateQuery({ sort: event.target.value })}
          >
            {PRODUCT_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-inventory-control">
          <label htmlFor="admin-inventory-page-size">Product rows</label>
          <select
            id="admin-inventory-page-size"
            value={inventoryQuery.size}
            onChange={(event) => updateQuery({ size: event.target.value })}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="admin-inventory-layout">
        <section
          className="admin-inventory-list"
          aria-labelledby="admin-inventory-products-title"
        >
          <div className="admin-inventory-list__header">
            <div>
              <h2 id="admin-inventory-products-title">Stock list</h2>
              {productsState.status === "success" ? (
                <p>
                  Showing {productResultStart}-{productResultEnd} of{" "}
                  {productData.totalElements} products
                </p>
              ) : null}
              {productsState.status === "loading" ? (
                <p aria-live="polite">Loading products...</p>
              ) : null}
            </div>
          </div>

          {productsState.status === "error" ? (
            <div className="admin-inventory-state" role="alert">
              <h2>Inventory products unavailable.</h2>
              <p>{productsState.message}</p>
              <button type="button" className="button button--ghost" onClick={handleRetry}>
                Retry
              </button>
            </div>
          ) : null}

          {productsState.status === "empty" ? (
            <div className="admin-inventory-state">
              <h2>No products returned.</h2>
              <p>Adjust the status filter before reviewing inventory history.</p>
            </div>
          ) : null}

          {productsState.status === "loading" ||
          productsState.status === "success" ? (
            <div className="admin-inventory-table-wrap">
              <table className="admin-inventory-table">
                <caption className="sr-only">Admin product stock records</caption>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Stock</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                {productsState.status === "loading" ? (
                  <ProductSkeletonRows />
                ) : (
                  <tbody>
                    {products.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        isSelected={product.id === inventoryQuery.productId}
                        onSelect={handleSelectProduct}
                      />
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          ) : null}

          {productsState.status === "success" ? (
            <Pagination
              currentPage={currentProductPage}
              totalPages={productData.totalPages}
              label="Inventory products pagination"
              onPageChange={handleProductPageChange}
            />
          ) : null}
        </section>

        <aside className="admin-inventory-panel" aria-label="Inventory history">
          <section className="admin-inventory-detail">
            <div className="admin-inventory-detail__header">
              <div>
                <h2>Product history</h2>
                {selectedProductStatus === "loading" ? (
                  <p aria-live="polite">Loading selected product...</p>
                ) : null}
                {selectedProduct ? (
                  <p>{selectedProduct.name || "Untitled product"}</p>
                ) : null}
              </div>
              {selectedProduct ? (
                <span className="admin-inventory-number">
                  Stock {selectedProduct.stock ?? "Unknown"}
                </span>
              ) : null}
            </div>

            {!inventoryQuery.productId ? (
              <div className="admin-inventory-state">
                <h2>Select a product.</h2>
                <p>Choose a stock row to inspect backend inventory history.</p>
              </div>
            ) : null}

            {selectedProductStatus === "error" ? (
              <div className="admin-inventory-state" role="alert">
                <h2>Product unavailable.</h2>
                <p>{selectedProductState.message}</p>
              </div>
            ) : null}

            {inventoryQuery.productId ? (
              <section
                className="admin-inventory-history-toolbar"
                aria-label="Inventory history controls"
              >
                <div className="admin-inventory-control">
                  <label htmlFor="admin-inventory-type">Type</label>
                  <select
                    id="admin-inventory-type"
                    value={inventoryQuery.type}
                    onChange={(event) =>
                      updateQuery(
                        { type: event.target.value },
                        { resetProductPage: false },
                      )
                    }
                  >
                    {TRANSACTION_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-inventory-control">
                  <label htmlFor="admin-inventory-from-date">From date</label>
                  <input
                    id="admin-inventory-from-date"
                    type="date"
                    value={inventoryQuery.fromDate}
                    onChange={(event) =>
                      updateQuery(
                        { fromDate: event.target.value },
                        { resetProductPage: false },
                      )
                    }
                  />
                </div>

                <div className="admin-inventory-control">
                  <label htmlFor="admin-inventory-to-date">To date</label>
                  <input
                    id="admin-inventory-to-date"
                    type="date"
                    value={inventoryQuery.toDate}
                    onChange={(event) =>
                      updateQuery(
                        { toDate: event.target.value },
                        { resetProductPage: false },
                      )
                    }
                  />
                </div>

                <div className="admin-inventory-control">
                  <label htmlFor="admin-inventory-tx-size">History rows</label>
                  <select
                    id="admin-inventory-tx-size"
                    value={inventoryQuery.transactionSize}
                    onChange={(event) =>
                      updateQuery(
                        { txSize: event.target.value },
                        { resetProductPage: false },
                      )
                    }
                  >
                    {TRANSACTION_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </section>
            ) : null}

            {transactionStatus === "error" ? (
              <div className="admin-inventory-state" role="alert">
                <h2>History unavailable.</h2>
                <p>{transactionsState.message}</p>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={handleTransactionRetry}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {transactionStatus === "empty" ? (
              <div className="admin-inventory-state">
                <h2>No transactions returned.</h2>
                <p>Adjust the type or date filters for this product.</p>
              </div>
            ) : null}

            {transactionStatus === "loading" ||
            transactionStatus === "success" ? (
              <div className="admin-inventory-table-wrap">
                <table className="admin-inventory-table admin-inventory-table--history">
                  <caption className="sr-only">Product inventory transactions</caption>
                  <thead>
                    <tr>
                      <th scope="col">Type</th>
                      <th scope="col">Change</th>
                      <th scope="col">Stock</th>
                      <th scope="col">Reference</th>
                      <th scope="col">Reason</th>
                      <th scope="col">Created</th>
                    </tr>
                  </thead>
                  {transactionStatus === "loading" ? (
                    <TransactionSkeletonRows />
                  ) : (
                    <tbody>
                      {transactions.map((transaction) => (
                        <TransactionRow
                          key={transaction.id}
                          transaction={transaction}
                        />
                      ))}
                    </tbody>
                  )}
                </table>
              </div>
            ) : null}

            {transactionStatus === "success" ? (
              <>
                <p className="admin-inventory-result-note">
                  Showing {transactionResultStart}-{transactionResultEnd} of{" "}
                  {transactionData.totalElements} transactions
                </p>
                <Pagination
                  currentPage={currentTransactionPage}
                  totalPages={transactionData.totalPages}
                  label="Inventory transactions pagination"
                  onPageChange={handleTransactionPageChange}
                />
              </>
            ) : null}
          </section>

          <AdjustmentForm
            fieldErrors={adjustmentErrors}
            formError={adjustmentError}
            formValues={adjustmentForm}
            isSubmitting={isSubmittingAdjustment}
            onChange={handleAdjustmentChange}
            onSubmit={handleAdjustmentSubmit}
            product={selectedProduct}
          />
        </aside>
      </div>
    </section>
  );
}
