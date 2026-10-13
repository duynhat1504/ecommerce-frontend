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
  recipientName: "Tên người nhận",
  phoneNumber: "Số điện thoại",
  province: "Tỉnh / Thành phố",
  district: "Quận / Huyện",
  ward: "Phường / Xã",
  addressLine: "Địa chỉ cụ thể",
};

function getAddressLoadErrorMessage(error) {
  if (error?.status === 401 || error?.status === 403) {
    return "Hãy đăng nhập lại để xem địa chỉ.";
  }

  if (error?.status >= 500) {
    return "Địa chỉ hiện không khả dụng. Vui lòng thử lại sau.";
  }

  if (!error?.status) {
    return "Kết nối mạng thất bại. Vui lòng kiểm tra kết nối rồi thử lại.";
  }

  return "Không thể tải địa chỉ vào lúc này.";
}

function getAddressMutationErrorMessage(error, fallback) {
  if (error?.status === 401 || error?.status === 403) {
    return "Hãy đăng nhập lại trước khi thay đổi địa chỉ.";
  }

  if (error?.status === 400) {
    return "Kiểm tra các trường được đánh dấu rồi thử lại.";
  }

  if (error?.status === 404) {
    return "Địa chỉ này không còn khả dụng.";
  }

  if (error?.status >= 500) {
    return "Địa chỉ hiện không khả dụng. Vui lòng thử lại sau.";
  }

  if (!error?.status) {
    return "Kết nối mạng thất bại. Vui lòng kiểm tra kết nối rồi thử lại.";
  }

  return fallback;
}

function getAddressActionErrorMessage(error, fallback) {
  if (error?.status === 401 || error?.status === 403) {
    return "Hãy đăng nhập lại trước khi thay đổi địa chỉ.";
  }

  if (error?.status === 404) {
    return "Địa chỉ này không còn khả dụng.";
  }

  if (error?.status >= 500) {
    return "Địa chỉ hiện không khả dụng. Vui lòng thử lại sau.";
  }

  if (!error?.status) {
    return "Kết nối mạng thất bại. Vui lòng kiểm tra kết nối rồi thử lại.";
  }

  return fallback;
}

