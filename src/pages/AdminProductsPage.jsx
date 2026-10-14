import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  createAdminProduct,
  deleteAdminProduct,
  deleteAdminProductImage,
  getAdminProductById,
  getAdminProductCategories,
  getAdminProducts,
  updateAdminProduct,
  uploadAdminProductImage,
} from "../api/adminProductApi";
import ProductImage from "../components/ProductImage/ProductImage";
import { getBackendFieldErrors } from "../utils/authFormUtils";
import { formatCurrency } from "../utils/formatCurrency";
import "./AdminProductsPage.css";

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  stock: "",
  categoryName: "",
  active: true,
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const SORT_OPTIONS = [
  { label: "Mới nhất", value: "createdAt,desc" },
  { label: "Cũ nhất", value: "createdAt,asc" },
  { label: "Mới cập nhật", value: "updatedAt,desc" },
  { label: "Tên A đến Z", value: "name,asc" },
  { label: "Tên Z đến A", value: "name,desc" },
  { label: "Giá thấp nhất", value: "price,asc" },
  { label: "Giá cao nhất", value: "price,desc" },
  { label: "Tồn kho thấp nhất", value: "stock,asc" },
  { label: "Tồn kho cao nhất", value: "stock,desc" },
];

const SORT_VALUES = SORT_OPTIONS.map((option) => option.value);

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

function getAllowedSort(value) {
  if (SORT_VALUES.includes(value)) {
    return value;
  }

  return SORT_OPTIONS[0].value;
}

function getActiveFilter(value) {
  if (value === "true" || value === "false") {
    return value;
  }

  return "all";
}

function parseAdminProductQuery(searchParams) {
  return {
    active: getActiveFilter(searchParams.get("active")),
    page: getPositivePage(searchParams.get("page")),
    size: getAllowedPageSize(searchParams.get("size")),
    sort: getAllowedSort(searchParams.get("sort")),
  };
}

