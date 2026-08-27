import { useEffect, useMemo, useState } from "react";

import {
  createShippingAddress,
  deleteShippingAddress,
  getShippingAddresses,
  setDefaultShippingAddress,
  updateShippingAddress,
} from "../api/addressApi";
import AccountNavigation from "../components/Account/AccountNavigation";
import { getBackendFieldErrors } from "../utils/authFormUtils";
import "./AccountAddressesPage.css";

const EMPTY_ADDRESS_FORM = {
  recipientName: "",
  phoneNumber: "",
  province: "",
  district: "",
  ward: "",
  addressLine: "",
  defaultAddress: false,
};

const FIELD_LABELS = {
  recipientName: "Recipient name",
  phoneNumber: "Phone number",
  province: "Province",
  district: "District",
  ward: "Ward",
  addressLine: "Address line",
};

function getAddressLoadErrorMessage(error) {
  if (error?.status === 401 || error?.status === 403) {
    return "Sign in again to view your addresses.";
  }

  if (error?.status >= 500) {
    return "Addresses are unavailable right now. Please try again later.";
  }

  if (!error?.status) {
    return "Network connection failed. Please check your connection and try again.";
  }

  return "Addresses could not be loaded right now.";
}

function getAddressMutationErrorMessage(error, fallback) {
  if (error?.status === 401 || error?.status === 403) {
    return "Sign in again before changing addresses.";
  }

  if (error?.status === 400) {
    return "Check the highlighted fields and try again.";
  }

  if (error?.status === 404) {
    return "This address is no longer available.";
  }

  if (error?.status >= 500) {
    return "Addresses are unavailable right now. Please try again later.";
  }

  if (!error?.status) {
    return "Network connection failed. Please check your connection and try again.";
  }

  return fallback;
}

function getAddressActionErrorMessage(error, fallback) {
  if (error?.status === 401 || error?.status === 403) {
    return "Sign in again before changing addresses.";
  }

  if (error?.status === 404) {
    return "This address is no longer available.";
  }

  if (error?.status >= 500) {
    return "Addresses are unavailable right now. Please try again later.";
  }

  if (!error?.status) {
    return "Network connection failed. Please check your connection and try again.";
  }

  return fallback;
}

function getAddressFormErrors(values, mode) {
  const errors = {};
  const phoneLimit = mode === "edit" ? 30 : 10;

  Object.entries(FIELD_LABELS).forEach(([field, label]) => {
    if (!values[field].trim()) {
      errors[field] = `${label} is required.`;
    }
  });

  if (values.recipientName.trim().length > 150) {
    errors.recipientName = "Recipient name must be 150 characters or fewer.";
  }

  if (values.phoneNumber.trim().length > phoneLimit) {
    errors.phoneNumber = `Phone number must be ${phoneLimit} characters or fewer.`;
  }

  if (values.province.trim().length > 100) {
    errors.province = "Province must be 100 characters or fewer.";
  }

  if (values.district.trim().length > 100) {
    errors.district = "District must be 100 characters or fewer.";
  }

  if (values.ward.trim().length > 100) {
    errors.ward = "Ward must be 100 characters or fewer.";
  }

  if (values.addressLine.trim().length > 255) {
    errors.addressLine = "Address line must be 255 characters or fewer.";
  }

  return errors;
}

function getBackendAddressErrors(error) {
  const backendErrors = getBackendFieldErrors(error);

  return Object.fromEntries(
    Object.entries(backendErrors).map(([field, message]) => [
      field,
      String(message || ""),
    ]),
  );
}

function getAddressFormPayload(values) {
  return {
    recipientName: values.recipientName.trim(),
    phoneNumber: values.phoneNumber.trim(),
    province: values.province.trim(),
    district: values.district.trim(),
    ward: values.ward.trim(),
    addressLine: values.addressLine.trim(),
  };
}

function getAddressSummary(address) {
  return (
    address?.fullAddress ||
    [
      address?.addressLine,
      address?.ward,
      address?.district,
      address?.province,
    ]
      .filter(Boolean)
      .join(", ")
  );
}

