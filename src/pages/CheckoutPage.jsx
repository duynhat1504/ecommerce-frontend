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
    errors.recipientName = "Recipient name is required.";
  }

  if (!values.phoneNumber.trim()) {
    errors.phoneNumber = "Phone number is required.";
  } else if (values.phoneNumber.trim().length > 10) {
    errors.phoneNumber = "Phone number must be 10 characters or fewer.";
  }

  if (!values.province.trim()) {
    errors.province = "Province is required.";
  }

  if (!values.district.trim()) {
    errors.district = "District is required.";
  }

  if (!values.ward.trim()) {
    errors.ward = "Ward is required.";
  }

  if (!values.addressLine.trim()) {
    errors.addressLine = "Address line is required.";
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
      <p className="checkout-state__kicker">Checkout</p>
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
          {address.recipientName || "Recipient"}
          {address.defaultAddress ? " (default)" : ""}
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
          label="Recipient name"
          value={formValues.recipientName}
          onChange={onChange}
          autoComplete="name"
          error={fieldErrors.recipientName}
        />
        <AddressField
          id="checkout-phone-number"
          name="phoneNumber"
          label="Phone number"
          value={formValues.phoneNumber}
          onChange={onChange}
          autoComplete="tel"
          error={fieldErrors.phoneNumber}
        />
        <AddressField
          id="checkout-province"
          name="province"
          label="Province"
          value={formValues.province}
          onChange={onChange}
          autoComplete="address-level1"
          error={fieldErrors.province}
        />
        <AddressField
          id="checkout-district"
          name="district"
          label="District"
          value={formValues.district}
          onChange={onChange}
          autoComplete="address-level2"
          error={fieldErrors.district}
        />
        <AddressField
          id="checkout-ward"
          name="ward"
          label="Ward"
          value={formValues.ward}
          onChange={onChange}
          autoComplete="address-level3"
          error={fieldErrors.ward}
        />
        <AddressField
          id="checkout-address-line"
          name="addressLine"
          label="Address line"
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
        <span>Use as default address</span>
      </label>

      <div className="checkout-address-form__actions">
        <button
          type="submit"
          className="button button--primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving address..." : "Save address"}
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

function OrderSummary({ cart, items }) {
  const totalItems = getCartItemCount(cart, items);
  const totalPrice = getCartTotal(cart, items);

  return (
    <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
      <h2 id="checkout-summary-title">Order summary</h2>
      <div className="checkout-summary__items">
        {items.map((item) => {
          const productName = item.productName || "Product";

          return (
            <article className="checkout-summary-item" key={item.productId}>
              <ProductImage
                src={item.imageUrl}
                alt={productName}
                className="checkout-summary-item__image"
              />
              <div>
                <h3>{productName}</h3>
                <p>Quantity {item.quantity}</p>
                {item.available === false ? (
                  <p className="checkout-summary-item__unavailable">
                    {item.unavailableReason || "Unavailable"}
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
          <dt>Items</dt>
          <dd>{totalItems}</dd>
        </div>
        <div>
          <dt>Total</dt>
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
            "Shipping addresses could not be loaded.",
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
        getCheckoutErrorMessage(error, "Address could not be saved."),
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
          ? "Review your cart before placing this order."
          : "Choose a shipping address before placing this order.",
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
          message: "Order was created, but the payment link could not be opened.",
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
        "Order could not be created. Please try again.",
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
            "Shipping addresses could not be loaded.",
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
        title="Loading checkout."
        message="Your cart and shipping addresses are being prepared."
      />
    );
  }

  if (cartStatus === "error" && !cartHasItems) {
    return (
      <CheckoutState
        title="Checkout unavailable."
        message={cartError || "Your cart could not be loaded right now."}
        action={
          <button type="button" className="button button--ghost" onClick={handleRetryCartLoad}>
            Retry
          </button>
        }
      />
    );
  }

  if (!cartHasItems) {
    return (
      <CheckoutState
        title="Your cart is empty."
        message="Add products to your cart before checkout."
        action={
          <Link className="button button--primary" to="/products">
            Browse products
          </Link>
        }
      />
    );
  }

  return (
    <section className="checkout-page" aria-labelledby="checkout-title">
      <div className="checkout-page__header">
        <p className="checkout-page__kicker">Checkout</p>
        <h1 id="checkout-title">Checkout</h1>
        <p>Choose a shipping address and review your cart before placing the order.</p>
      </div>

      <div className="checkout-layout">
        <div className="checkout-main">
          <section className="checkout-section" aria-labelledby="shipping-title">
            <div className="checkout-section__header">
              <h2 id="shipping-title">Shipping address</h2>
              {addressesState.status === "success" && addressesState.items.length > 0 ? (
                <button
                  type="button"
                  className="checkout-text-button"
                  onClick={() => {
                    resetAddressForm();
                    setIsAddingAddress((current) => !current);
                  }}
                >
                  {isAddingAddress ? "Use saved address" : "Add address"}
                </button>
              ) : null}
            </div>

            {addressesState.status === "loading" ? (
              <p className="checkout-inline-state" aria-live="polite">
                Loading shipping addresses...
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
                  Retry
                </button>
              </div>
            ) : null}

            {addressesState.status === "success" && addressesState.items.length > 0 ? (
              <fieldset className="checkout-address-list">
                <legend>Choose one saved address</legend>
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
                <p>No shipping addresses yet.</p>
                <p>Add one here to continue checkout.</p>
              </div>
            ) : null}

            {isAddingAddress ? (
              <div className="checkout-address-create">
                <h3>Add a shipping address</h3>
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
            <h2 id="review-title">Review</h2>
            {cartStatus === "loading" ? (
              <p className="checkout-inline-state" aria-live="polite">
                Refreshing your cart...
              </p>
            ) : null}

            {cartStatus === "error" ? (
              <div className="checkout-inline-error" role="alert">
                <p>
                  Cart could not be refreshed. Try again before placing an order.
                </p>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={handleRetryCartLoad}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {cartStatus === "success" && cartHasUnavailableItems ? (
              <div className="checkout-inline-error" role="alert">
                <p>
                  Some cart items are unavailable. Return to cart to update them before ordering.
                </p>
                <Link className="button button--ghost" to="/cart">
                  Back to cart
                </Link>
              </div>
            ) : null}

            {cartStatus === "success" && !cartHasUnavailableItems ? (
              <p className="checkout-inline-state">
                Cart is ready for order creation.
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
            <h2 id="place-order-title">Place order</h2>
            {selectedAddress ? (
              <p>
                Shipping to {selectedAddress.recipientName}.
              </p>
            ) : (
              <p>Choose a shipping address to continue.</p>
            )}
            <button
              type="button"
              className="button button--primary checkout-place-order__button"
              onClick={handlePlaceOrder}
              disabled={!canPlaceOrder}
            >
              {orderState.status === "submitting" ? "Placing order..." : "Place order"}
            </button>
          </section>
        </div>
      </div>
    </section>
  );
}
