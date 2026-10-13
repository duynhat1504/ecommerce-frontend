import { useState } from "react";
import { Link } from "react-router-dom";

import ProductImage from "../components/ProductImage/ProductImage";
import useCart from "../cart/useCart";
import { getCartErrorMessage } from "../utils/cartErrorMessages";
import { formatCurrency } from "../utils/formatCurrency";
import "./CartPage.css";

function getItemStockLimit(item) {
  const stock = Number(item?.availableStock);

  if (!Number.isInteger(stock) || stock < 0) {
    return null;
  }

  return stock;
}

function getCartItems(cart) {
  return Array.isArray(cart?.items) ? cart.items : [];
}

function canCheckout(items) {
  return items.length > 0 && items.every((item) => item.available !== false);
}

function CartLoadingState() {
  return (
    <section className="cart-state" aria-live="polite">
      <p className="cart-state__kicker">Giỏ hàng</p>
      <h1>Đang tải giỏ hàng.</h1>
      <p>Giỏ hàng của bạn đang được tải.</p>
    </section>
  );
}

function CartErrorState({ message, onRetry }) {
  return (
    <section className="cart-state" aria-labelledby="cart-error-title" role="alert">
      <p className="cart-state__kicker">Giỏ hàng</p>
      <h1 id="cart-error-title">Giỏ hàng không khả dụng.</h1>
      <p>{message || "Không thể tải giỏ hàng của bạn vào lúc này."}</p>
      <div className="cart-state__actions">
        <button type="button" className="button button--ghost" onClick={onRetry}>
          Thử lại
        </button>
        <Link className="button button--primary" to="/products">
          Xem sản phẩm
        </Link>
      </div>
    </section>
  );
}

function EmptyCartState() {
  return (
    <section className="cart-state" aria-labelledby="empty-cart-title">
      <p className="cart-state__kicker">Giỏ hàng</p>
      <h1 id="empty-cart-title">Giỏ hàng của bạn đang trống.</h1>
      <p>Khám phá cửa hàng và thêm sản phẩm khi bạn sẵn sàng.</p>
      <Link className="button button--primary" to="/products">
        Xem sản phẩm
      </Link>
    </section>
  );
}

function CartQuantityControl({
  item,
  isPending,
  onQuantityChange,
}) {
  const stockLimit = getItemStockLimit(item);
  const quantity = Number(item.quantity) || 1;
  const canDecrease = quantity > 1 && !isPending;
  const canIncrease =
    !isPending &&
    item.available !== false &&
    (stockLimit === null || quantity < stockLimit);

  return (
    <div
      className="cart-quantity"
      role="group"
      aria-label={`Số lượng của ${item.productName}`}
    >
      <button
        type="button"
        className="cart-quantity__button"
        onClick={() => onQuantityChange(item.productId, quantity - 1)}
        disabled={!canDecrease}
        aria-label={`Giảm số lượng của ${item.productName}`}
      >
        -
      </button>
      <span className="cart-quantity__value" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className="cart-quantity__button"
        onClick={() => onQuantityChange(item.productId, quantity + 1)}
        disabled={!canIncrease}
        aria-label={`Tăng số lượng của ${item.productName}`}
      >
        +
      </button>
    </div>
  );
}

function CartRow({
  item,
  isPending,
  onQuantityChange,
  onRemove,
}) {
  const productName = item.productName || "Sản phẩm";
  const productPath = item.productId
    ? `/products/${encodeURIComponent(item.productId)}`
    : "/products";
  const lineSubtotal = item.subtotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 0);

  return (
    <article className="cart-row" aria-label={productName}>
      <Link className="cart-row__image-link" to={productPath} aria-label={`Xem ${productName}`}>
        <ProductImage
          src={item.imageUrl}
          alt={productName}
          className="cart-row__image"
        />
      </Link>

      <div className="cart-row__product">
        <Link className="cart-row__name" to={productPath}>
          {productName}
        </Link>
        {item.available === false ? (
          <p className="cart-row__availability">
            {item.unavailableReason || "Sản phẩm này hiện không khả dụng."}
          </p>
        ) : null}
        <p className="cart-row__unit-price">{formatCurrency(item.unitPrice)}</p>
      </div>

      <div className="cart-row__controls">
        <CartQuantityControl
          item={item}
          isPending={isPending}
          onQuantityChange={onQuantityChange}
        />
        <button
          type="button"
          className="cart-row__remove"
          onClick={() => onRemove(item.productId)}
          disabled={isPending}
        >
          Xóa
        </button>
      </div>

      <p className="cart-row__subtotal">
        <span>Thành tiền</span>
        <strong>{formatCurrency(lineSubtotal)}</strong>
      </p>
    </article>
  );
}

