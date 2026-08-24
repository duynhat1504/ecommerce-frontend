import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getCategories } from "../api/categoryApi";
import { getProducts } from "../api/productApi";
import ProductImage from "../components/ProductImage/ProductImage";
import "./ProductCatalogPage.css";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { label: "Newest", value: "createdAt,desc" },
  { label: "Price: low to high", value: "price,asc" },
  { label: "Price: high to low", value: "price,desc" },
  { label: "Name: A to Z", value: "name,asc" },
  { label: "Name: Z to A", value: "name,desc" },
];

const SORT_VALUES = SORT_OPTIONS.map((option) => option.value);

function formatPrice(price) {
  const value = Number(price);

  if (!Number.isFinite(value)) {
    return "";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function getPositivePage(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function getAllowedSort(value) {
  if (SORT_VALUES.includes(value)) {
    return value;
  }

  return SORT_OPTIONS[0].value;
}

function normalizePriceValue(value) {
  if (value === null) {
    return "";
  }

  const trimmed = value.trim();

  return trimmed;
}

function validatePriceRange(minPrice, maxPrice) {
  const min = minPrice ? Number(minPrice) : null;
  const max = maxPrice ? Number(maxPrice) : null;

  if ((minPrice && !Number.isFinite(min)) || (maxPrice && !Number.isFinite(max))) {
    return "Use numeric values for price filters.";
  }

  if ((min !== null && min < 0) || (max !== null && max < 0)) {
    return "Price filters cannot be negative.";
  }

  if (min !== null && max !== null && min > max) {
    return "Minimum price cannot be greater than maximum price.";
  }

  return "";
}

function parseCatalogQuery(searchParams) {
  return {
    keyword: (searchParams.get("keyword") || "").trim(),
    categoryId: searchParams.get("categoryId") || "",
    minPrice: normalizePriceValue(searchParams.get("minPrice")),
    maxPrice: normalizePriceValue(searchParams.get("maxPrice")),
    page: getPositivePage(searchParams.get("page")),
    sort: getAllowedSort(searchParams.get("sort")),
  };
}

function normalizeProductResponse(response, fallbackPage, fallbackSize) {
  if (Array.isArray(response)) {
    return {
      content: response,
      page: fallbackPage,
      size: fallbackSize,
      totalElements: response.length,
      totalPages: response.length ? 1 : 0,
      first: true,
      last: true,
      numberOfElements: response.length,
    };
  }

  return {
    content: Array.isArray(response?.content) ? response.content : [],
    page: Number.isInteger(response?.page) ? response.page : fallbackPage,
    size: Number.isInteger(response?.size) ? response.size : fallbackSize,
    totalElements: Number.isFinite(response?.totalElements)
      ? response.totalElements
      : 0,
    totalPages: Number.isInteger(response?.totalPages) ? response.totalPages : 0,
    first: Boolean(response?.first),
    last: Boolean(response?.last),
    numberOfElements: Number.isInteger(response?.numberOfElements)
      ? response.numberOfElements
      : 0,
  };
}

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 1) {
    return [];
  }

  const pages = new Set([1, totalPages, currentPage]);

  if (currentPage > 1) {
    pages.add(currentPage - 1);
  }

  if (currentPage < totalPages) {
    pages.add(currentPage + 1);
  }

  return [...pages].sort((a, b) => a - b);
}

function ProductCard({ product }) {
  const productName = product.name || "Product";
  const price = formatPrice(product.price);
  const isOutOfStock = Number(product.stock) === 0;

  return (
    <article className="catalog-product">
      <ProductImage src={product.imageUrl} alt={productName} />
      <div className="catalog-product__meta">
        {product.categoryName ? (
          <p className="catalog-product__category">{product.categoryName}</p>
        ) : null}
        <h3>{productName}</h3>
        {price ? <p className="catalog-product__price">{price}</p> : null}
        {isOutOfStock ? (
          <p className="catalog-product__stock">Currently out of stock</p>
        ) : null}
      </div>
    </article>
  );
}

function ProductGrid({ products }) {
  return (
    <div className="catalog-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="catalog-grid" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <article className="catalog-product catalog-product--loading" key={index}>
          <span className="catalog-skeleton catalog-skeleton--image" />
          <span className="catalog-skeleton catalog-skeleton--short" />
          <span className="catalog-skeleton catalog-skeleton--line" />
          <span className="catalog-skeleton catalog-skeleton--price" />
        </article>
      ))}
    </div>
  );
}

