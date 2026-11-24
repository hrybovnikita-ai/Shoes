import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import SearchBox from "../components/SearchBox";
import { shoesAPI } from "../api";
import { ProductGridSkeleton } from "../components/Skeleton";
import { brandFilters, categories, genders } from "../data/catalog";
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

function Row({ title, eyebrow, items, cardProps, action }) {
  if (!items.length) return null;
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      <div className="product-grid row-grid">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} {...cardProps(p)} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage({ catalog, favorites, onFavorite, onOpen, onQuickView, recent }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const category = categories.some((c) => c.name === params.get("category")) ? params.get("category") : "All";

  const [search, setSearch] = useState(params.get("q") || "");
  const [sort, setSort] = useState("featured");
  const [brand, setBrand] = useState("all");
  const [gender, setGender] = useState("all");
  const [price, setPrice] = useState("all");
  const [inStock, setInStock] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useDocumentMeta({
    title: location.pathname === "/shop" ? "Shop Sneakers" : undefined,
    description:
      "Shop premium running, lifestyle and casual sneakers at SHOES. Free shipping on orders over $150. Demo store — no real payments.",
  });

  // Scroll to the section the URL points at.
  useEffect(() => {
    const section = { "/shop": "shop", "/categories": "categories" }[location.pathname] || null;
    const frame = requestAnimationFrame(() => {
      if (section) document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
      else if (location.pathname === "/") window.scrollTo({ top: 0 });
      if (params.get("focus") === "search") document.getElementById("search-input")?.focus();
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  const products = catalog.products;
  const brands = useMemo(() => {
    const live = [...new Set(products.map((p) => p.brand))].sort();
    return live.length ? live : brandFilters;
  }, [products]);

  const [size,setSize]=useState('');
  const [color,setColor]=useState('');
  const [page,setPage]=useState(0);
  const [trackedCategory, setTrackedCategory] = useState(category);
  if (trackedCategory !== category) {
    setTrackedCategory(category);
    setPage(0);
  }
  const [retryNonce,setRetryNonce]=useState(0);
  const [results,setResults]=useState({products:[],loading:true,error:'',count:0});
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setResults(s=>({...s,loading:true,error:''}));
      const bounds={all:{},u100:{maxPrice:99.99},'100-150':{minPrice:100,maxPrice:150},'150-200':{minPrice:150.01,maxPrice:200},o200:{minPrice:200.01}}[price];
      try {
        const result=await shoesAPI.search({q:search,category,brand,gender,sort,inStock:String(inStock),...bounds,...(size?{size}:{}),...(color?{color}:{}),limit:PAGE_SIZE,offset:page*PAGE_SIZE},{signal:controller.signal});
        if(!controller.signal.aborted)setResults({...result,loading:false,error:''});
      }catch(e){if(!controller.signal.aborted)setResults({products:[],loading:false,error:e.message,count:0});}
    },250);
    return()=>{clearTimeout(timer);controller.abort();};
  },[search,category,brand,gender,sort,inStock,price,size,color,page,retryNonce]);
  const filtered=results.products.filter(p=>!favoritesOnly||favorites.includes(p.id)).map(p=>({...p,fromApi:true}));
  const colors=[...new Set([...products.map(p=>p.color),...results.products.flatMap(p=>p.colors||[])])].filter(Boolean).sort();

  const chooseCategory = (value) =>
    navigate(value === "All" ? "/shop" : `/shop?category=${encodeURIComponent(value)}`);

  const clearFilters = () => {
    setSearch("");
    setSize("");setColor("");setPage(0);
    setBrand("all");
    setGender("all");
    setPrice("all");
    setInStock(false);
    setFavoritesOnly(false);
    setSort("featured");
    chooseCategory("All");
  };

  const cardProps = (p) => ({ favorite: favorites.includes(p.id), onFavorite, onOpen, onQuickView });

  const hasSales = products.some((p) => (p.unitsSold || 0) > 0);
  const bestSellers = hasSales
    ? [...products].filter((p) => p.unitsSold > 0).sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 4)
    : [];
  const featured = [...products].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 4);
  const newArrivals = [...products].sort((a, b) => b.id - a.id).slice(0, 4);
  const recentProducts = recent.map((id) => products.find((p) => p.id === id)).filter(Boolean).slice(0, 4);

  return (
    <main className="container" id="main-content">
      <section className="hero" id="home">
        <div className="hero-content">
          <div className="eyebrow">NEW SEASON · {products.length || 6}+ CURATED STYLES</div>
          <h1>
            WALK
            <br />
            YOUR
            <br />
            WAY<span className="accent">.</span>
          </h1>
          <p>Discover premium sneakers, iconic styles and everyday essentials. Your next favorite pair starts here.</p>
          <div className="hero-actions">
            <button type="button" className="primary" onClick={() => chooseCategory("All")}>
              EXPLORE COLLECTION →
            </button>
            <button type="button" className="ghost" onClick={() => navigate("/categories")}>
              Shop by category
            </button>
          </div>
          <div className="hero-stats">
            <span>
              <strong>{String(products.length || 6).padStart(2, "0")}</strong> Curated styles
            </span>
            <span>
              <strong>{categories.length}</strong> Collections
            </span>
            <span>
              <strong>$150</strong> Free shipping from
            </span>
          </div>
        </div>
        <img
          className="hero-image"
          src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&auto=format&q=75"
          alt="Red Nike sneaker on a red background"
          fetchPriority="high"
          width="1200"
          height="900"
        />
      </section>

      <section className="benefits" id="features" aria-label="Customer benefits">
        <div>
          <strong>↗ Free Shipping</strong>
          <small>On orders of $150 or more</small>
        </div>
        <div>
          <strong>⚡ Premium Quality</strong>
          <small>Carefully selected footwear</small>
        </div>
        <div>
          <strong>🔒 Secure Checkout</strong>
          <small>No card data stored on SHOES</small>
        </div>
        <div>
          <strong>↩ Easy Returns</strong>
          <small>30-day return policy (demo)</small>
        </div>
      </section>

      <section className="section" id="categories">
        <div className="section-heading">
          <div>
            <div className="eyebrow">FIND YOUR STYLE</div>
            <h2>Shop by Category</h2>
            <p className="muted">The right pair for every moment.</p>
          </div>
          <button type="button" className="text-link" onClick={() => chooseCategory("All")}>
            View all products ↗
          </button>
        </div>
        <div className="category-grid">
          {categories.map((item) => (
            <button type="button" key={item.name} className="category-card" onClick={() => chooseCategory(item.name)}>
              <img src={`${item.image}&auto=format&q=70`} alt="" loading="lazy" decoding="async" width="700" height="500" />
              <span className="category-overlay">
                <strong>{item.name}</strong>
                <small>
                  {item.subtitle} · {products.filter((p) => p.category === item.name).length} styles
                </small>
              </span>
              <span className="category-arrow" aria-hidden="true">
                ↗
              </span>
            </button>
          ))}
        </div>
      </section>

      {catalog.loading ? null : (
        <>
          <Row title="Featured Sneakers" eyebrow="TOP RATED" items={featured} cardProps={cardProps} />
          {bestSellers.length > 0 && (
            <Row title="Best Sellers" eyebrow="MOST ORDERED IN THIS STORE" items={bestSellers} cardProps={cardProps} />
          )}
          <Row title="New Arrivals" eyebrow="LATEST ADDITIONS" items={newArrivals} cardProps={cardProps} />
        </>
      )}

      <section className="promo" aria-label="Promotion">
        <div className="eyebrow">YOUR STYLE. YOUR RULES.</div>
        <h2>
          15% OFF YOUR
          <br />
          FIRST PAIR.
        </h2>
        <p>
          Use code <strong className="code-chip">WELCOME15</strong> at checkout, or <strong className="code-chip">SHOES10</strong> for 10% off.
        </p>
        <button type="button" className="primary" onClick={() => chooseCategory("All")}>
          SHOP THE COLLECTION →
        </button>
      </section>

      <section className="section" id="shop">
        <div className="section-heading">
          <div>
            <div className="eyebrow">CURATED FOR YOU</div>
            <h2>{favoritesOnly ? "Your Favorites" : category === "All" ? "Our Collection" : category}</h2>
            <p className="muted">Find your perfect fit from our latest selection.</p>
          </div>
          <SearchBox
            products={products}
            value={search}
            onChange={value=>{setPage(0);setSearch(value);}}
            onPick={(p) => onOpen(p)}
          />
        </div>

        <div className="filter-bar">
          <div className="filters" role="group" aria-label="Category">
            {["All", ...categories.map((c) => c.name)].map((item) => (
              <button
                type="button"
                key={item}
                className={`filter ${category === item ? "active" : ""}`}
                aria-pressed={category === item}
                onClick={() => chooseCategory(item)}
              >
                {item}
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
            <label>EU size<select value={size} onChange={e=>{setSize(e.target.value);setPage(0);}}><option value="">All sizes</option>{Array.from({length:11},(_,i)=>36+i).map(s=><option key={s}>{s}</option>)}</select></label>
            <label>Color<select value={color} onChange={e=>{setColor(e.target.value);setPage(0);}}><option value="">All colors</option>{colors.map(c=><option key={c}>{c}</option>)}</select></label>
            <label>
              <span className="sr-only">Brand</span>
              <select value={brand} onChange={(e) => {setBrand(e.target.value);setPage(0);}} aria-label="Brand">
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
              <select value={gender} onChange={(e) => {setGender(e.target.value);setPage(0);}} aria-label="Gender">
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
              <select value={price} onChange={(e) => {setPrice(e.target.value);setPage(0);}} aria-label="Price range">
                {Object.entries(PRICE_RANGES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Sort</span>
              <select value={sort} onChange={(e) => {setSort(e.target.value);setPage(0);}} aria-label="Sort products">
                {Object.entries(SORTS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={inStock} onChange={(e) => {setInStock(e.target.checked);setPage(0);}} /> In stock only
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
              {favoritesOnly ? "♡" : "⌕"}
            </div>
            <h3>{favoritesOnly ? "No favorites yet" : "No products match your filters"}</h3>
            <p className="muted">{favoritesOnly ? "Tap the heart on any sneaker to save it." : "Try a different search or clear the filters."}</p>
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

      {recentProducts.length > 0 && (
        <Row title="Recently Viewed" eyebrow="PICK UP WHERE YOU LEFT OFF" items={recentProducts} cardProps={cardProps} />
      )}
    </main>
  );
}
