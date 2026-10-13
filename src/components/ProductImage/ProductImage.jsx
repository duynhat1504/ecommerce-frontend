import { useState } from "react";

import "./ProductImage.css";

export default function ProductImage({ src, alt, className = "", loading = "lazy" }) {
  const [hasFailed, setHasFailed] = useState(false);
  const imageAlt = alt || "Hình ảnh sản phẩm";
  const classes = ["product-image", className].filter(Boolean).join(" ");

  if (!src || hasFailed) {
    return (
      <span
        className={`${classes} product-image--fallback`}
        role="img"
        aria-label={`${imageAlt} không khả dụng`}
      >
        <span className="product-image__fallback-text" aria-hidden="true">
          Không có hình ảnh
        </span>
      </span>
    );
  }

  return (
    <span className={classes}>
      <img
        src={src}
        alt={imageAlt}
        className="product-image__media"
        loading={loading}
        decoding="async"
        onError={() => setHasFailed(true)}
      />
    </span>
  );
}
