import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  getAdminCategoryById,
  updateAdminCategory,
} from "../api/adminCategoryApi";
import { getBackendFieldErrors } from "../utils/authFormUtils";
import "./AdminCategoriesPage.css";

const EMPTY_FORM = {
  name: "",
  description: "",
  active: true,
};

function getActiveFilter(value) {
  if (value === "true" || value === "false") {
    return value;
  }

  return "all";
}

function parseCategoryQuery(searchParams) {
  return {
    active: getActiveFilter(searchParams.get("active")),
  };
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

function getLifecycle(category) {
  if (category?.deletedAt) {
    return {
      label: "Đã xóa",
      className: "admin-categories-status admin-categories-status--deleted",
    };
  }

  if (category?.active) {
    return {
      label: "Đang hoạt động",
      className: "admin-categories-status admin-categories-status--active",
    };
  }

  return {
    label: "Ngừng hoạt động",
    className: "admin-categories-status admin-categories-status--inactive",
  };
}

function getCategoryErrorMessage(error, fallback) {
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
    return "Không tìm thấy danh mục.";
  }

  if (error?.status === 409) {
    return "Danh mục xung đột với dữ liệu hiện có.";
  }

  if (error?.status >= 500) {
    return "Dịch vụ danh mục hiện không khả dụng.";
  }

  if (!error?.status) {
    return "Kết nối mạng thất bại. Hãy kiểm tra máy chủ API rồi thử lại.";
  }

  return fallback;
}

function getCategoryFieldErrors(error) {
  const backendErrors = getBackendFieldErrors(error);
  const errors = Object.fromEntries(
    Object.entries(backendErrors).map(([field, message]) => [
      field,
      String(message || ""),
    ]),
  );

  if (error?.status === 409) {
    errors.name = "Tên đã được sử dụng hoặc không đáp ứng điều kiện danh mục.";
  }

  return errors;
}

function getCategoryFormPayload(values, mode) {
  const payload = {
    name: values.name,
    description: values.description,
  };

  if (mode === "edit") {
    payload.active = Boolean(values.active);
  }

  return payload;
}

function getCategoryFormValues(category) {
  return {
    name: category?.name || "",
    description: category?.description || "",
    active: Boolean(category?.active),
  };
}

