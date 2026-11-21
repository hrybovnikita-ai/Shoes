import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { shoesAPI } from "./api";
import { useAuth } from "./auth/AuthContext";
import ProductCard from "./components/ProductCard";
import { LinesSkeleton } from "./components/Skeleton";
import { useToast } from "./components/Toast";
import useDocumentMeta from "./hooks/useDocumentMeta";
import { formatDate, imageSrcSet, money, SIZES, stockInfo } from "./lib/format";
import "./ProductPage.css";

import { KEYS } from "./lib/storage";

function Stars({ value }) {
  const v = Math.round(Number(value) || 0);
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {"★★★★★".slice(0, v)}
      <span className="stars-off">{"★★★★★".slice(v)}</span>
    </span>
  );
}

function Reviews({ productId }) {
  const { user, getToken } = useAuth();
  const { notify } = useToast();
  const [data, setData] = useState({ loading: true, reviews: [], average: null, count: 0, error: "" });
  const [form, setForm] = useState({ rating: 5, title: "", body: "" });
  const [saving, setSaving] = useState(false);

  const load = () =>
    shoesAPI
      .getReviews(productId)
      .then((r) => setData({ loading: false, reviews: r.reviews, average: r.average, count: r.count, error: "" }))
      .catch((e) => setData((d) => ({ ...d, loading: false, error: e.message })));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      await shoesAPI.createReview(productId, { rating: Number(form.rating), title: form.title, body: form.body }, token);
      setForm({ rating: 5, title: "", body: "" });
      notify("Thanks! Your review was published.");
      load();
    } catch (err) {
      notify(err.message, { type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="shoe-reviews" aria-labelledby="reviews-title">
      <div className="shoe-section-head">
        <h2 id="reviews-title">Customer Reviews</h2>
        <span className="muted">
          {data.count ? (
            <>
              <Stars value={data.average} /> {data.average} / 5 · {data.count} review{data.count === 1 ? "" : "s"}
            </>
          ) : (
            "No reviews yet"
          )}
        </span>
      </div>
      <p className="muted small">Reviews are written by signed-in SHOES customers. “Verified purchase” means the reviewer has an order containing this product.</p>
      {data.loading ? (
        <LinesSkeleton lines={3} />
      ) : data.error ? (
        <p className="form-error">{data.error}</p>
      ) : (
        <ul className="review-list">
          {data.reviews.map((r) => (
            <li key={r.id} className="review">
              <div>
                <Stars value={r.rating} /> <strong>{r.title || "Review"}</strong>
              </div>
              <p>{r.body}</p>
              <small className="muted">
                {r.author} · {formatDate(r.createdAt)}
                {r.verifiedPurchase ? " · ✓ Verified purchase" : ""}
              </small>
            </li>
          ))}
        </ul>
      )}
      {user ? (
        <form className="review-form" onSubmit={submit}>
          <h3>Write a review</h3>
          <label>
            Rating
            <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title (optional)
            <input maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label>
            Your review
            <textarea required minLength={10} maxLength={1000} rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </label>
          <button type="submit" className="shoe-cart-btn" disabled={saving}>
            {saving ? "Publishing…" : "Publish review"}
          </button>
        </form>
      ) : (
        <p className="muted">
          <a href="/login">Sign in</a> to write a review.
        </p>
      )}
    </section>
  );
}

function ProductDetails({ products = [], loading, onAddToCart, onViewed, favorites = [], onFavorite, onOpen, onQuickView, recent = [] }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const product = products.find((item) => String(item.id) === String(id));

  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(product?.color || "");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [notification, setNotification] = useState("");
  const [related, setRelated] = useState([]);

  useEffect(() => {
    if (product) onViewed?.(product.id);
  }, [product, onViewed]);

  useEffect(() => {
    if (!product?.fromApi) return undefined;
    let active = true;
    shoesAPI
      .getRelated(product.id)
      .then((r) => active && setRelated(r.products || []))
      .catch(() => active && setRelated([]));
    return () => {
      active = false;
    };
  }, [product?.id, product?.fromApi]);

  const relatedProducts = useMemo(() => {
    const ids = related.length ? related.map((r) => r.id) : products.filter((p) => p.id !== product?.id && p.category === product?.category).map((p) => p.id);
    return ids.map((rid) => products.find((p) => p.id === rid)).filter(Boolean).slice(0, 4);
  }, [related, products, product]);

  const recentProducts = recent.filter((r) => r !== product?.id).map((r) => products.find((p) => p.id === r)).filter(Boolean).slice(0, 4);

  const stock = product?.fromApi ? Math.max(0, Number(product.stock) || 0) : null;
  const info = stockInfo(stock);
  const outOfStock = stock === 0;
  const maxQuantity = Math.max(1, Math.min(10, stock ?? 10));

  useDocumentMeta({
    title: product ? `${product.name} — ${product.brand}` : loading ? "Loading" : "Product not found",
    description: product
      ? `${product.name} by ${product.brand}. ${product.category} sneaker in ${product.color}. ${money(product.price)} at SHOES.`
      : undefined,
    image: product?.image,
    noindex: !product,
    jsonLd: product
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          brand: { "@type": "Brand", name: product.brand },
          category: product.category,
          color: product.color,
          image: product.image,
          sku: `SHOES-${String(product.id).padStart(4, "0")}`,
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: Number(product.price).toFixed(2),
            availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          },
          ...(product.reviewCount
            ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.reviewAverage, reviewCount: product.reviewCount } }
            : {}),
        }
      : null,
  });

  if (!product) {
    if (loading) {
      return (
        <main className="shoe-product-page" id="main-content">
          <div className="shoe-product-layout">
            <div className="skeleton skeleton-photo tall" />
            <LinesSkeleton lines={6} />
          </div>
        </main>
      );
    }
    return (
      <main className="shoe-not-found" id="main-content">
        <h1>Product Not Found</h1>
        <p>The product you are looking for does not exist.</p>
        <button type="button" onClick={() => navigate("/shop")}>
          Back to Shop →
        </button>
      </main>
    );
  }

  const images = [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter((img, i, arr) => img && arr.indexOf(img) === i);
  const colors = Array.isArray(product.colors) && product.colors.length ? product.colors : [product.color].filter(Boolean);
  const price = Number(product.price) || 0;
  const oldPrice = Number(product.oldPrice) || 0;
  const discount = oldPrice > price && price > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  const favorite = favorites.includes(product.id);

  const createCartItem = () => {
    if (outOfStock) return setNotification("This product is out of stock."), null;
    if (selectedSize === null) return setNotification("Please select your EU shoe size."), null;
    const color = selectedColor || colors[0];
    if (!color) return setNotification("Please select a color."), null;
    setNotification("");
    return { size: selectedSize, color, quantity };
  };

  const addToCart = () => {
    const opts = createCartItem();
    if (opts) onAddToCart(product, opts);
  };

  const buyNow = () => {
    const opts = createCartItem();
    if (!opts) return;
    const line = { id: product.id, name: product.name, brand: product.brand, image: product.image, price: product.price, ...opts };
    try {
      sessionStorage.setItem(KEYS.buyNow, JSON.stringify([line]));
    } catch {
      /* ignore */
    }
    navigate("/checkout?mode=buy-now");
  };

  const cardProps = (p) => ({ favorite: favorites.includes(p.id), onFavorite, onOpen, onQuickView });

  return (
    <main className="shoe-product-page" id="main-content">
      <nav className="shoe-breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={() => navigate("/shop")}>
          ← Shop
        </button>
        <span> / </span>
        <button type="button" onClick={() => navigate(`/shop?category=${encodeURIComponent(product.category)}`)}>
          {product.category}
        </button>
        <span aria-current="page"> / {product.name}</span>
      </nav>

      <div className="shoe-product-layout">
        <section className="shoe-gallery" aria-label="Product images">
          <div className="shoe-main-image">
            <img
              src={images[activeImage] || images[0]}
              srcSet={imageSrcSet(images[activeImage] || images[0])}
              sizes="(max-width: 900px) 100vw, 50vw"
              alt={`${product.name} — image ${activeImage + 1} of ${images.length}`}
              width="900"
              height="900"
            />
            {product.badge && <span className="shoe-product-badge">{product.badge}</span>}
            {discount > 0 && <span className="shoe-discount-badge">-{discount}%</span>}
            {images.length > 1 && (
              <div className="shoe-gallery-controls">
                <button type="button" onClick={() => setActiveImage((c) => (c - 1 + images.length) % images.length)} aria-label="Previous image">
                  ←
                </button>
                <button type="button" onClick={() => setActiveImage((c) => (c + 1) % images.length)} aria-label="Next image">
                  →
                </button>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="shoe-thumbnails">
              {images.map((image, index) => (
                <button
                  type="button"
                  key={image}
                  className={activeImage === index ? "selected" : ""}
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={activeImage === index}
                >
                  <img src={image} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="shoe-product-info">
          <span className="shoe-label">
            {product.brand} · {product.category}
          </span>
          <h1>{product.name}</h1>
          <div className="shoe-rating">
            {product.rating != null && <span title="Store rating">★ {product.rating} store rating</span>}
            <a href="#reviews-title">
              {product.reviewCount ? `${product.reviewCount} customer review${product.reviewCount === 1 ? "" : "s"}` : "No customer reviews yet"}
            </a>
          </div>
          <div className="shoe-price">
            <strong>{money(price)}</strong>
            {oldPrice > price && <del>{money(oldPrice)}</del>}
            {discount > 0 && <span className="save-chip">Save {money(oldPrice - price)}</span>}
          </div>
          <p className={`stock-pill stock-${info.tone}`} data-testid="stock">
            {info.label}
          </p>

          <div className="shoe-size-header">
            <h2 className="h3">Select Size</h2>
            <span>EU 36–46</span>
          </div>
          <div className="shoe-size-grid" role="group" aria-label="EU size">
            {SIZES.map((size) => (
              <button
                type="button"
                key={size}
                className={selectedSize === size ? "active" : ""}
                onClick={() => {
                  setSelectedSize(size);
                  setNotification("");
                }}
                aria-pressed={selectedSize === size}
              >
                {size}
              </button>
            ))}
          </div>

          <h2 className="h3">Color</h2>
          <div className="shoe-color-grid" role="group" aria-label="Color">
            {colors.map((color) => (
              <button
                type="button"
                key={color}
                className={(selectedColor || colors[0]) === color ? "active" : ""}
                aria-pressed={(selectedColor || colors[0]) === color}
                onClick={() => setSelectedColor(color)}
              >
                {color}
              </button>
            ))}
          </div>

          <h2 className="h3">Quantity</h2>
          <div className="shoe-quantity">
            <button type="button" disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
              −
            </button>
            <span aria-live="polite">{quantity}</span>
            <button type="button" disabled={quantity >= maxQuantity} onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))} aria-label="Increase quantity">
              +
            </button>
          </div>

          {notification && (
            <p className="shoe-notification" role="alert">
              {notification}
            </p>
          )}

          <div className="shoe-actions">
            <button type="button" className="shoe-cart-btn" disabled={outOfStock} onClick={addToCart}>
              + Add to Cart
            </button>
            <button type="button" className="shoe-buy-btn" disabled={outOfStock} onClick={buyNow}>
              Buy Now →
            </button>
            <button
              type="button"
              className={`shoe-fav-btn ${favorite ? "active" : ""}`}
              aria-pressed={favorite}
              onClick={() => onFavorite(product.id)}
              aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
            >
              {favorite ? "♥" : "♡"}
            </button>
          </div>

          <dl className="shoe-specs">
            <div>
              <dt>Brand</dt>
              <dd>{product.brand}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{product.category}</dd>
            </div>
            <div>
              <dt>Color</dt>
              <dd>{product.color}</dd>
            </div>
            <div>
              <dt>Sizes</dt>
              <dd>EU 36–46</dd>
            </div>
            <div>
              <dt>SKU</dt>
              <dd>SHOES-{String(product.id).padStart(4, "0")}</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>{info.label}</dd>
            </div>
          </dl>

          <div className="shoe-benefits">
            <p>✓ Free shipping on orders of $150 or more</p>
            <p>✓ 30-day demo returns</p>
            <p>✓ Card details are never stored on SHOES</p>
          </div>
        </section>
      </div>

      <Reviews productId={product.id} />

      {relatedProducts.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">YOU MAY ALSO LIKE</div>
              <h2>Related Products</h2>
            </div>
          </div>
          <div className="product-grid row-grid">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} {...cardProps(p)} />
            ))}
          </div>
        </section>
      )}

      {recentProducts.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">YOUR HISTORY</div>
              <h2>Recently Viewed</h2>
            </div>
          </div>
          <div className="product-grid row-grid">
            {recentProducts.map((p) => (
              <ProductCard key={p.id} product={p} {...cardProps(p)} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

// Re-mount per product so size/quantity/gallery state resets on navigation.
export default function ProductPage(props) {
  const { id } = useParams();
  return <ProductDetails key={id} {...props} />;
}
