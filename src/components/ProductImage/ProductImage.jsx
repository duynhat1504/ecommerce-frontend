import { useState } from "react";

import "./ProductImage.css";

export default function ProductImage({ src, alt, className = "", loading = "lazy" }) {
  const [hasFailed, setHasFailed] = useState(false);
  const imageAlt = alt || "Product image";
  const classes = ["product-image", className].filter(Boolean).join(" ");

  if (!src || hasFailed) {
    return (
      <span
        className={`${classes} product-image--fallback`}
        role="img"
        aria-label={`${imageAlt} unavailable`}
      >
        <span className="product-image__fallback-text" aria-hidden="true">
          Image unavailable
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
