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
        <p className="sr-only">Loading homepage data...</p>
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
  const productName = product.name || "Coffee tool";
  const productPath = product.id
    ? `/products/${encodeURIComponent(product.id)}`
    : "/products";

  return (
    <article className="product-preview">
      <Link
        to={productPath}
        className="product-preview__image-link"
        aria-label={`View ${productName}`}
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
          <h1 id="home-hero-title">Tools for a slower cup.</h1>
          <p className="home-hero__text">
            Brewing objects chosen for quiet mornings, small counters and daily use.
          </p>
          <Link className="button button--primary home-hero__cta" to="/products">
            Shop the collection
          </Link>
        </div>
        <div className="home-hero__media">
          <img
            src={heroImage}
            alt="Ceramic dripper, glass server and kettle on a sunlit wooden table"
          />
        </div>
      </section>

      <section className="ritual-section" aria-labelledby="ritual-title">
        <div className="ritual-section__text">
          <h2 id="ritual-title">For the first quiet pour.</h2>
          <p>
            Start with a dripper, a steady kettle and a cup that makes the table feel considered.
          </p>
        </div>
        <Link className="ritual-section__link" to="/products">
          Browse brewing tools
        </Link>
      </section>

      <section className="home-products" aria-labelledby="new-products-title">
        <div className="home-section-heading">
          <h2 id="new-products-title">New objects in the shop</h2>
          <Link to="/products">View all</Link>
        </div>

        <SectionState
          state={productsState}
          emptyText="No products are available yet."
          errorText="Products could not be loaded right now."
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
            alt="Hand grinder, ceramic cups and coffee beans arranged by a morning window"
            loading="lazy"
          />
        </div>
        <div className="product-story__copy">
          <h2 id="story-title">Objects that stay on the counter.</h2>
          <p>
            CHẬM focuses on coffee tools that earn their place through material, weight and daily usefulness.
          </p>
          <Link to="/products">See everyday tools</Link>
        </div>
      </section>

      <section className="home-categories" aria-labelledby="categories-title">
        <div className="home-categories__intro">
          <h2 id="categories-title">Shop by ritual</h2>
          <p>
            Move from beans to cup with a smaller set of objects, each one chosen for repeated mornings.
          </p>
        </div>

        <SectionState
          state={categoriesState}
          emptyText="Categories will appear here once they are added."
          errorText="Categories could not be loaded right now."
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
        <p>Built for one store, one point of view.</p>
        <h2 id="quiet-title">
          Coffee equipment without the noise of a marketplace.
        </h2>
      </section>
    </div>
  );
}