export default function CartPage() {
  const {
    cart,
    clearCart,
    error,
    refreshCart,
    removeItem,
    status,
    updateItem,
  } = useCart();
  const [pendingAction, setPendingAction] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const items = getCartItems(cart);
  const isLoading = status === "loading" && items.length === 0;
  const hasItems = items.length > 0;
  const isCheckoutAvailable = canCheckout(items);
  const totalItems = cart.totalItems || items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = cart.totalPrice ?? items.reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0,
  );

  async function handleQuantityChange(productId, quantity) {
    if (!productId || quantity < 1 || pendingAction) {
      return;
    }

    setPendingAction(`quantity-${productId}`);
    setMutationError("");

    try {
      await updateItem(productId, quantity);
    } catch (requestError) {
      setMutationError(
        getCartErrorMessage(requestError, "Không thể cập nhật số lượng."),
      );
      try {
        await refreshCart();
      } catch {
        // The visible mutation error remains the useful recovery message here.
      }
    } finally {
      setPendingAction("");
    }
  }

  async function handleRemove(productId) {
    if (!productId || pendingAction) {
      return;
    }

    setPendingAction(`remove-${productId}`);
    setMutationError("");

    try {
      await removeItem(productId);
    } catch (requestError) {
      setMutationError(
        getCartErrorMessage(requestError, "Không thể xóa sản phẩm."),
      );
      try {
        await refreshCart();
      } catch {
        // Keep the original action failure visible.
      }
    } finally {
      setPendingAction("");
    }
  }

  async function handleClearCart() {
    if (pendingAction) {
      return;
    }

    setPendingAction("clear");
    setMutationError("");

    try {
      await clearCart();
      setIsConfirmingClear(false);
    } catch (requestError) {
      setMutationError(
        getCartErrorMessage(requestError, "Không thể xóa giỏ hàng."),
      );
    } finally {
      setPendingAction("");
    }
  }

  function handleRetryCartLoad() {
    refreshCart().catch(() => {
      // CartContext keeps the visible load error state.
    });
  }

  if (isLoading) {
    return <CartLoadingState />;
  }

  if (status === "error" && !hasItems) {
    return <CartErrorState message={error} onRetry={handleRetryCartLoad} />;
  }

  if (!hasItems) {
    return <EmptyCartState />;
  }

  return (
    <section className="cart-page" aria-labelledby="cart-title">
      <div className="cart-page__header">
        <p className="cart-page__kicker">Giỏ hàng</p>
        <h1 id="cart-title">Giỏ hàng của bạn</h1>
        <p>{totalItems} sản phẩm</p>
      </div>

      {mutationError ? (
        <p className="cart-page__error" role="alert">
          {mutationError}
        </p>
      ) : null}

      <div className="cart-layout">
        <div className="cart-items" aria-label="Sản phẩm trong giỏ hàng">
          {items.map((item) => {
            const pendingKey =
              item.productId && pendingAction.includes(item.productId)
                ? pendingAction
                : "";

            return (
              <CartRow
                key={item.productId}
                item={item}
                isPending={Boolean(pendingKey)}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemove}
              />
            );
          })}
        </div>

        <aside className="cart-summary" aria-labelledby="cart-summary-title">
          <h2 id="cart-summary-title">Tóm tắt</h2>
          <dl>
            <div>
              <dt>Sản phẩm</dt>
              <dd>{totalItems}</dd>
            </div>
            <div>
              <dt>Tạm tính</dt>
              <dd>{formatCurrency(totalPrice)}</dd>
            </div>
          </dl>

          <Link className="button button--ghost cart-summary__continue" to="/products">
            Tiếp tục mua sắm
          </Link>

          {isCheckoutAvailable ? (
            <Link className="button button--primary cart-summary__checkout" to="/checkout">
              Thanh toán
            </Link>
          ) : (
            <div className="cart-summary__checkout-blocked" role="status">
              Hãy xử lý các sản phẩm không khả dụng trước khi thanh toán.
            </div>
          )}

          <div className="cart-summary__clear">
            {isConfirmingClear ? (
              <div className="cart-summary__confirm" role="group" aria-label="Xác nhận xóa giỏ hàng">
                <p>Xóa tất cả sản phẩm khỏi giỏ hàng?</p>
                <div>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setIsConfirmingClear(false)}
                    disabled={pendingAction === "clear"}
                  >
                    Giữ giỏ hàng
                  </button>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={handleClearCart}
                    disabled={pendingAction === "clear"}
                  >
                    {pendingAction === "clear" ? "Đang xóa..." : "Xóa giỏ hàng"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="cart-summary__clear-button"
                onClick={() => setIsConfirmingClear(true)}
              >
                Xóa giỏ hàng
              </button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
