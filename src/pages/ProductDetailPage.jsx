import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { getProductById } from "../api/productApi";
import useAuth from "../auth/useAuth";
import useCart from "../cart/useCart";
import ProductImage from "../components/ProductImage/ProductImage";
import { getCartErrorMessage } from "../utils/cartErrorMessages";
import { formatCurrency } from "../utils/formatCurrency";
import "./ProductDetailPage.css";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getStockCount(stock) {
  const value = Number(stock);

  if (!Number.isInteger(value) || value < 0) {
    return 0;
  }

  return value;
}

function clampQuantity(value, stock) {
  const parsed = Number(value);
  const maximum = Math.max(1, stock);

  if (!Number.isInteger(parsed)) {
    return 1;
  }

  return Math.min(Math.max(parsed, 1), maximum);
}

function QuantitySelector({ quantity, stock, onChange, disabled }) {
  return (
    <div className="product-detail__quantity">
      <p id="product-quantity-label">Quantity</p>
      <div
        className="product-detail__quantity-controls"
        role="group"
        aria-labelledby="product-quantity-label"
      >
        <button
          type="button"
          onClick={() => onChange(quantity - 1)}
          disabled={disabled || quantity <= 1}
          aria-label="Decrease quantity"
        >
          -
        </button>
        <span aria-live="polite">{quantity}</span>
        <button
          type="button"
          onClick={() => onChange(quantity + 1)}
          disabled={disabled || quantity >= stock}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <section className="product-detail product-detail--loading" aria-live="polite">
      <p className="sr-only">Loading product details...</p>
      <span className="product-detail-skeleton product-detail-skeleton--image" />
      <div className="product-detail-skeleton__copy" aria-hidden="true">
        <span className="product-detail-skeleton product-detail-skeleton--small" />
        <span className="product-detail-skeleton product-detail-skeleton--title" />
        <span className="product-detail-skeleton product-detail-skeleton--price" />
        <span className="product-detail-skeleton product-detail-skeleton--line" />
        <span className="product-detail-skeleton product-detail-skeleton--line" />
      </div>
    </section>
  );
}

function ProductDetailState({ title, message, onRetry }) {
  return (
    <section className="product-detail-state" aria-labelledby="product-state-title">
      <p className="product-detail-state__kicker">Product</p>
      <h1 id="product-state-title">{title}</h1>
      <p>{message}</p>
      <div className="product-detail-state__actions">
        {onRetry ? (
          <button type="button" className="button button--ghost" onClick={onRetry}>
            Retry
          </button>
        ) : null}
        <Link className="button button--primary" to="/products">
          Back to products
        </Link>
      </div>
    </section>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const [productState, setProductState] = useState({
    status: "loading",
    product: null,
    message: "",
  });
  const [quantity, setQuantity] = useState(1);
  const [cartFeedback, setCartFeedback] = useState({
    status: "idle",
    message: "",
  });
  const [retryKey, setRetryKey] = useState(0);

  const isValidProductId = useMemo(() => UUID_PATTERN.test(id || ""), [id]);
  const product = productState.product;
  const stock = getStockCount(product?.stock);
  const isAvailable = stock > 0;
  const price = formatCurrency(product?.price);

  useEffect(() => {
    if (!isValidProductId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadProduct() {
      setProductState({
        status: "loading",
        product: null,
        message: "",
      });

      try {
        const response = await getProductById(id, {
          signal: controller.signal,
        });

        setProductState({
          status: "success",
          product: response,
          message: "",
        });
        setQuantity(1);
        setCartFeedback({
          status: "idle",
          message: "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        if (error.status === 404 || error.status === 400) {
          setProductState({
            status: "not-found",
            product: null,
            message: "This product is unavailable or the link is no longer valid.",
          });
          return;
        }

        setProductState({
          status: "error",
          product: null,
          message: "Product details could not be loaded right now.",
        });
      }
    }

    loadProduct();

    return () => {
      controller.abort();
    };
  }, [id, isValidProductId, retryKey]);

  function handleQuantityChange(nextQuantity) {
    setQuantity(clampQuantity(nextQuantity, stock));
    setCartFeedback({
      status: "idle",
      message: "",
    });
  }

  async function handleAddToCart() {
    if (!product?.id || !isAvailable || cartFeedback.status === "submitting") {
      return;
    }

    if (!isAuthenticated) {
      navigate("/login", { state: { from: location } });
      return;
    }

    setCartFeedback({
      status: "submitting",
      message: "",
    });

    try {
      await addItem({
        productId: product.id,
        quantity,
      });
      setCartFeedback({
        status: "success",
        message: "Added to cart.",
      });
    } catch (error) {
      setCartFeedback({
        status: "error",
        message: getCartErrorMessage(error, "This product could not be added to cart."),
      });
    }
  }

  if (!isValidProductId) {
    return (
      <ProductDetailState
        title="Product unavailable."
        message="This product is unavailable or the link is no longer valid."
      />
    );
  }

  if (productState.status === "loading") {
    return <ProductDetailSkeleton />;
  }

  if (productState.status === "not-found") {
    return (
      <ProductDetailState
        title="Product unavailable."
        message={productState.message}
      />
    );
  }

  if (productState.status === "error") {
    return (
      <ProductDetailState
        title="Product details are unavailable."
        message={productState.message}
        onRetry={() => setRetryKey((key) => key + 1)}
      />
    );
  }

  return (
    <article className="product-detail" aria-labelledby="product-title">
      <nav className="product-detail__breadcrumb" aria-label="Breadcrumb">
        <Link to="/products">Shop</Link>
        <span aria-hidden="true">/</span>
        <span>{product.name || "Product"}</span>
      </nav>

      <section className="product-detail__media" aria-label="Product image">
        <ProductImage
          src={product.imageUrl}
          alt={product.name || "Product image"}
          className="product-detail__image"
          loading="eager"
        />
      </section>

      <section className="product-detail__info">
        {product.categoryName ? (
          <p className="product-detail__category">{product.categoryName}</p>
        ) : null}
        <h1 id="product-title">{product.name || "Product"}</h1>
        {price ? <p className="product-detail__price">{price}</p> : null}

        <div className="product-detail__description">
          {product.description ? (
            <p>{product.description}</p>
          ) : (
            <p>No product description is available yet.</p>
          )}
        </div>

        <dl className="product-detail__facts">
          <div>
            <dt>Availability</dt>
            <dd>{isAvailable ? "Available" : "Out of stock"}</dd>
          </div>
          <div>
            <dt>Stock</dt>
            <dd>{stock}</dd>
          </div>
        </dl>

        {!isAvailable ? (
          <p className="product-detail__unavailable" role="status">
            This product is currently unavailable.
          </p>
        ) : (
          <div className="product-detail__purchase">
            <QuantitySelector
              quantity={quantity}
              stock={stock}
              onChange={handleQuantityChange}
              disabled={cartFeedback.status === "submitting"}
            />
            <button
              type="button"
              className="button button--primary product-detail__cart-button"
              onClick={handleAddToCart}
              disabled={cartFeedback.status === "submitting"}
            >
              {cartFeedback.status === "submitting" ? "Adding..." : "Add to cart"}
            </button>
            {cartFeedback.message ? (
              <p
                className={
                  cartFeedback.status === "error"
                    ? "product-detail__cart-message product-detail__cart-message--error"
                    : "product-detail__cart-message"
                }
                role={cartFeedback.status === "error" ? "alert" : "status"}
              >
                {cartFeedback.message}
                {cartFeedback.status === "success" ? (
                  <>
                    {" "}
                    <Link to="/cart">View cart</Link>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        )}

      </section>
    </article>
  );
}
