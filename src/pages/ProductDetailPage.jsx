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
      <p id="product-quantity-label">Số lượng</p>
      <div
        className="product-detail__quantity-controls"
        role="group"
        aria-labelledby="product-quantity-label"
      >
        <button
          type="button"
          onClick={() => onChange(quantity - 1)}
          disabled={disabled || quantity <= 1}
          aria-label="Giảm số lượng"
        >
          -
        </button>
        <span aria-live="polite">{quantity}</span>
        <button
          type="button"
          onClick={() => onChange(quantity + 1)}
          disabled={disabled || quantity >= stock}
          aria-label="Tăng số lượng"
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
      <p className="sr-only">Đang tải chi tiết sản phẩm...</p>
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
      <p className="product-detail-state__kicker">Sản phẩm</p>
      <h1 id="product-state-title">{title}</h1>
      <p>{message}</p>
      <div className="product-detail-state__actions">
        {onRetry ? (
          <button type="button" className="button button--ghost" onClick={onRetry}>
            Thử lại
          </button>
        ) : null}
        <Link className="button button--primary" to="/products">
          Quay lại sản phẩm
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
            message: "Sản phẩm này không khả dụng hoặc liên kết không còn hợp lệ.",
          });
          return;
        }

        setProductState({
          status: "error",
          product: null,
          message: "Không thể tải chi tiết sản phẩm vào lúc này.",
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
        message: "Đã thêm vào giỏ hàng.",
      });
    } catch (error) {
      setCartFeedback({
        status: "error",
        message: getCartErrorMessage(error, "Không thể thêm sản phẩm này vào giỏ hàng."),
      });
    }
  }

  if (!isValidProductId) {
    return (
      <ProductDetailState
        title="Sản phẩm không khả dụng."
        message="Sản phẩm này không khả dụng hoặc liên kết không còn hợp lệ."
      />
    );
  }

  if (productState.status === "loading") {
    return <ProductDetailSkeleton />;
  }

  if (productState.status === "not-found") {
    return (
      <ProductDetailState
        title="Sản phẩm không khả dụng."
        message={productState.message}
      />
    );
  }

  if (productState.status === "error") {
    return (
      <ProductDetailState
        title="Chi tiết sản phẩm không khả dụng."
        message={productState.message}
        onRetry={() => setRetryKey((key) => key + 1)}
      />
    );
  }

  return (
    <article className="product-detail" aria-labelledby="product-title">
      <nav className="product-detail__breadcrumb" aria-label="Điều hướng đường dẫn">
        <Link to="/products">Sản phẩm</Link>
        <span aria-hidden="true">/</span>
        <span>{product.name || "Sản phẩm"}</span>
      </nav>

      <section className="product-detail__media" aria-label="Hình ảnh sản phẩm">
        <ProductImage
          src={product.imageUrl}
          alt={product.name || "Hình ảnh sản phẩm"}
          className="product-detail__image"
          loading="eager"
        />
      </section>

      <section className="product-detail__info">
        {product.categoryName ? (
          <p className="product-detail__category">{product.categoryName}</p>
        ) : null}
        <h1 id="product-title">{product.name || "Sản phẩm"}</h1>
        {price ? <p className="product-detail__price">{price}</p> : null}

        <div className="product-detail__description">
          {product.description ? (
            <p>{product.description}</p>
          ) : (
            <p>Chưa có mô tả sản phẩm.</p>
          )}
        </div>

        <dl className="product-detail__facts">
          <div>
            <dt>Tình trạng</dt>
            <dd>{isAvailable ? "Còn hàng" : "Hết hàng"}</dd>
          </div>
          <div>
            <dt>Tồn kho</dt>
            <dd>{stock}</dd>
          </div>
        </dl>

        {!isAvailable ? (
          <p className="product-detail__unavailable" role="status">
            Sản phẩm này hiện không khả dụng.
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
              {cartFeedback.status === "submitting" ? "Đang thêm..." : "Thêm vào giỏ hàng"}
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
                    <Link to="/cart">Xem giỏ hàng</Link>
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
