import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getCategories } from "../api/categoryApi";
import { getProducts } from "../api/productApi";
import ProductImage from "../components/ProductImage/ProductImage";
import { formatCurrency } from "../utils/formatCurrency";
import "./HomePage.css";

const heroImage = "/assets/home/cham-hero-tools.jpg";
const storyImage = "/assets/home/cham-morning-grinder.jpg";

function getPageItems(pageResponse) {
  if (Array.isArray(pageResponse)) {
    return pageResponse;
  }

  return pageResponse?.content || pageResponse?.items || [];
}

function SectionState({ state, emptyText, errorText }) {
  if (state === "loading") {
    return (
      <div className="home-state" aria-live="polite">
        <p className="sr-only">Đang tải dữ liệu trang chủ...</p>
        <span className="home-state__line" />
        <span className="home-state__line home-state__line--short" />
      </div>
    );
  }

  if (state === "empty") {
    return <p className="home-state-message">{emptyText}</p>;
  }

  if (state === "error") {
    return (
      <p className="home-state-message home-state-message--error" role="alert">
        {errorText}
      </p>
    );
  }

  return null;
}

function ProductPreview({ product }) {
  const price = formatCurrency(product.price);
  const productName = product.name || "Dụng cụ cà phê";
  const productPath = product.id
    ? `/products/${encodeURIComponent(product.id)}`
    : "/products";

  return (
    <article className="product-preview">
      <Link
        to={productPath}
        className="product-preview__image-link"
        aria-label={`Xem ${productName}`}
      >
        <ProductImage src={product.imageUrl} alt={productName} />
      </Link>
      <div className="product-preview__meta">
        {product.categoryName ? (
          <p className="product-preview__category">{product.categoryName}</p>
        ) : null}
        <h3>
          <Link to={productPath}>{productName}</Link>
        </h3>
        {price ? <p className="product-preview__price">{price}</p> : null}
      </div>
    </article>
  );
}

function CategoryTile({ category }) {
  const to = category.id
    ? `/products?categoryId=${encodeURIComponent(category.id)}`
    : "/products";

  return (
    <Link className="category-tile" to={to}>
      <span>{category.name}</span>
      {category.description ? <small>{category.description}</small> : null}
    </Link>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [productsState, setProductsState] = useState("loading");
  const [categories, setCategories] = useState([]);
  const [categoriesState, setCategoriesState] = useState("loading");

  useEffect(() => {
    let isActive = true;

    async function loadHomepageData() {
      const productRequest = getProducts({
        page: 0,
        size: 4,
        sort: "createdAt,desc",
      });
      const categoryRequest = getCategories();

      try {
        const productResponse = await productRequest;
        const items = getPageItems(productResponse);

        if (isActive) {
          setProducts(items);
          setProductsState(items.length ? "success" : "empty");
        }
      } catch {
        if (isActive) {
          setProducts([]);
          setProductsState("error");
        }
      }

      try {
        const categoryResponse = await categoryRequest;
        const items = Array.isArray(categoryResponse) ? categoryResponse : [];

        if (isActive) {
          setCategories(items);
          setCategoriesState(items.length ? "success" : "empty");
        }
      } catch {
        if (isActive) {
          setCategories([]);
          setCategoriesState("error");
        }
      }
    }

    loadHomepageData();

    return () => {
      isActive = false;
    };
  }, []);

  const visibleCategories = useMemo(() => {
    if (categories.length) {
      return categories.slice(0, 7);
    }

    return [];
  }, [categories]);

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero__copy">
          <p className="home-hero__brand">CHẬM</p>
          <h1 id="home-hero-title">Dụng cụ cho một tách cà phê ngon.</h1>
          <p className="home-hero__text">
            Những dụng cụ pha cà phê được CHẬM chọn lọc cho việc pha tại nhà.
          </p>
          <Link className="button button--primary home-hero__cta" to="/products">
            Khám phá sản phẩm
          </Link>
        </div>
        <div className="home-hero__media">
          <img
            src={heroImage}
            alt="Phễu lọc gốm, bình thủy tinh và ấm nước trên bàn gỗ đầy nắng"
          />
        </div>
      </section>

      <section className="ritual-section" aria-labelledby="ritual-title">
        <div className="ritual-section__text">
          <h2 id="ritual-title">Bắt đầu một ngày bằng cà phê ngon.</h2>
          <p>
            Từ phễu lọc, ấm rót đến chiếc cốc quen thuộc, những dụng cụ đơn giản cho việc pha cà phê mỗi ngày.
          </p>
        </div>
        <Link className="ritual-section__link" to="/products">
          Xem dụng cụ pha cà phê
        </Link>
      </section>

      <section className="home-products" aria-labelledby="new-products-title">
        <div className="home-section-heading">
          <h2 id="new-products-title">Sản phẩm mới</h2>
          <Link to="/products">Xem tất cả</Link>
        </div>

        <SectionState
          state={productsState}
          emptyText="Chưa có sản phẩm nào."
          errorText="Không thể tải sản phẩm vào lúc này."
        />

        {productsState === "success" ? (
          <div className="home-products__grid">
            {products.map((product) => (
              <ProductPreview key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="product-story" aria-labelledby="story-title">
        <div className="product-story__media">
          <img
            src={storyImage}
            alt="Cối xay tay, cốc gốm và hạt cà phê cạnh ô cửa sổ buổi sáng"
            loading="lazy"
          />
        </div>
        <div className="product-story__copy">
          <h2 id="story-title">Những món đồ đáng để ở lại trên bàn pha.</h2>
          <p>
            CHẬM chọn những dụng cụ bền, dễ dùng và đủ tốt để trở thành một phần của thói quen pha cà phê mỗi ngày.
          </p>
          <Link to="/products">Khám phá dụng cụ</Link>
        </div>
      </section>

      <section className="home-categories" aria-labelledby="categories-title">
        <div className="home-categories__intro">
          <h2 id="categories-title">Chọn theo cách pha</h2>
          <p>
            Tìm dụng cụ phù hợp với cách bạn pha cà phê mỗi ngày.
          </p>
        </div>

        <SectionState
          state={categoriesState}
          emptyText="Danh mục sẽ xuất hiện tại đây khi được thêm vào."
          errorText="Không thể tải danh mục vào lúc này."
        />

        {categoriesState === "success" ? (
          <div className="home-categories__grid">
            {visibleCategories.map((category) => (
              <CategoryTile key={category.id} category={category} />
            ))}
          </div>
        ) : null}

      </section>

      <section className="quiet-section" aria-labelledby="quiet-title">
        <p>CHẬM chọn lọc</p>
        <h2 id="quiet-title">Những món đồ cho góc cà phê của bạn.</h2>
      </section>
    </div>
  );
}
