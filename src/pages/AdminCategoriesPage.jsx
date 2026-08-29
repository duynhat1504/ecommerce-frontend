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
      label: "Deleted",
      className: "admin-categories-status admin-categories-status--deleted",
    };
  }

  if (category?.active) {
    return {
      label: "Active",
      className: "admin-categories-status admin-categories-status--active",
    };
  }

  return {
    label: "Inactive",
    className: "admin-categories-status admin-categories-status--inactive",
  };
}

function getCategoryErrorMessage(error, fallback) {
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
    return error.message || "The category was not found.";
  }

  if (error?.status === 409) {
    return error.message || "The category conflicts with existing data.";
  }

  if (error?.status >= 500) {
    return "The category service is unavailable right now.";
  }

  if (!error?.status) {
    return "Network connection failed. Check the API server and try again.";
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
    errors.name = "Name is already used or violates category constraints.";
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
          <h2>{isEdit ? "Edit category" : "Create category"}</h2>
          <p>
            {isEdit
              ? "Update the admin record. Deleted categories cannot be edited."
              : "New categories are created active by the backend."}
          </p>
        </div>
        <button
          type="button"
          className="admin-categories-text-button"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Close
        </button>
      </div>

      <CategoryFormField
        id="admin-category-name"
        name="name"
        label="Name"
        value={formValues.name}
        onChange={onChange}
        maxLength={100}
        error={fieldErrors.name}
      />

      <CategoryFormField
        as="textarea"
        id="admin-category-description"
        name="description"
        label="Description"
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
          label="Storefront status"
          value={String(formValues.active)}
          onChange={onChange}
          error={fieldErrors.active}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </CategoryFormField>
      ) : null}

      <div className="admin-category-form__actions">
        <button
          type="submit"
          className="button button--primary"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Saving..."
            : isEdit
              ? "Save changes"
              : "Create category"}
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
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
        <th scope="row" data-label="Category">
          <span className="admin-categories-row__name">
            {category.name || "Untitled category"}
          </span>
          <span className="admin-categories-row__meta">
            {category.id || "No category id"}
          </span>
        </th>
        <td data-label="Description">
          {category.description || (
            <span className="admin-categories-row__muted">No description</span>
          )}
        </td>
        <td data-label="Status">
          <span className={lifecycle.className}>{lifecycle.label}</span>
        </td>
        <td data-label="Deleted at" className="admin-categories-number">
          {category.deletedAt ? getDateTimeLabel(category.deletedAt) : "None"}
        </td>
        <td data-label="Actions">
          <div className="admin-categories-actions">
            <button
              type="button"
              className="admin-categories-text-button"
              onClick={() => onEdit(category)}
              disabled={isDeleted || Boolean(actionId)}
            >
              Edit
            </button>
            {!category.active && !isDeleted ? (
              <button
                type="button"
                className="admin-categories-text-button"
                onClick={() => onRequestToggle(category, true)}
                disabled={Boolean(actionId)}
              >
                Activate
              </button>
            ) : null}
            {category.active && !isDeleted ? (
              <button
                type="button"
                className="admin-categories-text-button admin-categories-text-button--warning"
                onClick={() => onRequestToggle(category, false)}
                disabled={Boolean(actionId)}
              >
                Deactivate
              </button>
            ) : null}
            <button
              type="button"
              className="admin-categories-text-button admin-categories-text-button--danger"
              onClick={() => onRequestDelete(category)}
              disabled={isDeleted || Boolean(actionId)}
            >
              Delete
            </button>
          </div>
          {isBusy ? (
            <p className="admin-categories-row__meta" aria-live="polite">
              {isDeleting ? "Deleting..." : isToggling ? "Updating..." : "Loading..."}
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
                  Cancel
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
        setActionError("Deleted categories cannot be edited because restore is not supported.");
        await reloadCategories().catch(() => {});
        return;
      }

      setFormMode("edit");
      setEditingCategoryId(categoryDetail.id);
      setFormValues(getCategoryFormValues(categoryDetail));
    } catch (error) {
      setActionError(
        getCategoryErrorMessage(error, "Category could not be opened."),
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
        getCategoryErrorMessage(error, "Category could not be saved."),
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
        "Soft delete this category? The backend will reject the delete if undeleted products still use it.",
      confirmLabel: "Delete category",
    });
  }

  function requestToggle(category, nextActive) {
    setActionError("");
    setConfirmingAction({
      type: "toggle",
      categoryId: category.id,
      nextActive,
      message: nextActive
        ? "Activate this category for the public catalog?"
        : "Deactivate this category? Products in it will leave public shopping flows.",
      confirmLabel: nextActive ? "Activate category" : "Deactivate category",
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
        getCategoryErrorMessage(error, "Category could not be deleted."),
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
          "Category status could not be changed.",
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
          <p className="admin-categories__kicker">Admin categories</p>
          <h1 id="admin-categories-title">Categories</h1>
        </div>
        <div className="admin-categories__header-actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={handleRetry}
            disabled={categoriesState.status === "loading"}
          >
            Refresh
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={openCreateForm}
            disabled={isSubmitting}
          >
            Create category
          </button>
        </div>
      </header>

      <section className="admin-categories-toolbar" aria-label="Category list controls">
        <div className="admin-category-control">
          <label htmlFor="admin-categories-active-filter">Active filter</label>
          <select
            id="admin-categories-active-filter"
            value={categoryQuery.active}
            onChange={(event) => updateQuery({ active: event.target.value })}
          >
            <option value="all">All categories</option>
            <option value="true">Active flag only</option>
            <option value="false">Inactive flag only</option>
          </select>
        </div>

        {categoriesState.status === "success" ? (
          <dl className="admin-categories-summary" aria-label="Category totals">
            <div>
              <dt>Total</dt>
              <dd>{categories.length}</dd>
            </div>
            <div>
              <dt>Active</dt>
              <dd>{activeCount}</dd>
            </div>
            <div>
              <dt>Inactive</dt>
              <dd>{inactiveCount}</dd>
            </div>
            <div>
              <dt>Deleted</dt>
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
              <h2 id="admin-categories-list-title">Category records</h2>
              {categoriesState.status === "success" ? (
                <p>{categories.length} categories returned by the backend</p>
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
              <h2>No categories returned.</h2>
              <p>
                Adjust the active filter or create the first category for this
                store.
              </p>
              <button
                type="button"
                className="button button--primary"
                onClick={openCreateForm}
              >
                Create category
              </button>
            </div>
          ) : null}

          {categoriesState.status === "loading" ||
          categoriesState.status === "success" ? (
            <div className="admin-categories-table-wrap">
              <table className="admin-categories-table">
                <caption className="sr-only">Admin category records</caption>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">Description</th>
                    <th scope="col">Status</th>
                    <th scope="col">Deleted at</th>
                    <th scope="col">Actions</th>
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
