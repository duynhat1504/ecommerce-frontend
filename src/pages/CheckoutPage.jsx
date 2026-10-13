import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createShippingAddress, getShippingAddresses } from "../api/addressApi";
import { createOrder } from "../api/orderApi";
import useCart from "../cart/useCart";
import ProductImage from "../components/ProductImage/ProductImage";
import { getBackendFieldErrors } from "../utils/authFormUtils";
import { getCheckoutErrorMessage } from "../utils/checkoutErrorMessages";
import { formatCurrency } from "../utils/formatCurrency";
import "./CheckoutPage.css";

const EMPTY_ADDRESS_FORM = {
  recipientName: "",
  phoneNumber: "",
  province: "",
  district: "",
  ward: "",
  addressLine: "",
  defaultAddress: false,
};

function getCartItems(cart) {
  return Array.isArray(cart?.items) ? cart.items : [];
}

function hasUnavailableItems(items) {
  return items.some((item) => item.available === false);
}

function getCartTotal(cart, items) {
  return cart.totalPrice ?? items.reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0,
  );
}

function getCartItemCount(cart, items) {
  return cart.totalItems || items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
}

function validateAddressForm(values) {
  const errors = {};

  if (!values.recipientName.trim()) {
    errors.recipientName = "Vui lòng nhập tên người nhận.";
  }

  if (!values.phoneNumber.trim()) {
    errors.phoneNumber = "Vui lòng nhập số điện thoại.";
  } else if (values.phoneNumber.trim().length > 10) {
    errors.phoneNumber = "Số điện thoại không được quá 10 ký tự.";
  }

  if (!values.province.trim()) {
    errors.province = "Vui lòng nhập tỉnh hoặc thành phố.";
  }

  if (!values.district.trim()) {
    errors.district = "Vui lòng nhập quận hoặc huyện.";
  }

  if (!values.ward.trim()) {
    errors.ward = "Vui lòng nhập phường hoặc xã.";
  }

  if (!values.addressLine.trim()) {
    errors.addressLine = "Vui lòng nhập địa chỉ cụ thể.";
  }

  return errors;
}

