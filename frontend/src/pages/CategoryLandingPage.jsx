import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import SearchBox from "../components/SearchBox";
import { shoesAPI } from "../api";
import { ProductGridSkeleton } from "../components/Skeleton";
import { brandFilters, categories, categoryBySlug, genders } from "../data/catalog";
import useDocumentMeta from "../hooks/useDocumentMeta";

const PRICE_RANGES = {
  all: { label: "Any price", test: () => true },
  u100: { label: "Under $100", test: (p) => p < 100 },
  "100-150": { label: "$100 – $150", test: (p) => p >= 100 && p <= 150 },
  "150-200": { label: "$150 – $200", test: (p) => p > 150 && p <= 200 },
  o200: { label: "Over $200", test: (p) => p > 200 },
};

const PAGE_SIZE = 12;

const SORTS = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  rating: "Top Rated",
  newest: "Newest",
  "best-selling": "Best Selling",
};

function CatalogPager({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= 0) return null;
  const start = page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);
  const go = (n) => {
    if (n < 0 || n >= pages || n === page) return;
    onPage(n);
  };
  return (
    <nav className="catalog-pager" aria-label="Catalog pages">
      <p className="catalog-pager-meta">
        Showing {start}–{end} of {total} sneakers
      </p>
      <div className="catalog-pager-row">
        <button type="button" className="pager-btn" disabled={page === 0} onClick={() => go(page - 1)} aria-label="Previous page">
          <span aria-hidden="true">←</span>
        </button>
        {Array.from({ length: pages }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`pager-btn${i === page ? " is-active" : ""}`}
            aria-current={i === page ? "page" : undefined}
            onClick={() => go(i)}
          >
            {i + 1}
          </button>
        ))}
        <button type="button" className="pager-btn" disabled={page >= pages - 1} onClick={() => go(page + 1)} aria-label="Next page">
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </nav>
  );
}