function normalizeProductPage(response, fallbackPage, fallbackSize) {
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

function getLifecycle(product) {
  if (product?.deletedAt) {
    return {
      label: "Đã xóa",
      className: "admin-products-status admin-products-status--deleted",
    };
  }

  if (product?.active) {
    return {
      label: "Đang bán",
      className: "admin-products-status admin-products-status--active",
    };
  }

  return {
    label: "Ngừng bán",
    className: "admin-products-status admin-products-status--inactive",
  };
}

function getProductMutationErrorMessage(error, fallback) {
  if (error?.status === 401 || error?.status === 403) {
    return "Cần quyền quản trị. Hãy đăng nhập lại bằng tài khoản quản trị.";
  }

  if (error?.status === 400 && error?.data?.errors) {
    return "Kiểm tra các trường được đánh dấu rồi thử lại.";
  }

  if (error?.status === 400) {
    return error.message || fallback;
  }

  if (error?.status === 404) {
    return "Không tìm thấy sản phẩm hoặc danh mục.";
  }

  if (error?.status === 409) {
    return "Sản phẩm xung đột với dữ liệu hiện có.";
  }

  if (error?.status >= 500) {
    return "Dịch vụ sản phẩm hiện không khả dụng.";
  }

  if (!error?.status) {
    return "Kết nối mạng thất bại. Hãy kiểm tra máy chủ API rồi thử lại.";
  }

  return fallback;
}

function getProductFieldErrors(error) {
  const backendErrors = getBackendFieldErrors(error);
  const errors = Object.fromEntries(
    Object.entries(backendErrors).map(([field, message]) => [
      field,
      String(message || ""),
    ]),
  );

  if (
    error?.message === "Category not found" ||
    error?.message === "Category is inactive"
  ) {
    errors.categoryName = "Danh mục không tồn tại hoặc đã ngừng hoạt động.";
  }

  return errors;
}

function getProductFormPayload(values, mode) {
  const payload = {
    name: values.name,
    description: values.description,
    price: values.price === "" ? null : Number(values.price),
    categoryName: values.categoryName,
  };

  if (mode === "create") {
    payload.stock =
      values.stock === ""
        ? null
        : Number.parseInt(values.stock, 10);
  }

  if (mode === "edit") {
    payload.active = Boolean(values.active);
  }

  return payload;
}

function getProductFormValues(product) {
  return {
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price ?? "",
    stock: product?.stock ?? "",
    categoryName: product?.categoryName || "",
    active: Boolean(product?.active),
  };
}

function ProductSkeletonRows() {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <tr className="admin-products-row admin-products-row--loading" key={index}>
          <td>
            <span className="admin-products-skeleton admin-products-skeleton--image" />
          </td>
          <td>
            <span className="admin-products-skeleton admin-products-skeleton--title" />
            <span className="admin-products-skeleton admin-products-skeleton--meta" />
          </td>
          <td>
            <span className="admin-products-skeleton admin-products-skeleton--short" />
          </td>
          <td>
            <span className="admin-products-skeleton admin-products-skeleton--short" />
          </td>
          <td>
            <span className="admin-products-skeleton admin-products-skeleton--short" />
          </td>
          <td>
            <span className="admin-products-skeleton admin-products-skeleton--actions" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function ProductFormField({
  as = "input",
  children,
  error,
  id,
  label,
  name,
  onChange,
  value,
  ...inputProps
}) {
  const errorId = error ? `${id}-error` : undefined;
  const sharedProps = {
    id,
    name,
    value,
    onChange,
    "aria-describedby": errorId,
    "aria-invalid": Boolean(error),
    ...inputProps,
  };

  return (
    <div className="admin-product-field">
      <label htmlFor={id}>{label}</label>
      {as === "textarea" ? (
        <textarea {...sharedProps} />
      ) : null}
      {as === "select" ? (
        <select {...sharedProps}>{children}</select>
      ) : null}
      {as === "input" ? <input {...sharedProps} /> : null}
      {error ? (
        <p id={errorId} className="admin-product-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ProductForm({
  categories,
  categoriesStatus,
  currentImageUrl,
  fieldErrors,
  formMode,
  formValues,
  isDeletingImage,
  isSubmitting,
  onCancel,
  onChange,
  onDeleteImage,
  onImageChange,
  onSubmit,
  previewImageUrl,
  selectedImageFile,
}) {
  const isEdit = formMode === "edit";
  const title = isEdit ? "Sửa sản phẩm" : "Thêm sản phẩm";
  const hasCurrentCategory = categories.some(
    (category) => category.name === formValues.categoryName,
  );
  const showUnavailableCategory = Boolean(
    formValues.categoryName && !hasCurrentCategory,
  );

  return (
    <form className="admin-product-form" onSubmit={onSubmit}>
      <div className="admin-product-form__header">
        <div>
          <h2>{title}</h2>
        </div>
        <button
          type="button"
          className="admin-products-text-button"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Đóng
        </button>
      </div>

      <div className="admin-product-form__grid">
        <ProductFormField
          id="admin-product-name"
          name="name"
          label="Tên sản phẩm"
          value={formValues.name}
          onChange={onChange}
          maxLength={150}
          error={fieldErrors.name}
        />

        <ProductFormField
          id="admin-product-price"
          name="price"
          label="Giá"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={formValues.price}
          onChange={onChange}
          error={fieldErrors.price}
        />

        {isEdit ? (
          <ProductFormField
            as="select"
            id="admin-product-active"
            name="active"
            label="Trạng thái bán"
            value={String(formValues.active)}
            onChange={onChange}
            error={fieldErrors.active}
          >
            <option value="true">Đang bán</option>
            <option value="false">Ngừng bán</option>
          </ProductFormField>
        ) : (
          <ProductFormField
            id="admin-product-stock"
            name="stock"
            label="Tồn kho ban đầu"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={formValues.stock}
            onChange={onChange}
            error={fieldErrors.stock}
          />
        )}

        <ProductFormField
          as="select"
          id="admin-product-category"
          name="categoryName"
          label="Danh mục"
          value={formValues.categoryName}
          onChange={onChange}
          error={fieldErrors.categoryName}
          disabled={categoriesStatus === "loading" || categories.length === 0}
        >
          <option value="">
            {categoriesStatus === "loading"
              ? "Đang tải danh mục"
              : "Chọn danh mục"}
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
          {showUnavailableCategory ? (
            <option value={formValues.categoryName}>
              {formValues.categoryName} (không khả dụng)
            </option>
          ) : null}
        </ProductFormField>

        <div className="admin-product-field">
          <label htmlFor="admin-product-image">Hình ảnh sản phẩm</label>

          <input
            id="admin-product-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onImageChange}
            disabled={isSubmitting || isDeletingImage}
          />

          <p className="admin-product-field__hint">
            Hỗ trợ JPEG, PNG hoặc WebP. Tối đa 5 MB.
          </p>

          {selectedImageFile ? (
            <p className="admin-product-field__hint">
              Đã chọn: {selectedImageFile.name}
            </p>
          ) : null}

          {previewImageUrl || currentImageUrl ? (
            <ProductImage
              src={previewImageUrl || currentImageUrl}
              alt="Xem trước sản phẩm"
              className="admin-product-form__image-preview"
              loading="eager"
            />
          ) : null}

          {formMode === "edit" && currentImageUrl && !selectedImageFile ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={onDeleteImage}
              disabled={isSubmitting || isDeletingImage}
            >
              {isDeletingImage ? "Đang xóa ảnh..." : "Xóa ảnh"}
            </button>
          ) : null}
        </div>
      </div>

      <ProductFormField
        as="textarea"
        id="admin-product-description"
        name="description"
        label="Mô tả"
        value={formValues.description}
        onChange={onChange}
        maxLength={1000}
        rows="4"
        error={fieldErrors.description}
      />

      {categoriesStatus === "empty" ? (
        <p className="admin-products-alert" role="alert">
          Không có danh mục đang hoạt động. Hãy tạo hoặc kích hoạt lại danh mục trước khi lưu sản phẩm.
        </p>
      ) : null}

      {categoriesStatus === "error" ? (
        <p className="admin-products-alert" role="alert">
          Không thể tải danh mục. Việc lưu sản phẩm có thể thất bại cho đến khi có dữ liệu danh mục.
        </p>
      ) : null}

      <div className="admin-product-form__actions">
        <button
          type="submit"
          className="button button--primary"
          disabled={isSubmitting || categoriesStatus === "loading"}
        >
          {isSubmitting
            ? "Đang lưu..."
            : isEdit
              ? "Lưu thay đổi"
              : "Thêm sản phẩm"}
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Hủy
        </button>
      </div>
    </form>
  );
}

function ProductPagination({ currentPage, onPageChange, totalPages }) {
  const pages = getPaginationPages(currentPage, totalPages);

  if (!pages.length) {
    return null;
  }

  return (
    <nav className="admin-products-pagination" aria-label="Admin products pagination">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Trước
      </button>
      <div className="admin-products-pagination__pages">
        {pages.map((pageNumber, index) => {
          const previousPage = pages[index - 1];
          const needsGap = previousPage && pageNumber - previousPage > 1;

          return (
            <span className="admin-products-pagination__item" key={pageNumber}>
              {needsGap ? (
                <span className="admin-products-pagination__gap" aria-hidden="true">
                  ...
                </span>
              ) : null}
              <button
                type="button"
                className={
                  pageNumber === currentPage
                    ? "admin-products-pagination__page is-current"
                    : "admin-products-pagination__page"
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

function ProductRow({
  actionId,
  confirmingAction,
  onCancelConfirm,
  onConfirmDelete,
  onConfirmToggle,
  onEdit,
  onRequestDelete,
  onRequestToggle,
  product,
}) {
  const lifecycle = getLifecycle(product);
  const isDeleted = Boolean(product.deletedAt);
  const isBusy = actionId.endsWith(`:${product.id}`);
  const isDeleting = actionId === `delete:${product.id}`;
  const isToggling = actionId === `toggle:${product.id}`;
  const confirmAction = confirmingAction?.productId === product.id
    ? confirmingAction
    : null;
  const price = formatCurrency(product.price);

  return (
    <>
      <tr className={isDeleted ? "admin-products-row is-deleted" : "admin-products-row"}>
        <td data-label="Image">
          <ProductImage
            src={product.imageUrl}
            alt={product.name || "Product image"}
            className="admin-product-image"
          />
        </td>
        <th scope="row" data-label="Product">
          <span className="admin-products-row__name">
            {product.name || "Untitled product"}
          </span>
          <span className="admin-products-row__meta">
            {product.id || "No product id"}
          </span>
          {product.deletedAt ? (
            <span className="admin-products-row__meta">
              Deleted {getDateTimeLabel(product.deletedAt)}
            </span>
          ) : null}
        </th>
        <td data-label="Category">{product.categoryName || "Unassigned"}</td>
        <td data-label="Price" className="admin-products-number">
          {price || "Unavailable"}
        </td>
        <td data-label="Stock" className="admin-products-number">
          {Number.isFinite(Number(product.stock)) ? product.stock : "Unavailable"}
        </td>
        <td data-label="Status">
          <span className={lifecycle.className}>{lifecycle.label}</span>
        </td>
        <td data-label="Actions">
          <div className="admin-products-actions">
            <button
              type="button"
              className="admin-products-text-button"
              onClick={() => onEdit(product)}
              disabled={isDeleted || Boolean(actionId)}
            >
              Sửa
            </button>
            {!product.active && !isDeleted ? (
              <button
                type="button"
                className="admin-products-text-button"
                onClick={() => onRequestToggle(product, true)}
                disabled={Boolean(actionId)}
              >
                Activate
              </button>
            ) : null}
            {product.active && !isDeleted ? (
              <button
                type="button"
                className="admin-products-text-button admin-products-text-button--warning"
                onClick={() => onRequestToggle(product, false)}
                disabled={Boolean(actionId)}
              >
                Ngừng hoạt động
              </button>
            ) : null}
            <button
              type="button"
              className="admin-products-text-button admin-products-text-button--danger"
              onClick={() => onRequestDelete(product)}
              disabled={isDeleted || Boolean(actionId)}
            >
              Xóa
            </button>
          </div>
          {isBusy ? (
            <p className="admin-products-row__meta" aria-live="polite">
              {isDeleting ? "Deleting..." : isToggling ? "Updating..." : "Loading..."}
            </p>
          ) : null}
        </td>
      </tr>
      {confirmAction ? (
        <tr className="admin-products-confirm-row">
          <td className="admin-products-confirm-cell" colSpan="7">
            <div className="admin-products-confirm" role="alert">
              <p>{confirmAction.message}</p>
              <div>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() =>
                    confirmAction.type === "delete"
                      ? onConfirmDelete(product.id)
                      : onConfirmToggle(product, confirmAction.nextActive)
                  }
                  disabled={Boolean(actionId)}
                >
                  {confirmAction.confirmLabel}
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={onCancelConfirm}
                  disabled={Boolean(actionId)}
                >
                  Hủy
                </button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default function AdminProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const productQuery = useMemo(
    () => parseAdminProductQuery(searchParams),
    [searchParams],
  );
  const [productsState, setProductsState] = useState({
    status: "loading",
    data: null,
    message: "",
  });
  const [categoriesState, setCategoriesState] = useState({
    status: "loading",
    items: [],
    message: "",
  });
  const [retryKey, setRetryKey] = useState(0);
  const [categoryRetryKey, setCategoryRetryKey] = useState(0);
  const [formMode, setFormMode] = useState("closed");
  const [editingProductId, setEditingProductId] = useState("");
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmingAction, setConfirmingAction] = useState(null);

  const backendQuery = useMemo(
    () => ({
      active:
        productQuery.active === "all" ? undefined : productQuery.active === "true",
      page: productQuery.page - 1,
      size: productQuery.size,
      sort: productQuery.sort,
    }),
    [productQuery.active, productQuery.page, productQuery.size, productQuery.sort],
  );

  const productData = productsState.data;
  const products = productData?.content || [];
  const currentPage = productData ? productData.page + 1 : productQuery.page;
  const totalPages = productData?.totalPages || 0;
  const resultStart = productData?.totalElements
    ? productData.page * productData.size + 1
    : 0;
  const resultEnd = productData?.totalElements
    ? productData.page * productData.size + productData.numberOfElements
    : 0;
  const isFormOpen = formMode === "create" || formMode === "edit";

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setProductsState((current) => ({
        status: "loading",
        data: current.data,
        message: "",
      }));

      try {
        const response = await getAdminProducts(backendQuery, {
          signal: controller.signal,
        });
        const data = normalizeProductPage(
          response,
          backendQuery.page,
          backendQuery.size,
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
          message: getProductMutationErrorMessage(
            error,
            "Products could not be loaded.",
          ),
        });
      }
    }

    loadProducts();

    return () => {
      controller.abort();
    };
  }, [backendQuery, retryKey]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      setCategoriesState((current) => ({
        status: "loading",
        items: current.items,
        message: "",
      }));

      try {
        const response = await getAdminProductCategories(
          { active: true },
          { signal: controller.signal },
        );
        const categories = Array.isArray(response)
          ? response.filter((category) => !category.deletedAt)
          : [];

        if (controller.signal.aborted) {
          return;
        }

        setCategoriesState({
          status: categories.length ? "success" : "empty",
          items: categories,
          message: "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setCategoriesState({
          status: "error",
          items: [],
          message: getProductMutationErrorMessage(
            error,
            "Categories could not be loaded.",
          ),
        });
      }
    }

    loadCategories();

    return () => {
      controller.abort();
    };
  }, [categoryRetryKey]);

  useEffect(() => {
    const total = productsState.data?.totalPages || 0;

    if (total > 0 && productQuery.page > total) {
      const nextParams = new URLSearchParams(searchParams);

      if (total === 1) {
        nextParams.delete("page");
      } else {
        nextParams.set("page", String(total));
      }

      setSearchParams(nextParams, { replace: true });
    }
  }, [productQuery.page, productsState.data, searchParams, setSearchParams]);

  const previewImageUrl = useMemo(() => {
    if (!selectedImageFile) {
      return "";
    }

    return URL.createObjectURL(selectedImageFile);
  }, [selectedImageFile]);

  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  async function reloadProducts() {
    const response = await getAdminProducts(backendQuery);
    const data = normalizeProductPage(
      response,
      backendQuery.page,
      backendQuery.size,
    );

    setProductsState({
      status: data.content.length ? "success" : "empty",
      data,
      message: "",
    });

    return data;
  }

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

    if (nextParams.get("sort") === SORT_OPTIONS[0].value) {
      nextParams.delete("sort");
    }

    if (nextParams.get("size") === String(PAGE_SIZE_OPTIONS[0])) {
      nextParams.delete("size");
    }

    setSearchParams(nextParams);
  }

  function handlePageChange(pageNumber) {
    const nextPage = Math.min(Math.max(pageNumber, 1), totalPages || 1);
    const nextParams = new URLSearchParams(searchParams);

    if (nextPage <= 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(nextPage));
    }

    setSearchParams(nextParams);
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedImageFile(null);
      setFormError("");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setSelectedImageFile(null);
      setFormError("Only JPEG, PNG, and WebP images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setSelectedImageFile(null);
      setFormError("Kích thước hình ảnh không được vượt quá 5 MB.");
      event.target.value = "";
      return;
    }

    setSelectedImageFile(file);
    setFormError("");
  }

  async function handleDeleteImage() {
    if (!editingProductId || isDeletingImage) {
      return;
    }

    setIsDeletingImage(true);
    setFormError("");

    try {
      const updatedProduct =
        await deleteAdminProductImage(editingProductId);

      setCurrentImageUrl(updatedProduct.imageUrl || "");
      setSelectedImageFile(null);

      await reloadProducts();
    } catch (error) {
      setFormError(
        getProductMutationErrorMessage(
          error,
          "Product image could not be deleted.",
        ),
      );
    } finally {
      setIsDeletingImage(false);
    }
  }

  function resetForm() {
    setFormMode("closed");
    setEditingProductId("");
    setFormValues(EMPTY_FORM);
    setSelectedImageFile(null);
    setCurrentImageUrl("");
    setFieldErrors({});
    setFormError("");
  }

  function openCreateForm() {
    setFormMode("create");
    setEditingProductId("");
    setFormValues(EMPTY_FORM);
    setSelectedImageFile(null);
    setCurrentImageUrl("");
    setFieldErrors({});
    setFormError("");
    setActionError("");
    setConfirmingAction(null);
  }

  async function openEditForm(product) {
    if (!product?.id || product.deletedAt || actionId) {
      return;
    }

    setActionId(`edit:${product.id}`);
    setFieldErrors({});
    setFormError("");
    setActionError("");
    setConfirmingAction(null);

    try {
      const productDetail = await getAdminProductById(product.id);

      if (productDetail.deletedAt) {
        setActionError("Deleted products cannot be edited because restore is not supported.");
        await reloadProducts().catch(() => {});
        return;
      }

      setFormMode("edit");
      setEditingProductId(productDetail.id);
      setFormValues(getProductFormValues(productDetail));
      setSelectedImageFile(null);
      setCurrentImageUrl(productDetail.imageUrl || "");
      } catch (error) {
      setActionError(
        getProductMutationErrorMessage(error, "Product could not be opened."),
      );
      await reloadProducts().catch(() => {});
    } finally {
      setActionId("");
    }
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    const nextValue = name === "active" ? value === "true" : value;

    setFormValues((current) => ({
      ...current,
      [name]: nextValue,
    }));
    setFieldErrors((current) => ({
      ...current,
      [name]: "",
    }));
    setFormError("");
  }

  async function handleFormSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError("");

    try {
      const payload = getProductFormPayload(formValues, formMode);

      let savedProduct;

      if (formMode === "edit") {
        savedProduct = await updateAdminProduct(
          editingProductId,
          payload,
        );
      } else {
        savedProduct = await createAdminProduct(payload);
      }

      if (selectedImageFile) {
        await uploadAdminProductImage(
          savedProduct.id,
          selectedImageFile,
        );
      }

      await reloadProducts();
      resetForm();
    } catch (error) {
      setFieldErrors(getProductFieldErrors(error));
      setFormError(
        getProductMutationErrorMessage(
          error,
          "Product could not be saved.",
        ),
      );

      await reloadProducts().catch(() => {});
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestDelete(product) {
    setActionError("");
    setConfirmingAction({
      type: "delete",
      productId: product.id,
      message:
        "Xóa sản phẩm ? Không thể khôi phục từ Quản trị !",
      confirmLabel: "Xóa sản phẩm",
    });
  }

  function requestToggle(product, nextActive) {
    setActionError("");
    setConfirmingAction({
      type: "toggle",
      productId: product.id,
      nextActive,
      message: nextActive
        ? "Kích hoạt sản phẩm này cho cửa hàng ?"
        : "Ngừng hoạt động sản phẩm này ?",
      confirmLabel: nextActive ? "Kích hoạt" : "Vô hiệu hóa sản phẩm",
    });
  }

  async function confirmDelete(productId) {
    if (actionId) {
      return;
    }

    setActionId(`delete:${productId}`);
    setActionError("");

    try {
      await deleteAdminProduct(productId);
      await reloadProducts();
      setConfirmingAction(null);

      if (editingProductId === productId) {
        resetForm();
      }
    } catch (error) {
      setActionError(
        getProductMutationErrorMessage(error, "Product could not be deleted."),
      );
      await reloadProducts().catch(() => {});
    } finally {
      setActionId("");
    }
  }

  async function confirmToggle(product, nextActive) {
    if (actionId || !product?.id) {
      return;
    }

    setActionId(`toggle:${product.id}`);
    setActionError("");

    try {
      await updateAdminProduct(product.id, {
        name: product.name,
        description: product.description,
        price: product.price,
        categoryName: product.categoryName,
        active: nextActive,
      });
      await reloadProducts();
      setConfirmingAction(null);

      if (editingProductId === product.id) {
        setFormValues((current) => ({
          ...current,
          active: nextActive,
        }));
      }
    } catch (error) {
      setActionError(
        getProductMutationErrorMessage(error, "Product status could not be changed."),
      );
      await reloadProducts().catch(() => {});
    } finally {
      setActionId("");
    }
  }

  function handleRetry() {
    setRetryKey((key) => key + 1);
    setActionError("");
    setConfirmingAction(null);
  }

  return (
    <section className="admin-products" aria-labelledby="admin-products-title">
      <header className="admin-products__header">
        <div>
          <p className="admin-products__kicker">Quản lý sản phẩm</p>
          <h1 id="admin-products-title">Sản phẩm</h1>
        </div>
        <div className="admin-products__header-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={handleRetry}
            disabled={productsState.status === "loading"}
          >
            Tải lại
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={openCreateForm}
            disabled={isSubmitting}
          >
            Thêm sản phẩm
          </button>
        </div>
      </header>

      <section className="admin-products-toolbar" aria-label="Product list controls">
        <div className="admin-product-control">
          <label htmlFor="admin-products-active-filter">Bộ lọc trạng thái</label>
          <select
            id="admin-products-active-filter"
            value={productQuery.active}
            onChange={(event) => updateQuery({ active: event.target.value })}
          >
            <option value="all">Tất cả sản phẩm</option>
            <option value="true">Chỉ đang bán</option>
            <option value="false">Chỉ ngừng bán</option>
          </select>
        </div>

        <div className="admin-product-control">
          <label htmlFor="admin-products-sort">Sắp xếp</label>
          <select
            id="admin-products-sort"
            value={productQuery.sort}
            onChange={(event) => updateQuery({ sort: event.target.value })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-product-control">
          <label htmlFor="admin-products-page-size">Số dòng</label>
          <select
            id="admin-products-page-size"
            value={productQuery.size}
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

      <div className={isFormOpen ? "admin-products-layout has-form" : "admin-products-layout"}>
        <section
          className="admin-products-list"
          aria-labelledby="admin-products-list-title"
        >
          <div className="admin-products-list__header">
            <div>
              <h2 id="admin-products-list-title">Danh sách sản phẩm</h2>
              {productsState.status === "success" ? (
                <p>
                  Hiển thị {resultStart}-{resultEnd} trong tổng số{" "}
                  {productData.totalElements} sản phẩm
                </p>
              ) : null}
              {productsState.status === "loading" ? (
                <p aria-live="polite">Loading products...</p>
              ) : null}
            </div>
            {categoriesState.status === "error" ? (
              <button
                type="button"
                className="admin-products-text-button"
                onClick={() => setCategoryRetryKey((key) => key + 1)}
              >
                Retry categories
              </button>
            ) : null}
          </div>

          {actionError ? (
            <p className="admin-products-alert" role="alert">
              {actionError}
            </p>
          ) : null}

          {productsState.status === "error" ? (
            <div className="admin-products-state" role="alert">
              <h2>Products unavailable.</h2>
              <p>{productsState.message}</p>
              <button type="button" className="button button--ghost" onClick={handleRetry}>
                Retry
              </button>
            </div>
          ) : null}

          {productsState.status === "empty" ? (
            <div className="admin-products-state">
              <h2>Không có sản phẩm</h2>
              <p>
                Điều chỉnh bộ lọc hoặc tạo sản phẩm đầu tiên
              </p>
              <button type="button" className="button button--primary" onClick={openCreateForm}>
                Thêm sản phẩm
              </button>
            </div>
          ) : null}

          {productsState.status === "loading" || productsState.status === "success" ? (
            <div className="admin-products-table-wrap">
              <table className="admin-products-table">
                <caption className="sr-only">Danh sách sản phẩm quản trị</caption>
                <thead>
                  <tr>
                    <th scope="col">Hình ảnh</th>
                    <th scope="col">Sản phẩm</th>
                    <th scope="col">Danh mục</th>
                    <th scope="col">Giá</th>
                    <th scope="col">Tồn kho</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Thao tác</th>
                  </tr>
                </thead>
                {productsState.status === "loading" ? (
                  <ProductSkeletonRows />
                ) : (
                  <tbody>
                    {products.map((product) => (
                      <ProductRow
                        key={product.id}
                        actionId={actionId}
                        confirmingAction={confirmingAction}
                        product={product}
                        onCancelConfirm={() => setConfirmingAction(null)}
                        onConfirmDelete={confirmDelete}
                        onConfirmToggle={confirmToggle}
                        onEdit={openEditForm}
                        onRequestDelete={requestDelete}
                        onRequestToggle={requestToggle}
                      />
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          ) : null}

          {productsState.status === "success" ? (
            <ProductPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          ) : null}
        </section>

        {isFormOpen ? (
          <aside className="admin-products-panel" aria-label="Product form">
            {formError ? (
              <p className="admin-products-alert" role="alert">
                {formError}
              </p>
            ) : null}
            <ProductForm
              categories={categoriesState.items}
              categoriesStatus={categoriesState.status}
              currentImageUrl={currentImageUrl}
              fieldErrors={fieldErrors}
              formMode={formMode}
              formValues={formValues}
              isDeletingImage={isDeletingImage}
              isSubmitting={isSubmitting}
              onCancel={resetForm}
              onChange={handleFormChange}
              onDeleteImage={handleDeleteImage}
              onImageChange={handleImageChange}
              onSubmit={handleFormSubmit}
              previewImageUrl={previewImageUrl}
              selectedImageFile={selectedImageFile}
            />
          </aside>
        ) : null}
      </div>
    </section>
  );
}