function CatalogPagination({ currentPage, totalPages, onPageChange }) {
  const visiblePages = getPaginationPages(currentPage, totalPages);

  if (!visiblePages.length) {
    return null;
  }

  return (
    <nav className="catalog-pagination" aria-label="Product catalog pagination">
      <button
        type="button"
        className="catalog-pagination__control"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </button>

      <div className="catalog-pagination__pages">
        {visiblePages.map((pageNumber, index) => {
          const previousPage = visiblePages[index - 1];
          const needsGap = previousPage && pageNumber - previousPage > 1;

          return (
            <span className="catalog-pagination__item" key={pageNumber}>
              {needsGap ? (
                <span className="catalog-pagination__gap" aria-hidden="true">
                  ...
                </span>
              ) : null}
              <button
                type="button"
                className={
                  pageNumber === currentPage
                    ? "catalog-pagination__page is-current"
                    : "catalog-pagination__page"
                }
                aria-current={pageNumber === currentPage ? "page" : undefined}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </button>
            </span>
          );
        })}
      </div>

      <button
        type="button"
        className="catalog-pagination__control"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </button>
    </nav>
  );
}

export default function ProductCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const catalogQuery = useMemo(
    () => parseCatalogQuery(searchParams),
    [searchParams],
  );
  const draftKey = `${catalogQuery.keyword}|${catalogQuery.minPrice}|${catalogQuery.maxPrice}`;
  const [filterDraft, setFilterDraft] = useState({
    queryKey: "",
    keyword: "",
    minPrice: "",
    maxPrice: "",
  });
  const [priceError, setPriceError] = useState({
    queryKey: "",
    message: "",
  });
  const [productsState, setProductsState] = useState({
    status: "loading",
    data: null,
    error: "",
  });
  const [categoriesState, setCategoriesState] = useState({
    status: "loading",
    data: [],
    error: "",
  });
  const [productRetryKey, setProductRetryKey] = useState(0);
  const [categoryRetryKey, setCategoryRetryKey] = useState(0);

  const backendQuery = useMemo(
    () => ({
      keyword: catalogQuery.keyword,
      categoryId: catalogQuery.categoryId,
      minPrice: catalogQuery.minPrice,
      maxPrice: catalogQuery.maxPrice,
      page: catalogQuery.page - 1,
      size: PAGE_SIZE,
      sort: catalogQuery.sort,
    }),
    [
      catalogQuery.categoryId,
      catalogQuery.keyword,
      catalogQuery.maxPrice,
      catalogQuery.minPrice,
      catalogQuery.page,
      catalogQuery.sort,
    ],
  );

  const hasActiveFilters = Boolean(
    catalogQuery.keyword ||
      catalogQuery.categoryId ||
      catalogQuery.minPrice ||
      catalogQuery.maxPrice ||
      catalogQuery.sort !== SORT_OPTIONS[0].value,
  );

  const draftValues =
    filterDraft.queryKey === draftKey
      ? filterDraft
      : {
          queryKey: draftKey,
          keyword: catalogQuery.keyword,
          minPrice: catalogQuery.minPrice,
          maxPrice: catalogQuery.maxPrice,
        };

  const currentPriceError =
    priceError.queryKey === draftKey ? priceError.message : "";

  function updateFilterDraft(updates) {
    setFilterDraft((current) => {
      const base =
        current.queryKey === draftKey
          ? current
          : {
              queryKey: draftKey,
              keyword: catalogQuery.keyword,
              minPrice: catalogQuery.minPrice,
              maxPrice: catalogQuery.maxPrice,
            };

      return {
        ...base,
        ...updates,
        queryKey: draftKey,
      };
    });
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setProductsState((current) => ({
        status: "loading",
        data: current.data,
        error: "",
      }));

      try {
        const response = await getProducts(backendQuery, {
          signal: controller.signal,
        });
        const data = normalizeProductResponse(
          response,
          backendQuery.page,
          backendQuery.size,
        );

        setProductsState({
          status: data.content.length ? "success" : "empty",
          data,
          error: "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setProductsState({
          status: "error",
          data: null,
          error: "Products could not be loaded right now.",
        });
      }
    }

    loadProducts();

    return () => {
      controller.abort();
    };
  }, [backendQuery, productRetryKey]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      setCategoriesState((current) => ({
        status: "loading",
        data: current.data,
        error: "",
      }));

      try {
        const response = await getCategories({ signal: controller.signal });
        const categories = Array.isArray(response) ? response : [];

        setCategoriesState({
          status: categories.length ? "success" : "empty",
          data: categories,
          error: "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setCategoriesState({
          status: "error",
          data: [],
          error: "Categories could not be loaded.",
        });
      }
    }

    loadCategories();

    return () => {
      controller.abort();
    };
  }, [categoryRetryKey]);

  useEffect(() => {
    const totalPages = productsState.data?.totalPages || 0;

    if (totalPages > 0 && catalogQuery.page > totalPages) {
      const nextParams = new URLSearchParams(searchParams);

      if (totalPages === 1) {
        nextParams.delete("page");
      } else {
        nextParams.set("page", String(totalPages));
      }

      setSearchParams(nextParams, { replace: true });
    }
  }, [catalogQuery.page, productsState.data, searchParams, setSearchParams]);

  function updateCatalogQuery(updates, { resetPage = true } = {}) {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    if (resetPage) {
      nextParams.delete("page");
    }

    if (nextParams.get("sort") === SORT_OPTIONS[0].value) {
      nextParams.delete("sort");
    }

    setSearchParams(nextParams);
  }

  function handleFilterSubmit(event) {
    event.preventDefault();

    const nextKeyword = draftValues.keyword.trim();
    const nextMinPrice = draftValues.minPrice.trim();
    const nextMaxPrice = draftValues.maxPrice.trim();
    const validationMessage = validatePriceRange(nextMinPrice, nextMaxPrice);

    if (validationMessage) {
      setPriceError({ queryKey: draftKey, message: validationMessage });
      return;
    }

    setPriceError({ queryKey: "", message: "" });
    updateCatalogQuery({
      keyword: nextKeyword,
      minPrice: nextMinPrice,
      maxPrice: nextMaxPrice,
    });
  }

  function handleCategoryChange(event) {
    updateCatalogQuery({ categoryId: event.target.value });
  }

  function handleSortChange(event) {
    updateCatalogQuery({ sort: event.target.value });
  }

  function handlePageChange(pageNumber) {
    const totalPages = productsState.data?.totalPages || 1;
    const nextPage = Math.min(Math.max(pageNumber, 1), totalPages);
    const nextParams = new URLSearchParams(searchParams);

    if (nextPage <= 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(nextPage));
    }

    setSearchParams(nextParams);
  }

  function handleClearFilters() {
    setPriceError({ queryKey: "", message: "" });
    setSearchParams(new URLSearchParams());
  }

  const productData = productsState.data;
  const products = productData?.content || [];
  const resultStart = productData?.totalElements
    ? productData.page * productData.size + 1
    : 0;
  const resultEnd = productData?.totalElements
    ? productData.page * productData.size + productData.numberOfElements
    : 0;
  const currentUiPage = productData ? productData.page + 1 : catalogQuery.page;
  const totalPages = productData?.totalPages || 0;

  return (
    <div className="catalog-page">
      <section className="catalog-intro" aria-labelledby="catalog-title">
        <p className="catalog-intro__brand">CHẬM Shop</p>
        <div className="catalog-intro__copy">
          <h1 id="catalog-title">Coffee objects, selected slowly.</h1>
          <p>
            Browse the current store inventory with search, category filters,
            price controls and sorting from the live backend.
          </p>
        </div>
      </section>

      <section className="catalog-layout" aria-labelledby="catalog-results-title">
        <form className="catalog-controls" onSubmit={handleFilterSubmit}>
          <div className="catalog-controls__header">
            <h2>Filter</h2>
            {hasActiveFilters ? (
              <button
                type="button"
                className="catalog-controls__clear"
                onClick={handleClearFilters}
              >
                Clear filters
              </button>
            ) : null}
          </div>

          <div className="catalog-control catalog-control--search">
            <label htmlFor="catalog-keyword">Search products</label>
            <div className="catalog-search-row">
              <input
                id="catalog-keyword"
                name="keyword"
                type="search"
                value={draftValues.keyword}
                onChange={(event) =>
                  updateFilterDraft({ keyword: event.target.value })
                }
                placeholder="Search by name"
              />
              <button type="submit" className="button button--primary">
                Search
              </button>
            </div>
          </div>

          <div className="catalog-control">
            <label htmlFor="catalog-category">Category</label>
            <select
              id="catalog-category"
              name="categoryId"
              value={catalogQuery.categoryId}
              onChange={handleCategoryChange}
            >
              <option value="">All categories</option>
              {categoriesState.data.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {categoriesState.status === "loading" ? (
              <p className="catalog-control__note" aria-live="polite">
                Loading categories...
              </p>
            ) : null}
            {categoriesState.status === "empty" ? (
              <p className="catalog-control__note">No categories available.</p>
            ) : null}
            {categoriesState.status === "error" ? (
              <div className="catalog-control__error" role="alert">
                <p>{categoriesState.error}</p>
                <button
                  type="button"
                  onClick={() => setCategoryRetryKey((key) => key + 1)}
                >
                  Retry
                </button>
              </div>
            ) : null}
          </div>

          <fieldset className="catalog-control catalog-control--price">
            <legend>Price range</legend>
            <div className="catalog-price-row">
              <label>
                <span>Minimum</span>
                <input
                  name="minPrice"
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={draftValues.minPrice}
                  onChange={(event) =>
                    updateFilterDraft({ minPrice: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Maximum</span>
                <input
                  name="maxPrice"
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={draftValues.maxPrice}
                  onChange={(event) =>
                    updateFilterDraft({ maxPrice: event.target.value })
                  }
                />
              </label>
            </div>
            {currentPriceError ? (
              <p className="catalog-control__error-text" role="alert">
                {currentPriceError}
              </p>
            ) : null}
            <button type="submit" className="catalog-apply-button">
              Apply filters
            </button>
          </fieldset>

          <div className="catalog-control">
            <label htmlFor="catalog-sort">Sort</label>
            <select
              id="catalog-sort"
              name="sort"
              value={catalogQuery.sort}
              onChange={handleSortChange}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </form>

        <div className="catalog-results">
          <div className="catalog-results__header">
            <div>
              <h2 id="catalog-results-title">Products</h2>
              {productsState.status === "success" ? (
                <p>
                  Showing {resultStart}-{resultEnd} of{" "}
                  {productData.totalElements} products
                </p>
              ) : null}
            </div>
            {productsState.status === "loading" ? (
              <p className="catalog-results__status" aria-live="polite">
                Loading products...
              </p>
            ) : null}
          </div>

          {productsState.status === "loading" ? <CatalogSkeleton /> : null}

          {productsState.status === "error" ? (
            <div className="catalog-state catalog-state--error" role="alert">
              <h2>Products could not be loaded.</h2>
              <p>
                Keep your filters in place and try the request again.
              </p>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => setProductRetryKey((key) => key + 1)}
              >
                Retry
              </button>
            </div>
          ) : null}

          {productsState.status === "empty" ? (
            <div className="catalog-state">
              <h2>No products match these filters.</h2>
              <p>
                Clear the filters or adjust the search terms to return to the
                full collection.
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={handleClearFilters}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : null}

          {productsState.status === "success" ? (
            <>
              <ProductGrid products={products} />
              <CatalogPagination
                currentPage={currentUiPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