function getAddressFormErrors(values, mode) {
  const errors = {};
  const phoneLimit = mode === "edit" ? 30 : 10;

  Object.entries(FIELD_LABELS).forEach(([field, label]) => {
    if (!values[field].trim()) {
      errors[field] = `Vui lòng nhập ${label.toLowerCase()}.`;
    }
  });

  if (values.recipientName.trim().length > 150) {
    errors.recipientName = "Tên người nhận không được quá 150 ký tự.";
  }

  if (values.phoneNumber.trim().length > phoneLimit) {
    errors.phoneNumber = `Số điện thoại không được quá ${phoneLimit} ký tự.`;
  }

  if (values.province.trim().length > 100) {
    errors.province = "Tỉnh / Thành phố không được quá 100 ký tự.";
  }

  if (values.district.trim().length > 100) {
    errors.district = "Quận / Huyện không được quá 100 ký tự.";
  }

  if (values.ward.trim().length > 100) {
    errors.ward = "Phường / Xã không được quá 100 ký tự.";
  }

  if (values.addressLine.trim().length > 255) {
    errors.addressLine = "Địa chỉ cụ thể không được quá 255 ký tự.";
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
          label="Tên người nhận"
          value={formValues.recipientName}
          onChange={onChange}
          autoComplete="name"
          maxLength={150}
          error={fieldErrors.recipientName}
        />
        <AddressField
          id="account-address-phone-number"
          name="phoneNumber"
          label="Số điện thoại"
          value={formValues.phoneNumber}
          onChange={onChange}
          autoComplete="tel"
          maxLength={isEdit ? 30 : 10}
          error={fieldErrors.phoneNumber}
        />
        <AddressField
          id="account-address-province"
          name="province"
          label="Tỉnh / Thành phố"
          value={formValues.province}
          onChange={onChange}
          autoComplete="address-level1"
          maxLength={100}
          error={fieldErrors.province}
        />
        <AddressField
          id="account-address-district"
          name="district"
          label="Quận / Huyện"
          value={formValues.district}
          onChange={onChange}
          autoComplete="address-level2"
          maxLength={100}
          error={fieldErrors.district}
        />
        <AddressField
          id="account-address-ward"
          name="ward"
          label="Phường / Xã"
          value={formValues.ward}
          onChange={onChange}
          autoComplete="address-level3"
          maxLength={100}
          error={fieldErrors.ward}
        />
        <AddressField
          id="account-address-line"
          name="addressLine"
          label="Địa chỉ cụ thể"
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
          <span>Đặt làm địa chỉ mặc định</span>
        </label>
      ) : null}

      <div className="account-address-form__actions">
        <button
          type="submit"
          className="button button--primary"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Đang lưu địa chỉ..."
            : isEdit
              ? "Lưu thay đổi"
              : "Lưu địa chỉ"}
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
      aria-label={address.recipientName || "Địa chỉ đã lưu"}
    >
      <div className="account-address-row__main">
        <div className="account-address-row__heading">
          <h3>{address.recipientName || "Người nhận"}</h3>
          {isDefault ? (
            <span className="account-address-default">Mặc định</span>
          ) : null}
        </div>
        <p>{address.phoneNumber || "Không có số điện thoại"}</p>
        <p>{getAddressSummary(address) || "Địa chỉ không khả dụng"}</p>
      </div>

      <div className="account-address-row__actions">
        <button
          type="button"
          className="account-address-text-button"
          onClick={() => onEdit(address)}
          disabled={Boolean(actionAddressId)}
        >
          Sửa
        </button>
        {!isDefault ? (
          <button
            type="button"
            className="account-address-text-button"
            onClick={() => onSetDefault(address.id)}
            disabled={Boolean(actionAddressId)}
          >
            {isSettingDefault ? "Đang đặt..." : "Đặt mặc định"}
          </button>
        ) : null}
        <button
          type="button"
          className="account-address-text-button account-address-text-button--danger"
          onClick={() => onDeleteStart(address.id)}
          disabled={Boolean(actionAddressId)}
        >
          Xóa
        </button>
      </div>

      {isConfirmingDelete ? (
        <div className="account-address-confirm" role="alert">
          <p>Xóa địa chỉ này? Thao tác này không thể hoàn tác.</p>
          <div>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => onConfirmDelete(address.id)}
              disabled={Boolean(actionAddressId)}
            >
              {isDeleting ? "Đang xóa..." : "Xóa địa chỉ"}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={onCancelDelete}
              disabled={Boolean(actionAddressId)}
            >
              Giữ địa chỉ
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
        getAddressMutationErrorMessage(error, "Không thể lưu địa chỉ."),
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
        getAddressActionErrorMessage(error, "Không thể đổi địa chỉ mặc định."),
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
        getAddressActionErrorMessage(error, "Không thể xóa địa chỉ."),
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
        <p className="account-addresses-state__kicker">Tài khoản</p>
        <h1 id="account-addresses-state-title">Địa chỉ không khả dụng.</h1>
        <p>{addressesState.message}</p>
        <button type="button" className="button button--ghost" onClick={handleRetry}>
          Thử lại
        </button>
      </section>
    );
  }

  return (
    <section className="account-addresses-page" aria-labelledby="account-addresses-title">
      <div className="account-addresses-page__header">
        <p className="account-addresses-page__kicker">Tài khoản</p>
        <h1 id="account-addresses-title">Địa chỉ</h1>
        <p>Quản lý các địa chỉ giao hàng đã lưu cho tài khoản này.</p>
        <AccountNavigation />
      </div>

      <div className="account-addresses-layout">
        <section
          className="account-addresses-section"
          aria-labelledby="account-address-list-title"
        >
          <div className="account-addresses-section__header">
            <div>
              <h2 id="account-address-list-title">Địa chỉ đã lưu</h2>
              {addressesState.status === "success" && hasAddresses ? (
                <p>
                  {addresses.length}{" "}
                  địa chỉ đã lưu.{" "}
                  {defaultAddress
                    ? `${defaultAddress.recipientName || "Một địa chỉ"} là địa chỉ mặc định.`
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
                Thêm địa chỉ
              </button>
            ) : null}
          </div>

          {addressesState.status === "loading" ? <AccountAddressesSkeleton /> : null}

          {addressesState.status === "success" && !hasAddresses ? (
            <div className="account-addresses-empty">
            <h2>Chưa có địa chỉ.</h2>
            <p>Thêm địa chỉ giao hàng để thanh toán nhanh hơn trong các lần sau.</p>
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
                {formMode === "edit" ? "Sửa địa chỉ" : "Thêm địa chỉ"}
              </h2>
              <p>
                {formMode === "edit"
                  ? "Trạng thái mặc định được thay đổi từ danh sách địa chỉ đã lưu."
                  : "Địa chỉ đầu tiên sẽ tự động trở thành địa chỉ mặc định."}
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
              <p>Chọn một địa chỉ để sửa, hoặc thêm địa chỉ mới.</p>
              <button
                type="button"
                className="button button--primary"
                onClick={openCreateForm}
                disabled={Boolean(actionAddressId)}
              >
                Thêm địa chỉ
              </button>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