function AddressField({
  autoComplete,
  error,
  id,
  label,
  name,
  onChange,
  value,
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="checkout-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
      />
      {error ? (
        <p id={errorId} className="checkout-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CheckoutState({ title, message, action }) {
  return (
    <section className="checkout-state" aria-labelledby="checkout-state-title">
      <p className="checkout-state__kicker">Thanh toán</p>
      <h1 id="checkout-state-title">{title}</h1>
      <p>{message}</p>
      {action}
    </section>
  );
}

function AddressOption({ address, checked, onChange }) {
  const addressLabel = [
    address.recipientName,
    address.phoneNumber,
    address.fullAddress,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <label className="checkout-address-option">
      <input
        type="radio"
        name="shippingAddress"
        value={address.id}
        checked={checked}
        onChange={() => onChange(address.id)}
      />
      <span>
        <strong>
          {address.recipientName || "Người nhận"}
          {address.defaultAddress ? " (mặc định)" : ""}
        </strong>
        <span>{address.phoneNumber}</span>
        <span>{address.fullAddress || addressLabel}</span>
      </span>
    </label>
  );
}

function AddressForm({
  fieldErrors,
  formValues,
  isSubmitting,
  onCancel,
  onChange,
  onSubmit,
}) {
  return (
    <form className="checkout-address-form" onSubmit={onSubmit}>
      <div className="checkout-address-form__grid">
        <AddressField
          id="checkout-recipient-name"
          name="recipientName"
          label="Tên người nhận"
          value={formValues.recipientName}
          onChange={onChange}
          autoComplete="name"
          error={fieldErrors.recipientName}
        />
        <AddressField
          id="checkout-phone-number"
          name="phoneNumber"
          label="Số điện thoại"
          value={formValues.phoneNumber}
          onChange={onChange}
          autoComplete="tel"
          error={fieldErrors.phoneNumber}
        />
        <AddressField
          id="checkout-province"
          name="province"
          label="Tỉnh / Thành phố"
          value={formValues.province}
          onChange={onChange}
          autoComplete="address-level1"
          error={fieldErrors.province}
        />
        <AddressField
          id="checkout-district"
          name="district"
          label="Quận / Huyện"
          value={formValues.district}
          onChange={onChange}
          autoComplete="address-level2"
          error={fieldErrors.district}
        />
        <AddressField
          id="checkout-ward"
          name="ward"
          label="Phường / Xã"
          value={formValues.ward}
          onChange={onChange}
          autoComplete="address-level3"
          error={fieldErrors.ward}
        />
        <AddressField
          id="checkout-address-line"
          name="addressLine"
          label="Địa chỉ cụ thể"
          value={formValues.addressLine}
          onChange={onChange}
          autoComplete="street-address"
          error={fieldErrors.addressLine}
        />
      </div>

      <label className="checkout-checkbox">
        <input
          type="checkbox"
          name="defaultAddress"
          checked={formValues.defaultAddress}
          onChange={onChange}
        />
        <span>Đặt làm địa chỉ mặc định</span>
      </label>

      <div className="checkout-address-form__actions">
        <button
          type="submit"
          className="button button--primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang lưu địa chỉ..." : "Lưu địa chỉ"}
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

function OrderSummary({ cart, items }) {
  const totalItems = getCartItemCount(cart, items);
  const totalPrice = getCartTotal(cart, items);

  return (
    <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
      <h2 id="checkout-summary-title">Tóm tắt đơn hàng</h2>
      <div className="checkout-summary__items">
        {items.map((item) => {
          const productName = item.productName || "Sản phẩm";

          return (
            <article className="checkout-summary-item" key={item.productId}>
              <ProductImage
                src={item.imageUrl}
                alt={productName}
                className="checkout-summary-item__image"
              />
              <div>
                <h3>{productName}</h3>
                <p>Số lượng: {item.quantity}</p>
                {item.available === false ? (
                  <p className="checkout-summary-item__unavailable">
                    {item.unavailableReason || "Không khả dụng"}
                  </p>
                ) : null}
              </div>
              <p className="checkout-summary-item__price">
                {formatCurrency(item.subtotal)}
              </p>
            </article>
          );
        })}
      </div>
      <dl className="checkout-summary__totals">
        <div>
          <dt>Sản phẩm</dt>
          <dd>{totalItems}</dd>
        </div>
        <div>
          <dt>Tổng tiền</dt>
          <dd>{formatCurrency(totalPrice)}</dd>
        </div>
      </dl>
    </aside>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const {
    cart,
    clearCartState,
    error: cartError,
    refreshCart,
    status: cartStatus,
  } = useCart();
  const [addressesState, setAddressesState] = useState({
    status: "loading",
    items: [],
    message: "",
  });
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [addressFieldErrors, setAddressFieldErrors] = useState({});
  const [addressSubmitError, setAddressSubmitError] = useState("");
  const [isAddressSubmitting, setIsAddressSubmitting] = useState(false);
  const [orderState, setOrderState] = useState({
    status: "idle",
    message: "",
  });

  const cartItems = getCartItems(cart);
  const cartHasItems = cartItems.length > 0;
  const cartHasUnavailableItems = hasUnavailableItems(cartItems);
  const cartIsReadyForOrder = cartStatus === "success";
  const selectedAddress = useMemo(
    () => addressesState.items.find((address) => address.id === selectedAddressId),
    [addressesState.items, selectedAddressId],
  );
  const canPlaceOrder =
    cartHasItems &&
    cartIsReadyForOrder &&
    !cartHasUnavailableItems &&
    Boolean(selectedAddressId) &&
    orderState.status !== "submitting";

  useEffect(() => {
    const controller = new AbortController();

    async function loadCheckoutData() {
      setAddressesState({
        status: "loading",
        items: [],
        message: "",
      });

      try {
        const [addresses] = await Promise.all([
          getShippingAddresses({ signal: controller.signal }),
          refreshCart({ signal: controller.signal }),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        const nextAddresses = Array.isArray(addresses) ? addresses : [];
        const defaultAddress =
          nextAddresses.find((address) => address.defaultAddress) ||
          nextAddresses[0];

        setAddressesState({
          status: "success",
          items: nextAddresses,
          message: "",
        });
        setSelectedAddressId((current) => current || defaultAddress?.id || "");
        setIsAddingAddress(nextAddresses.length === 0);
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setAddressesState({
          status: "error",
          items: [],
          message: getCheckoutErrorMessage(
            error,
            "Không thể tải địa chỉ giao hàng.",
          ),
        });
      }
    }

    loadCheckoutData();

    return () => {
      controller.abort();
    };
  }, [refreshCart]);

  function handleAddressInputChange(event) {
    const { checked, name, type, value } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    setAddressForm((current) => ({
      ...current,
      [name]: nextValue,
    }));
    setAddressFieldErrors((current) => ({
      ...current,
      [name]: "",
    }));
    setAddressSubmitError("");
  }

  function resetAddressForm() {
    setAddressForm(EMPTY_ADDRESS_FORM);
    setAddressFieldErrors({});
    setAddressSubmitError("");
  }

  async function reloadAddresses(selectAddressId) {
    const addresses = await getShippingAddresses();
    const nextAddresses = Array.isArray(addresses) ? addresses : [];
    const defaultAddress =
      nextAddresses.find((address) => address.defaultAddress) ||
      nextAddresses[0];

    setAddressesState({
      status: "success",
      items: nextAddresses,
      message: "",
    });
    setSelectedAddressId(selectAddressId || defaultAddress?.id || "");

    return nextAddresses;
  }

  async function handleAddressSubmit(event) {
    event.preventDefault();

    if (isAddressSubmitting) {
      return;
    }

    const validationErrors = validateAddressForm(addressForm);

    if (Object.keys(validationErrors).length > 0) {
      setAddressFieldErrors(validationErrors);
      return;
    }

    setIsAddressSubmitting(true);
    setAddressSubmitError("");
    setAddressFieldErrors({});

    try {
      const createdAddress = await createShippingAddress({
        recipientName: addressForm.recipientName.trim(),
        phoneNumber: addressForm.phoneNumber.trim(),
        province: addressForm.province.trim(),
        district: addressForm.district.trim(),
        ward: addressForm.ward.trim(),
        addressLine: addressForm.addressLine.trim(),
        defaultAddress: addressForm.defaultAddress,
      });

      await reloadAddresses(createdAddress?.id);
      setIsAddingAddress(false);
      resetAddressForm();
    } catch (error) {
      const backendErrors = getBackendFieldErrors(error);

      setAddressFieldErrors(backendErrors);
      setAddressSubmitError(
        getCheckoutErrorMessage(error, "Không thể lưu địa chỉ."),
      );
    } finally {
      setIsAddressSubmitting(false);
    }
  }

  async function handlePlaceOrder() {
    if (!canPlaceOrder) {
      setOrderState((current) => ({
        ...current,
        message: selectedAddressId
          ? "Hãy kiểm tra giỏ hàng trước khi đặt đơn."
          : "Hãy chọn địa chỉ giao hàng trước khi đặt đơn.",
      }));
      return;
    }

    setOrderState({
      status: "submitting",
      message: "",
    });

    try {
      const order = await createOrder({ addressId: selectedAddressId });

      clearCartState();

      if (!order?.id) {
        setOrderState({
          status: "error",
          message: "Đơn hàng đã được tạo, nhưng không thể mở liên kết thanh toán.",
        });
        return;
      }

      navigate(`/payment/${encodeURIComponent(order.id)}`);
      setOrderState({
        status: "idle",
        message: "",
      });
    } catch (error) {
      const message = getCheckoutErrorMessage(
        error,
        "Không thể tạo đơn hàng. Vui lòng thử lại.",
      );

      setOrderState({
        status: "error",
        message,
      });

      try {
        await refreshCart();
      } catch {
        // Keep the order failure visible. CartContext owns the cart load error.
      }
    }
  }

  function handleRetryAddressLoad() {
    setAddressesState((current) => ({
      ...current,
      status: "loading",
      message: "",
    }));

    getShippingAddresses()
      .then((addresses) => {
        const nextAddresses = Array.isArray(addresses) ? addresses : [];
        const defaultAddress =
          nextAddresses.find((address) => address.defaultAddress) ||
          nextAddresses[0];

        setAddressesState({
          status: "success",
          items: nextAddresses,
          message: "",
        });
        setSelectedAddressId(defaultAddress?.id || "");
        setIsAddingAddress(nextAddresses.length === 0);
      })
      .catch((error) => {
        setAddressesState({
          status: "error",
          items: [],
          message: getCheckoutErrorMessage(
            error,
            "Không thể tải địa chỉ giao hàng.",
          ),
        });
      });
  }

  function handleRetryCartLoad() {
    refreshCart().catch(() => {
      // CartContext keeps the visible load error state.
    });
  }

  if (cartStatus === "loading" && !cartHasItems) {
    return (
      <CheckoutState
        title="Đang tải thanh toán."
        message="Giỏ hàng và địa chỉ giao hàng của bạn đang được chuẩn bị."
      />
    );
  }

  if (cartStatus === "error" && !cartHasItems) {
    return (
      <CheckoutState
        title="Thanh toán không khả dụng."
        message={cartError || "Không thể tải giỏ hàng của bạn vào lúc này."}
        action={
          <button type="button" className="button button--ghost" onClick={handleRetryCartLoad}>
            Thử lại
          </button>
        }
      />
    );
  }

  if (!cartHasItems) {
    return (
      <CheckoutState
        title="Giỏ hàng của bạn đang trống."
        message="Hãy thêm sản phẩm vào giỏ hàng trước khi thanh toán."
        action={
          <Link className="button button--primary" to="/products">
            Xem sản phẩm
          </Link>
        }
      />
    );
  }

  return (
    <section className="checkout-page" aria-labelledby="checkout-title">
      <div className="checkout-page__header">
        <p className="checkout-page__kicker">Thanh toán</p>
        <h1 id="checkout-title">Thanh toán</h1>
        <p>Chọn địa chỉ giao hàng và kiểm tra giỏ hàng trước khi đặt đơn.</p>
      </div>

      <div className="checkout-layout">
        <div className="checkout-main">
          <section className="checkout-section" aria-labelledby="shipping-title">
            <div className="checkout-section__header">
              <h2 id="shipping-title">Địa chỉ giao hàng</h2>
              {addressesState.status === "success" && addressesState.items.length > 0 ? (
                <button
                  type="button"
                  className="checkout-text-button"
                  onClick={() => {
                    resetAddressForm();
                    setIsAddingAddress((current) => !current);
                  }}
                >
                  {isAddingAddress ? "Dùng địa chỉ đã lưu" : "Thêm địa chỉ"}
                </button>
              ) : null}
            </div>

            {addressesState.status === "loading" ? (
              <p className="checkout-inline-state" aria-live="polite">
                Đang tải địa chỉ giao hàng...
              </p>
            ) : null}

            {addressesState.status === "error" ? (
              <div className="checkout-inline-error" role="alert">
                <p>{addressesState.message}</p>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={handleRetryAddressLoad}
                >
                  Thử lại
                </button>
              </div>
            ) : null}

            {addressesState.status === "success" && addressesState.items.length > 0 ? (
              <fieldset className="checkout-address-list">
                <legend>Chọn một địa chỉ đã lưu</legend>
                {addressesState.items.map((address) => (
                  <AddressOption
                    key={address.id}
                    address={address}
                    checked={address.id === selectedAddressId}
                    onChange={setSelectedAddressId}
                  />
                ))}
              </fieldset>
            ) : null}

            {addressesState.status === "success" && addressesState.items.length === 0 ? (
              <div className="checkout-no-address">
                <p>Chưa có địa chỉ giao hàng.</p>
                <p>Thêm địa chỉ tại đây để tiếp tục thanh toán.</p>
              </div>
            ) : null}

            {isAddingAddress ? (
              <div className="checkout-address-create">
                <h3>Thêm địa chỉ giao hàng</h3>
                {addressSubmitError ? (
                  <p className="checkout-inline-error__message" role="alert">
                    {addressSubmitError}
                  </p>
                ) : null}
                <AddressForm
                  fieldErrors={addressFieldErrors}
                  formValues={addressForm}
                  isSubmitting={isAddressSubmitting}
                  onCancel={() => {
                    resetAddressForm();
                    setIsAddingAddress(addressesState.items.length === 0);
                  }}
                  onChange={handleAddressInputChange}
                  onSubmit={handleAddressSubmit}
                />
              </div>
            ) : null}
          </section>

          <section className="checkout-section" aria-labelledby="review-title">
            <h2 id="review-title">Kiểm tra đơn hàng</h2>
            {cartStatus === "loading" ? (
              <p className="checkout-inline-state" aria-live="polite">
                Đang làm mới giỏ hàng...
              </p>
            ) : null}

            {cartStatus === "error" ? (
              <div className="checkout-inline-error" role="alert">
                <p>
                  Không thể làm mới giỏ hàng. Hãy thử lại trước khi đặt đơn.
                </p>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={handleRetryCartLoad}
                >
                  Thử lại
                </button>
              </div>
            ) : null}

            {cartStatus === "success" && cartHasUnavailableItems ? (
              <div className="checkout-inline-error" role="alert">
                <p>
                  Một số sản phẩm trong giỏ không khả dụng. Hãy quay lại giỏ hàng để cập nhật trước khi đặt đơn.
                </p>
                <Link className="button button--ghost" to="/cart">
                  Quay lại giỏ hàng
                </Link>
              </div>
            ) : null}

            {cartStatus === "success" && !cartHasUnavailableItems ? (
              <p className="checkout-inline-state">
                Giỏ hàng đã sẵn sàng để tạo đơn.
              </p>
            ) : null}
          </section>

          {orderState.message ? (
            <p className="checkout-order-error" role="alert">
              {orderState.message}
            </p>
          ) : null}
        </div>

        <div className="checkout-side">
          <OrderSummary cart={cart} items={cartItems} />
          <section className="checkout-place-order" aria-labelledby="place-order-title">
            <h2 id="place-order-title">Đặt hàng</h2>
            {selectedAddress ? (
              <p>
                Giao đến {selectedAddress.recipientName}.
              </p>
            ) : (
              <p>Chọn địa chỉ giao hàng để tiếp tục.</p>
            )}
            <button
              type="button"
              className="button button--primary checkout-place-order__button"
              onClick={handlePlaceOrder}
              disabled={!canPlaceOrder}
            >
              {orderState.status === "submitting" ? "Đang đặt hàng..." : "Đặt hàng"}
            </button>
          </section>
        </div>
      </div>
    </section>
  );
}