function AddressField({
  autoComplete,
  error,
  id,
  label,
  maxLength,
  name,
  onChange,
  value,
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="account-address-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
      />
      {error ? (
        <p id={errorId} className="account-address-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function AddressForm({
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
    <form className="account-address-form" onSubmit={onSubmit}>
      <div className="account-address-form__grid">
        <AddressField
          id="account-address-recipient-name"
          name="recipientName"
          label="Recipient name"
          value={formValues.recipientName}
          onChange={onChange}
          autoComplete="name"
          maxLength={150}
          error={fieldErrors.recipientName}
        />
        <AddressField
          id="account-address-phone-number"
          name="phoneNumber"
          label="Phone number"
          value={formValues.phoneNumber}
          onChange={onChange}
          autoComplete="tel"
          maxLength={isEdit ? 30 : 10}
          error={fieldErrors.phoneNumber}
        />
        <AddressField
          id="account-address-province"
          name="province"
          label="Province"
          value={formValues.province}
          onChange={onChange}
          autoComplete="address-level1"
          maxLength={100}
          error={fieldErrors.province}
        />
        <AddressField
          id="account-address-district"
          name="district"
          label="District"
          value={formValues.district}
          onChange={onChange}
          autoComplete="address-level2"
          maxLength={100}
          error={fieldErrors.district}
        />
        <AddressField
          id="account-address-ward"
          name="ward"
          label="Ward"
          value={formValues.ward}
          onChange={onChange}
          autoComplete="address-level3"
          maxLength={100}
          error={fieldErrors.ward}
        />
        <AddressField
          id="account-address-line"
          name="addressLine"
          label="Address line"
          value={formValues.addressLine}
          onChange={onChange}
          autoComplete="street-address"
          maxLength={255}
          error={fieldErrors.addressLine}
        />
      </div>

      {!isEdit ? (
        <label className="account-address-checkbox">
          <input
            type="checkbox"
            name="defaultAddress"
            checked={formValues.defaultAddress}
            onChange={onChange}
          />
          <span>Use as default address</span>
        </label>
      ) : null}

      <div className="account-address-form__actions">
        <button
          type="submit"
          className="button button--primary"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Saving address..."
            : isEdit
              ? "Save changes"
              : "Save address"}
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

function AccountAddressesSkeleton() {
  return (
    <div className="account-address-list" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="account-address-row account-address-row--loading" key={index}>
          <span className="account-address-skeleton account-address-skeleton--name" />
          <span className="account-address-skeleton account-address-skeleton--address" />
          <span className="account-address-skeleton account-address-skeleton--actions" />
        </div>
      ))}
    </div>
  );
}