export default function CategoryLandingPage({ catalog, favorites, onFavorite, onOpen, onQuickView }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const catMeta = categoryBySlug(slug);
  const category = catMeta?.name || "All";
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [brand, setBrand] = useState("all");
  const [gender, setGender] = useState("all");
  const [price, setPrice] = useState("all");
  const [inStock, setInStock] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [page, setPage] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);
  const [results, setResults] = useState({ products: [], loading: true, error: "", count: 0 });

  useDocumentMeta({
    title: catMeta ? `${category} Sneakers` : "Categories",
    description: catMeta ? `${catMeta.description.slice(0, 155)}…` : "Shop sneakers by category at SHOES.",
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [slug]);

  const products = catalog.products;
  const brands = useMemo(() => {
    const live = [...new Set(products.map((p) => p.brand))].sort();
    return live.length ? live : brandFilters;
  }, [products]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setResults((s) => ({ ...s, loading: true, error: "" }));
      const bounds = { all: {}, u100: { maxPrice: 99.99 }, "100-150": { minPrice: 100, maxPrice: 150 }, "150-200": { minPrice: 150.01, maxPrice: 200 }, o200: { minPrice: 200.01 } }[price];
      try {
        const result = await shoesAPI.search(
          {
            q: search,
            category,
            brand,
            gender,
            sort,
            inStock: String(inStock),
            ...bounds,
            ...(size ? { size } : {}),
            ...(color ? { color } : {}),
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
          },
          { signal: controller.signal }
        );
        if (!controller.signal.aborted) setResults({ ...result, loading: false, error: "" });
      } catch (e) {
        if (!controller.signal.aborted) setResults({ products: [], loading: false, error: e.message, count: 0 });
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, category, brand, gender, sort, inStock, price, size, color, page, retryNonce]);

  const filtered = results.products.filter((p) => !favoritesOnly || favorites.includes(p.id)).map((p) => ({ ...p, fromApi: true }));
  const colors = [...new Set([...products.map((p) => p.color), ...results.products.flatMap((p) => p.colors || [])])].filter(Boolean).sort();

  const clearFilters = () => {
    setSearch("");
    setSize("");
    setColor("");
    setPage(0);
    setBrand("all");
    setGender("all");
    setPrice("all");
    setInStock(false);
    setFavoritesOnly(false);
    setSort("featured");
  };

  const cardProps = (p) => ({ favorite: favorites.includes(p.id), onFavorite, onOpen, onQuickView });

  if (!catMeta) return <Navigate to="/categories" replace />;

  return (
    <main className="container category-landing" id="main-content">
      <section className="category-hero" aria-labelledby="category-hero-title">
        <div className="category-hero-grid">
          <div className="category-hero-copy">
            <div className="eyebrow">SHOES COLLECTION</div>
            <h1 id="category-hero-title">{category}</h1>
            <p className="category-hero-lead">{catMeta.description}</p>
            <button type="button" className="primary" onClick={() => document.getElementById("category-shop")?.scrollIntoView({ behavior: "smooth" })}>
              EXPLORE COLLECTION →
            </button>
          </div>
          <img className="category-hero-img" src={catMeta.heroImage} alt="" width={900} height={640} fetchPriority="high" />
        </div>
      </section>

      <section className="category-info-blocks" aria-label={`${category} highlights`}>
        {catMeta.infoBlocks.map((block) => (
          <div key={block.title} className="category-info-block">
            <span className="category-info-icon" aria-hidden="true">
              {block.icon}
            </span>
            <strong>{block.title}</strong>
            <p>{block.text}</p>
          </div>
        ))}
      </section>

      <section className="section" id="category-shop">
        <div className="section-heading">
          <div>
            <div className="eyebrow">CURATED FOR YOU</div>
            <h2>{category} Collection</h2>
            <p className="muted">Search, filter, and shop every {category.toLowerCase()} sneaker in stock.</p>
          </div>
          <SearchBox products={products} value={search} onChange={(value) => { setPage(0); setSearch(value); }} onPick={(p) => onOpen(p)} />
        </div>

        <div className="filter-bar">
          <div className="filters" role="group" aria-label="Category">
            {categories.map((item) => (
              <button
                type="button"
                key={item.name}
                className={`filter ${item.name === category ? "active" : ""}`}
                aria-pressed={item.name === category}
                onClick={() => navigate(item.path)}
              >
                {item.name}
              </button>
            ))}
            <button
              type="button"
              className={`filter ${favoritesOnly ? "active" : ""}`}
              aria-pressed={favoritesOnly}
              onClick={() => setFavoritesOnly((v) => !v)}
            >
              ♥ Favorites ({favorites.length})
            </button>
          </div>
          <div className="advanced-filters">
            <label>
              EU size
              <select value={size} onChange={(e) => { setSize(e.target.value); setPage(0); }}>
                <option value="">All sizes</option>
                {Array.from({ length: 11 }, (_, i) => 36 + i).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Color
              <select value={color} onChange={(e) => { setColor(e.target.value); setPage(0); }}>
                <option value="">All colors</option>
                {colors.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Brand</span>
              <select value={brand} onChange={(e) => { setBrand(e.target.value); setPage(0); }} aria-label="Brand">
                <option value="all">All brands</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Gender</span>
              <select value={gender} onChange={(e) => { setGender(e.target.value); setPage(0); }} aria-label="Gender">
                <option value="all">All genders</option>
                {genders.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Price</span>
              <select value={price} onChange={(e) => { setPrice(e.target.value); setPage(0); }} aria-label="Price range">
                {Object.entries(PRICE_RANGES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Sort</span>
              <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }} aria-label="Sort products">
                {Object.entries(SORTS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={inStock} onChange={(e) => { setInStock(e.target.checked); setPage(0); }} /> In stock only
            </label>
            <span className="result-count" aria-live="polite">
              {results.loading ? "Searching…" : `${results.count} products`}
            </span>
          </div>
        </div>

        {catalog.offline && (
          <p className="notice" role="status">
            Live inventory is unavailable right now — showing the catalog without stock levels.{" "}
            <button type="button" className="text-link" onClick={catalog.refresh}>
              Retry
            </button>
          </p>
        )}

        {results.loading ? (
          <ProductGridSkeleton count={6} />
        ) : results.error ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              !
            </div>
            <h3>Search is temporarily unavailable</h3>
            <p className="muted" role="alert">
              {results.error}
            </p>
            <button type="button" className="primary" onClick={() => setRetryNonce((n) => n + 1)}>
              Try again
            </button>
          </div>
        ) : filtered.length ? (
          <div className="product-grid" id="catalog-grid">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} {...cardProps(p)} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              ⌕
            </div>
            <h3>No products match your filters</h3>
            <p className="muted">Try a different search or clear the filters.</p>
            <button type="button" className="primary" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}
        <CatalogPager
          page={page}
          pageSize={PAGE_SIZE}
          total={favoritesOnly ? filtered.length : results.count}
          onPage={(next) => {
            setPage(next);
            document.getElementById("catalog-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </section>
    </main>
  );
}