function CategorySkeletonRows() {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: 7 }).map((_, index) => (
        <tr
          className="admin-categories-row admin-categories-row--loading"
          key={index}
        >
          <td>
            <span className="admin-categories-skeleton admin-categories-skeleton--title" />
          </td>
          <td>
            <span className="admin-categories-skeleton admin-categories-skeleton--wide" />
          </td>
          <td>
            <span className="admin-categories-skeleton admin-categories-skeleton--short" />
          </td>
          <td>
            <span className="admin-categories-skeleton admin-categories-skeleton--short" />
          </td>
          <td>
            <span className="admin-categories-skeleton admin-categories-skeleton--actions" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function CategoryFormField({
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
    <div className="admin-category-field">
      <label htmlFor={id}>{label}</label>
      {as === "textarea" ? <textarea {...sharedProps} /> : null}
      {as === "select" ? <select {...sharedProps}>{children}</select> : null}
      {as === "input" ? <input {...sharedProps} /> : null}
      {error ? (
        <p id={errorId} className="admin-category-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CategoryForm({
  fieldErrors,
  formMode,
  formValues,
  isSubmitting,
  onCancel,
  onChange,
  onSubmit,
}) {
  const isEdit = formMode === "edit";

  return (
    <form className="admin-category-form" onSubmit={onSubmit}>
      <div className="admin-category-form__header">
        <div>
          <h2>{isEdit ? "Sửa danh mục" : "Thêm danh mục"}</h2>
          <p>
            {isEdit
              ? "Cập nhật bản ghi quản trị. Không thể sửa danh mục đã xóa."
              : "Danh mục mới được tạo ở trạng thái hoạt động."}
          </p>
        </div>
        <button
          type="button"
          className="admin-categories-text-button"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Đóng
        </button>
      </div>

      <CategoryFormField
        id="admin-category-name"
        name="name"
        label="Tên danh mục"
        value={formValues.name}
        onChange={onChange}
        maxLength={100}
        error={fieldErrors.name}
      />

      <CategoryFormField
        as="textarea"
        id="admin-category-description"
        name="description"
        label="Mô tả"
        value={formValues.description}
        onChange={onChange}
        maxLength={255}
        rows="4"
        error={fieldErrors.description}
      />

      {isEdit ? (
        <CategoryFormField
          as="select"
          id="admin-category-active"
          name="active"
          label="Trạng thái bán"
          value={String(formValues.active)}
          onChange={onChange}
          error={fieldErrors.active}
        >
          <option value="true">Đang hoạt động</option>
          <option value="false">Ngừng hoạt động</option>
        </CategoryFormField>
      ) : null}

      <div className="admin-category-form__actions">
        <button
          type="submit"
          className="button button--primary"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Đang lưu..."
            : isEdit
              ? "Lưu thay đổi"
              : "Tạo danh mục"}
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

function CategoryRow({
  actionId,
  category,
  confirmingAction,
  onCancelConfirm,
  onConfirmDelete,
  onConfirmToggle,
  onEdit,
  onRequestDelete,
  onRequestToggle,
}) {
  const lifecycle = getLifecycle(category);
  const isDeleted = Boolean(category.deletedAt);
  const isBusy = actionId.endsWith(`:${category.id}`);
  const isDeleting = actionId === `delete:${category.id}`;
  const isToggling = actionId === `toggle:${category.id}`;
  const confirmAction =
    confirmingAction?.categoryId === category.id ? confirmingAction : null;

  return (
    <>
      <tr
        className={
          isDeleted ? "admin-categories-row is-deleted" : "admin-categories-row"
        }
      >
      <th scope="row" data-label="Danh mục">
          <span className="admin-categories-row__name">
            {category.name || "Danh mục chưa có tên"}
          </span>
          <span className="admin-categories-row__meta">
            {category.id || "Không có mã danh mục"}
          </span>
        </th>
        <td data-label="Mô tả">
          {category.description || (
            <span className="admin-categories-row__muted">Không có mô tả</span>
          )}
        </td>
        <td data-label="Trạng thái">
          <span className={lifecycle.className}>{lifecycle.label}</span>
        </td>
        <td data-label="Thời gian xóa" className="admin-categories-number">
          {category.deletedAt ? getDateTimeLabel(category.deletedAt) : "Không có"}
        </td>
        <td data-label="Thao tác">
          <div className="admin-categories-actions">
            <button
              type="button"
              className="admin-categories-text-button"
              onClick={() => onEdit(category)}
              disabled={isDeleted || Boolean(actionId)}
            >
              Sửa
            </button>
            {!category.active && !isDeleted ? (
              <button
                type="button"
                className="admin-categories-text-button"
                onClick={() => onRequestToggle(category, true)}
                disabled={Boolean(actionId)}
              >
                Kích hoạt
              </button>
            ) : null}
            {category.active && !isDeleted ? (
              <button
                type="button"
                className="admin-categories-text-button admin-categories-text-button--warning"
                onClick={() => onRequestToggle(category, false)}
                disabled={Boolean(actionId)}
              >
                Ngừng hoạt động
              </button>
            ) : null}
            <button
              type="button"
              className="admin-categories-text-button admin-categories-text-button--danger"
              onClick={() => onRequestDelete(category)}
              disabled={isDeleted || Boolean(actionId)}
            >
              Xóa
            </button>
          </div>
          {isBusy ? (
            <p className="admin-categories-row__meta" aria-live="polite">
              {isDeleting ? "Đang xóa..." : isToggling ? "Đang cập nhật..." : "Đang tải..."}
            </p>
          ) : null}
        </td>
      </tr>
      {confirmAction ? (
        <tr className="admin-categories-confirm-row">
          <td className="admin-categories-confirm-cell" colSpan="5">
            <div className="admin-categories-confirm" role="alert">
              <p>{confirmAction.message}</p>
              <div>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() =>
                    confirmAction.type === "delete"
                      ? onConfirmDelete(category.id)
                      : onConfirmToggle(category, confirmAction.nextActive)
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

export default function AdminCategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryQuery = useMemo(
    () => parseCategoryQuery(searchParams),
    [searchParams],
  );
  const [categoriesState, setCategoriesState] = useState({
    status: "loading",
    items: [],
    message: "",
  });
  const [retryKey, setRetryKey] = useState(0);
  const [formMode, setFormMode] = useState("closed");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmingAction, setConfirmingAction] = useState(null);

  const backendQuery = useMemo(
    () => ({
      active:
        categoryQuery.active === "all"
          ? undefined
          : categoryQuery.active === "true",
    }),
    [categoryQuery.active],
  );

  const categories = categoriesState.items;
  const activeCount = categories.filter(
    (category) => category.active && !category.deletedAt,
  ).length;
  const inactiveCount = categories.filter(
    (category) => !category.active && !category.deletedAt,
  ).length;
  const deletedCount = categories.filter((category) => category.deletedAt).length;
  const isFormOpen = formMode === "create" || formMode === "edit";

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      setCategoriesState((current) => ({
        status: "loading",
        items: current.items,
        message: "",
      }));

      try {
        const response = await getAdminCategories(backendQuery, {
          signal: controller.signal,
        });
        const items = Array.isArray(response) ? response : [];

        if (controller.signal.aborted) {
          return;
        }

        setCategoriesState({
          status: items.length ? "success" : "empty",
          items,
          message: "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setCategoriesState({
          status: "error",
          items: [],
          message: getCategoryErrorMessage(
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
  }, [backendQuery, retryKey]);

  async function reloadCategories() {
    const response = await getAdminCategories(backendQuery);
    const items = Array.isArray(response) ? response : [];

    setCategoriesState({
      status: items.length ? "success" : "empty",
      items,
      message: "",
    });

    return items;
  }

  function updateQuery(updates) {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "" || value === "all") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    setSearchParams(nextParams);
  }

  function resetForm() {
    setFormMode("closed");
    setEditingCategoryId("");
    setFormValues(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
  }

  function openCreateForm() {
    setFormMode("create");
    setEditingCategoryId("");
    setFormValues(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
    setActionError("");
    setConfirmingAction(null);
  }

  async function openEditForm(category) {
    if (!category?.id || category.deletedAt || actionId) {
      return;
    }

    setActionId(`edit:${category.id}`);
    setFieldErrors({});
    setFormError("");
    setActionError("");
    setConfirmingAction(null);

    try {
      const categoryDetail = await getAdminCategoryById(category.id);

      if (categoryDetail.deletedAt) {
        setActionError("Không thể sửa danh mục đã xóa vì không hỗ trợ khôi phục.");
        await reloadCategories().catch(() => {});
        return;
      }

      setFormMode("edit");
      setEditingCategoryId(categoryDetail.id);
      setFormValues(getCategoryFormValues(categoryDetail));
    } catch (error) {
      setActionError(
        getCategoryErrorMessage(error, "Không thể mở danh mục."),
      );
      await reloadCategories().catch(() => {});
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
      const payload = getCategoryFormPayload(formValues, formMode);

      if (formMode === "edit") {
        await updateAdminCategory(editingCategoryId, payload);
      } else {
        await createAdminCategory(payload);
      }

      await reloadCategories();
      resetForm();
    } catch (error) {
      setFieldErrors(getCategoryFieldErrors(error));
      setFormError(
        getCategoryErrorMessage(error, "Không thể lưu danh mục."),
      );
      await reloadCategories().catch(() => {});
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestDelete(category) {
    setActionError("");
    setConfirmingAction({
      type: "delete",
      categoryId: category.id,
      message:
        "Xóa mềm danh mục này? Sẽ từ chối nếu sản phẩm chưa xóa vẫn dùng danh mục này.",
      confirmLabel: "Xóa danh mục",
    });
  }

  function requestToggle(category, nextActive) {
    setActionError("");
    setConfirmingAction({
      type: "toggle",
      categoryId: category.id,
      nextActive,
      message: nextActive
        ? "Kích hoạt danh mục này cho cửa hàng?"
        : "Ngừng hoạt động danh mục này? Sản phẩm thuộc danh mục sẽ không còn hiển thị để mua.",
      confirmLabel: nextActive ? "Kích hoạt danh mục" : "Ngừng hoạt động danh mục",
    });
  }

  async function confirmDelete(categoryId) {
    if (actionId) {
      return;
    }

    setActionId(`delete:${categoryId}`);
    setActionError("");

    try {
      await deleteAdminCategory(categoryId);
      await reloadCategories();
      setConfirmingAction(null);

      if (editingCategoryId === categoryId) {
        resetForm();
      }
    } catch (error) {
      setActionError(
        getCategoryErrorMessage(error, "Không thể xóa danh mục."),
      );
      await reloadCategories().catch(() => {});
    } finally {
      setActionId("");
    }
  }

  async function confirmToggle(category, nextActive) {
    if (actionId || !category?.id) {
      return;
    }

    setActionId(`toggle:${category.id}`);
    setActionError("");

    try {
      await updateAdminCategory(category.id, {
        name: category.name,
        description: category.description,
        active: nextActive,
      });
      await reloadCategories();
      setConfirmingAction(null);

      if (editingCategoryId === category.id) {
        setFormValues((current) => ({
          ...current,
          active: nextActive,
        }));
      }
    } catch (error) {
      setActionError(
        getCategoryErrorMessage(
          error,
          "Không thể đổi trạng thái danh mục.",
        ),
      );
      await reloadCategories().catch(() => {});
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
    <section
      className="admin-categories"
      aria-labelledby="admin-categories-title"
    >
      <header className="admin-categories__header">
        <div>
          <p className="admin-categories__kicker">Quản lý danh mục</p>
          <h1 id="admin-categories-title">Danh mục</h1>
        </div>
        <div className="admin-categories__header-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={handleRetry}
            disabled={categoriesState.status === "loading"}
          >
            Làm mới
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={openCreateForm}
            disabled={isSubmitting}
          >
            Thêm danh mục
          </button>
        </div>
      </header>

      <section className="admin-categories-toolbar" aria-label="Điều khiển danh sách danh mục">
        <div className="admin-category-control">
          <label htmlFor="admin-categories-active-filter">Bộ lọc trạng thái</label>
          <select
            id="admin-categories-active-filter"
            value={categoryQuery.active}
            onChange={(event) => updateQuery({ active: event.target.value })}
          >
            <option value="all">Tất cả danh mục</option>
            <option value="true">Chỉ đang hoạt động</option>
            <option value="false">Chỉ ngừng hoạt động</option>
          </select>
        </div>

        {categoriesState.status === "success" ? (
          <dl className="admin-categories-summary" aria-label="Tổng số danh mục">
            <div>
              <dt>Tổng</dt>
              <dd>{categories.length}</dd>
            </div>
            <div>
              <dt>Đang hoạt động</dt>
              <dd>{activeCount}</dd>
            </div>
            <div>
              <dt>Ngừng hoạt động</dt>
              <dd>{inactiveCount}</dd>
            </div>
            <div>
              <dt>Đã xóa</dt>
              <dd>{deletedCount}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <div
        className={
          isFormOpen
            ? "admin-categories-layout has-form"
            : "admin-categories-layout"
        }
      >
        <section
          className="admin-categories-list"
          aria-labelledby="admin-categories-list-title"
        >
          <div className="admin-categories-list__header">
            <div>
              <h2 id="admin-categories-list-title">Danh sách danh mục</h2>
              {categoriesState.status === "success" ? (
                <p>{categories.length} danh mục</p>
              ) : null}
              {categoriesState.status === "loading" ? (
                <p aria-live="polite">Loading categories...</p>
              ) : null}
            </div>
          </div>

          {actionError ? (
            <p className="admin-categories-alert" role="alert">
              {actionError}
            </p>
          ) : null}

          {categoriesState.status === "error" ? (
            <div className="admin-categories-state" role="alert">
              <h2>Categories unavailable.</h2>
              <p>{categoriesState.message}</p>
              <button type="button" className="button button--ghost" onClick={handleRetry}>
                Retry
              </button>
            </div>
          ) : null}

          {categoriesState.status === "empty" ? (
            <div className="admin-categories-state">
              <h2>Không có danh mục nào</h2>
              <p>
                Điều chỉnh bộ lọc đang hoạt động hoặc tạo danh mục đầu tiên cho cửa hàng này.
              </p>
              <button
                type="button"
                className="button button--primary"
                onClick={openCreateForm}
              >
                Thêm danh mục
              </button>
            </div>
          ) : null}

          {categoriesState.status === "loading" ||
          categoriesState.status === "success" ? (
            <div className="admin-categories-table-wrap">
              <table className="admin-categories-table">
                <caption className="sr-only">Danh sách danh mục quản trị</caption>
                <thead>
                  <tr>
                    <th scope="col">Danh mục</th>
                    <th scope="col">Mô tả</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Thời gian xóa</th>
                    <th scope="col">Thao tác</th>
                  </tr>
                </thead>
                {categoriesState.status === "loading" ? (
                  <CategorySkeletonRows />
                ) : (
                  <tbody>
                    {categories.map((category) => (
                      <CategoryRow
                        key={category.id}
                        actionId={actionId}
                        category={category}
                        confirmingAction={confirmingAction}
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
        </section>

        {isFormOpen ? (
          <aside className="admin-categories-panel" aria-label="Category form">
            {formError ? (
              <p className="admin-categories-alert" role="alert">
                {formError}
              </p>
            ) : null}
            <CategoryForm
              fieldErrors={fieldErrors}
              formMode={formMode}
              formValues={formValues}
              isSubmitting={isSubmitting}
              onCancel={resetForm}
              onChange={handleFormChange}
              onSubmit={handleFormSubmit}
            />
          </aside>
        ) : null}
      </div>
    </section>
  );
}