function AddressRow({
  actionAddressId,
  address,
  confirmingDeleteId,
  onCancelDelete,
  onConfirmDelete,
  onDeleteStart,
  onEdit,
  onSetDefault,
}) {
  const isDefault = Boolean(address.defaultAddress);
  const isDeleting = actionAddressId === `delete:${address.id}`;
  const isSettingDefault = actionAddressId === `default:${address.id}`;
  const isConfirmingDelete = confirmingDeleteId === address.id;

  return (
    <article
      className="account-address-row"
      aria-label={address.recipientName || "Saved address"}
    >
      <div className="account-address-row__main">
        <div className="account-address-row__heading">
          <h3>{address.recipientName || "Recipient"}</h3>
          {isDefault ? (
            <span className="account-address-default">Default</span>
          ) : null}
        </div>
        <p>{address.phoneNumber || "Phone unavailable"}</p>
        <p>{getAddressSummary(address) || "Address unavailable"}</p>
      </div>

      <div className="account-address-row__actions">
        <button
          type="button"
          className="account-address-text-button"
          onClick={() => onEdit(address)}
          disabled={Boolean(actionAddressId)}
        >
          Edit
        </button>
        {!isDefault ? (
          <button
            type="button"
            className="account-address-text-button"
            onClick={() => onSetDefault(address.id)}
            disabled={Boolean(actionAddressId)}
          >
            {isSettingDefault ? "Setting..." : "Set default"}
          </button>
        ) : null}
        <button
          type="button"
          className="account-address-text-button account-address-text-button--danger"
          onClick={() => onDeleteStart(address.id)}
          disabled={Boolean(actionAddressId)}
        >
          Delete
        </button>
      </div>

      {isConfirmingDelete ? (
        <div className="account-address-confirm" role="alert">
          <p>Delete this address? This cannot be undone.</p>
          <div>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => onConfirmDelete(address.id)}
              disabled={Boolean(actionAddressId)}
            >
              {isDeleting ? "Deleting..." : "Delete address"}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={onCancelDelete}
              disabled={Boolean(actionAddressId)}
            >
              Keep address
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function AccountAddressesPage() {
  const [addressesState, setAddressesState] = useState({
    status: "loading",
    items: [],
    message: "",
  });
  const [retryKey, setRetryKey] = useState(0);
  const [formMode, setFormMode] = useState("closed");
  const [editingAddressId, setEditingAddressId] = useState("");
  const [formValues, setFormValues] = useState(EMPTY_ADDRESS_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionAddressId, setActionAddressId] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState("");

  const addresses = addressesState.items;
  const hasAddresses = addresses.length > 0;
  const isFormOpen = formMode === "create" || formMode === "edit";
  const defaultAddress = useMemo(
    () => addresses.find((address) => address.defaultAddress),
    [addresses],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadAddresses() {
      setAddressesState({
        status: "loading",
        items: [],
        message: "",
      });

      try {
        const response = await getShippingAddresses({ signal: controller.signal });
        const nextAddresses = Array.isArray(response) ? response : [];

        if (controller.signal.aborted) {
          return;
        }

        setAddressesState({
          status: "success",
          items: nextAddresses,
          message: "",
        });

        if (nextAddresses.length === 0) {
          setFormMode("create");
          setEditingAddressId("");
          setFormValues(EMPTY_ADDRESS_FORM);
          setFieldErrors({});
          setFormError("");
          setActionError("");
          setConfirmingDeleteId("");
        }
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setAddressesState({
          status: "error",
          items: [],
          message: getAddressLoadErrorMessage(error),
        });
      }
    }

    loadAddresses();

    return () => {
      controller.abort();
    };
  }, [retryKey]);

  async function reloadAddresses() {
    const response = await getShippingAddresses();
    const nextAddresses = Array.isArray(response) ? response : [];

    setAddressesState({
      status: "success",
      items: nextAddresses,
      message: "",
    });

    return nextAddresses;
  }

  function resetForm() {
    setFormMode("closed");
    setEditingAddressId("");
    setFormValues(EMPTY_ADDRESS_FORM);
    setFieldErrors({});
    setFormError("");
  }

  function openCreateForm() {
    setFormMode("create");
    setEditingAddressId("");
    setFormValues(EMPTY_ADDRESS_FORM);
    setFieldErrors({});
    setFormError("");
    setActionError("");
    setConfirmingDeleteId("");
  }

  function openEditForm(address) {
    setFormMode("edit");
    setEditingAddressId(address.id);
    setFormValues({
      recipientName: address.recipientName || "",
      phoneNumber: address.phoneNumber || "",
      province: address.province || "",
      district: address.district || "",
      ward: address.ward || "",
      addressLine: address.addressLine || "",
      defaultAddress: Boolean(address.defaultAddress),
    });
    setFieldErrors({});
    setFormError("");
    setActionError("");
    setConfirmingDeleteId("");
  }

  function handleFormChange(event) {
    const { checked, name, type, value } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

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

    const nextFieldErrors = getAddressFormErrors(formValues, formMode);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError("");

    try {
      if (formMode === "edit") {
        await updateShippingAddress(editingAddressId, getAddressFormPayload(formValues));
      } else {
        await createShippingAddress({
          ...getAddressFormPayload(formValues),
          defaultAddress: formValues.defaultAddress,
        });
      }

      await reloadAddresses();
      resetForm();
    } catch (error) {
      setFieldErrors(getBackendAddressErrors(error));
      setFormError(
        getAddressMutationErrorMessage(error, "Address could not be saved."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetDefault(addressId) {
    if (actionAddressId) {
      return;
    }

    setActionAddressId(`default:${addressId}`);
    setActionError("");
    setConfirmingDeleteId("");

    try {
      await setDefaultShippingAddress(addressId);
      await reloadAddresses();
    } catch (error) {
      setActionError(
        getAddressActionErrorMessage(error, "Default address could not be changed."),
      );
      await reloadAddresses().catch(() => {});
    } finally {
      setActionAddressId("");
    }
  }

  async function handleDelete(addressId) {
    if (actionAddressId) {
      return;
    }

    setActionAddressId(`delete:${addressId}`);
    setActionError("");

    try {
      await deleteShippingAddress(addressId);
      const nextAddresses = await reloadAddresses();

      setConfirmingDeleteId("");

      if (editingAddressId === addressId || nextAddresses.length === 0) {
        resetForm();
      }

      if (nextAddresses.length === 0) {
        openCreateForm();
      }
    } catch (error) {
      setActionError(
        getAddressActionErrorMessage(error, "Address could not be deleted."),
      );
      await reloadAddresses().catch(() => {});
    } finally {
      setActionAddressId("");
    }
  }

  function handleRetry() {
    resetForm();
    setActionError("");
    setConfirmingDeleteId("");
    setRetryKey((key) => key + 1);
  }

  if (addressesState.status === "error") {
    return (
      <section
        className="account-addresses-state"
        aria-labelledby="account-addresses-state-title"
        role="alert"
      >
        <p className="account-addresses-state__kicker">Account</p>
        <h1 id="account-addresses-state-title">Addresses unavailable.</h1>
        <p>{addressesState.message}</p>
        <button type="button" className="button button--ghost" onClick={handleRetry}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="account-addresses-page" aria-labelledby="account-addresses-title">
      <div className="account-addresses-page__header">
        <p className="account-addresses-page__kicker">Account</p>
        <h1 id="account-addresses-title">Addresses</h1>
        <p>Manage the saved shipping addresses for this account.</p>
        <AccountNavigation />
      </div>

      <div className="account-addresses-layout">
        <section
          className="account-addresses-section"
          aria-labelledby="account-address-list-title"
        >
          <div className="account-addresses-section__header">
            <div>
              <h2 id="account-address-list-title">Saved addresses</h2>
              {addressesState.status === "success" && hasAddresses ? (
                <p>
                  {addresses.length}{" "}
                  {addresses.length === 1 ? "address" : "addresses"} saved.{" "}
                  {defaultAddress
                    ? `${defaultAddress.recipientName || "One address"} is default.`
                    : ""}
                </p>
              ) : null}
            </div>
            {addressesState.status === "success" && hasAddresses ? (
              <button
                type="button"
                className="button button--ghost"
                onClick={openCreateForm}
                disabled={isSubmitting || Boolean(actionAddressId)}
              >
                Add address
              </button>
            ) : null}
          </div>

          {addressesState.status === "loading" ? <AccountAddressesSkeleton /> : null}

          {addressesState.status === "success" && !hasAddresses ? (
            <div className="account-addresses-empty">
              <h2>No addresses yet.</h2>
              <p>Add a shipping address to make future checkouts faster.</p>
            </div>
          ) : null}

          {actionError ? (
            <p className="account-address-alert" role="alert">
              {actionError}
            </p>
          ) : null}

          {addressesState.status === "success" && hasAddresses ? (
            <div className="account-address-list">
              {addresses.map((address) => (
                <AddressRow
                  key={address.id}
                  actionAddressId={actionAddressId}
                  address={address}
                  confirmingDeleteId={confirmingDeleteId}
                  onCancelDelete={() => setConfirmingDeleteId("")}
                  onConfirmDelete={handleDelete}
                  onDeleteStart={(addressId) => {
                    setActionError("");
                    setConfirmingDeleteId(addressId);
                  }}
                  onEdit={openEditForm}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section
          className="account-addresses-section"
          aria-labelledby="account-address-form-title"
        >
          <div className="account-addresses-section__header">
            <div>
              <h2 id="account-address-form-title">
                {formMode === "edit" ? "Edit address" : "Add address"}
              </h2>
              <p>
                {formMode === "edit"
                  ? "Default status is changed from the saved address list."
                  : "The first address becomes default automatically."}
              </p>
            </div>
          </div>

          {isFormOpen ? (
            <>
              {formError ? (
                <p className="account-address-alert" role="alert">
                  {formError}
                </p>
              ) : null}
              <AddressForm
                fieldErrors={fieldErrors}
                formMode={formMode}
                formValues={formValues}
                isSubmitting={isSubmitting}
                onCancel={resetForm}
                onChange={handleFormChange}
                onSubmit={handleFormSubmit}
              />
            </>
          ) : (
            <div className="account-addresses-idle">
              <p>Select an address to edit, or add a new one.</p>
              <button
                type="button"
                className="button button--primary"
                onClick={openCreateForm}
                disabled={Boolean(actionAddressId)}
              >
                Add address
              </button>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
