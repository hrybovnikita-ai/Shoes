import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { shoesAPI } from "./api";
import ProductCarousel from "./components/ProductCarousel";
import ProductGallery from "./components/ProductGallery";
import ProductReviews from "./components/ProductReviews";
import { LinesSkeleton } from "./components/Skeleton";
import useDocumentMeta from "./hooks/useDocumentMeta";
import { swatchStyle } from "./lib/colorSwatch";
import ProductImage from "./components/ProductImage";
import { money, SIZES, stockInfo } from "./lib/format";
import { KEYS } from "./lib/storage";
import SizeFinder from "./commerce/SizeFinder";
import PricePanel from "./commerce/PricePanel";
import useInventory from "./commerce/useInventory";
import "./ProductPage.css";

function ProductDetails({ products = [], loading, onAddToCart, onViewed, favorites = [], onFavorite, onOpen, onQuickView, recent = [] }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const product = products.find((item) => String(item.id) === String(id));

  const inventory = useInventory(product?.id);
  const [sizeGuide, setSizeGuide] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(product?.color || "");
  const [quantity, setQuantity] = useState(1);
  const [notification, setNotification] = useState("");
  const [related, setRelated] = useState([]);
  const [stickyBar, setStickyBar] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const actionsRef = useRef(null);

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

  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyBar(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -12px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product?.id]);

  const relatedProducts = useMemo(() => {
    const ids = related.length
      ? related.map((r) => r.id)
      : products.filter((p) => p.id !== product?.id && p.category === product?.category).map((p) => p.id);
    return ids
      .map((rid) => products.find((p) => p.id === rid))
      .filter(Boolean)
      .slice(0, 8);
  }, [related, products, product]);

  const recentProducts = recent
    .filter((r) => r !== product?.id)
    .map((r) => products.find((p) => p.id === r))
    .filter(Boolean)
    .slice(0, 8);

  const selectedVariant = inventory.data?.variants.find(
    (v) => v.size === selectedSize && v.color === (selectedColor || product?.color)
  );
  const stock = inventory.data?.managed
    ? selectedSize == null
      ? inventory.data.variants.reduce((s, v) => s + v.available, 0)
      : selectedVariant?.available || 0
    : product?.fromApi
      ? Math.max(0, Number(product.stock) || 0)
      : null;
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
          <div className="shoe-product-layout shoe-product-skeleton">
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
        <button type="button" className="primary" onClick={() => navigate("/shop")}>
          Back to Shop →
        </button>
      </main>
    );
  }

  const images = [...(Array.isArray(product.images) && product.images.length ? product.images : [product.image])].filter(
    (img, i, arr) => img && arr.indexOf(img) === i
  );
  const colors = inventory.data?.managed
    ? [...new Set(inventory.data.variants.map((v) => v.color))]
    : Array.isArray(product.colors) && product.colors.length
      ? product.colors
      : [product.color].filter(Boolean);
  const sizes = inventory.data?.managed
    ? [...new Set([...SIZES, ...inventory.data.variants.map((v) => v.size)])].sort((a, b) => a - b)
    : SIZES;
  const price = Number(product.price) || 0;
  const oldPrice = Number(product.oldPrice) || 0;
  const discount = oldPrice > price && price > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  const favorite = favorites.includes(product.id);

  const createCartItem = () => {
    if (inventory.loading || inventory.error) return setNotification("Please wait for live inventory or refresh the page."), null;
    if (quantity > maxQuantity) return setNotification("Stock changed. Please reduce the quantity."), null;
    if (outOfStock) return setNotification("This product is out of stock."), null;
    if (selectedSize === null) return setNotification("Please select your EU shoe size."), null;
    const color = selectedColor || colors[0];
    if (!color) return setNotification("Please select a color."), null;
    setNotification("");
    return { size: selectedSize, color, quantity };
  };

  const addToCart = () => {
    const opts = createCartItem();
    if (opts) {
      onAddToCart(product, opts);
      setCartPulse(true);
      setTimeout(() => setCartPulse(false), 1200);
    }
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
  const sizeUnavailable = (size) =>
    inventory.data?.managed &&
    !inventory.data.variants.some((v) => v.size === size && v.color === (selectedColor || colors[0]) && v.available > 0);

  return (
    <main className="shoe-product-page" id="main-content">
      <nav className="shoe-breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={() => navigate("/shop")}>
          ← Shop
        </button>
        <span aria-hidden="true"> / </span>
        <button type="button" onClick={() => navigate(`/shop?category=${encodeURIComponent(product.category)}`)}>
          {product.category}
        </button>
        <span aria-current="page"> / {product.name}</span>
      </nav>

      <div className="shoe-product-layout">
        <ProductGallery images={images} productName={product.name} badge={product.badge} discount={discount} />

        <section className="shoe-product-info" aria-label="Product details">
          <header className="shoe-info-head">
            <span className="shoe-label">
              {product.brand} · {product.category}
            </span>
            <h1>{product.name}</h1>
            <div className="shoe-meta-row">
              {product.rating != null && (
                <span className="shoe-store-rating" title="Store rating">
                  ★ {product.rating}
                </span>
              )}
              <a className="shoe-review-link" href="#reviews-title">
                {product.reviewCount
                  ? `${product.reviewCount} review${product.reviewCount === 1 ? "" : "s"}`
                  : "Write the first review"}
              </a>
            </div>
            <PriceRow price={price} oldPrice={oldPrice} discount={discount} info={info} />
          </header>

          <PurchaseCard
            sizes={sizes}
            colors={colors}
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
            setQuantity={setQuantity}
            setNotification={setNotification}
            quantity={quantity}
            maxQuantity={maxQuantity}
            inventory={inventory}
            sizeUnavailable={sizeUnavailable}
            setSizeGuide={setSizeGuide}
            notification={notification}
            actionsRef={actionsRef}
            product={product}
            outOfStock={outOfStock}
            cartPulse={cartPulse}
            addToCart={addToCart}
            buyNow={buyNow}
            favorite={favorite}
            onFavorite={onFavorite}
            navigate={navigate}
          />

          <div className="shoe-specs-grid" role="list">
            <Spec icon="◎" term="Brand" value={product.brand} />
            <Spec icon="▤" term="Category" value={product.category} />
            <Spec icon="◉" term="Color" value={product.color} />
            <Spec icon="⇄" term="EU sizes" value={product.sizes?.eu?.length ? product.sizes.eu.join(", ") : "36–46"} />
            <Spec
              icon="↔"
              term="US / UK"
              value={`${product.sizes?.us?.length ? `US ${product.sizes.us.join(", ")}` : "See guide"}${product.sizes?.uk?.length ? ` · UK ${product.sizes.uk.join(", ")}` : ""}`}
            />
            {product.gender && <Spec icon="⚥" term="Gender" value={product.gender} />}
            <Spec icon="⌖" term="SKU" value={product.slug || `SHOES-${String(product.id).padStart(4, "0")}`} />
            <Spec icon="✓" term="Availability" value={info.label} />
          </div>

          <div className="shoe-accordion-group">
            {product.description && (
              <details className="shoe-accordion" open>
                <summary>Product description</summary>
                <p>{product.description}</p>
              </details>
            )}
            {product.materials && (
              <details className="shoe-accordion">
                <summary>Materials &amp; construction</summary>
                <p>{product.materials}</p>
              </details>
            )}
            <details className="shoe-accordion">
              <summary>Shipping</summary>
              <p>Free standard shipping on orders over $150. Demo store — tracking is simulated.</p>
            </details>
            <details className="shoe-accordion">
              <summary>Returns</summary>
              <p>30-day demo returns on unworn pairs. Card details are never stored on SHOES.</p>
            </details>
          </div>
        </section>
      </div>

      <LowerSections product={product} relatedProducts={relatedProducts} recentProducts={recentProducts} cardProps={cardProps} />

      {sizeGuide && (
        <SizeFinder
          product={product}
          inventory={inventory.data}
          onSelect={(size) => {
            setSelectedSize(size);
            setQuantity(1);
          }}
          onClose={() => setSizeGuide(false)}
        />
      )}

      {stickyBar && (
        <StickyBar price={price} info={info} outOfStock={outOfStock} addToCart={addToCart} product={product} />
      )}
    </main>
  );
}

function Spec({ icon, term, value }) {
  return (
    <div className="shoe-spec-cell" role="listitem">
      <span className="shoe-spec-term">
        <span aria-hidden="true">{icon}</span> {term}
      </span>
      <span className="shoe-spec-value">{value}</span>
    </div>
  );
}

function PurchaseCard(props) {
  const {
    sizes,
    colors,
    selectedSize,
    setSelectedSize,
    selectedColor,
    setSelectedColor,
    setQuantity,
    setNotification,
    quantity,
    maxQuantity,
    inventory,
    sizeUnavailable,
    setSizeGuide,
    notification,
    actionsRef,
    product,
    outOfStock,
    cartPulse,
    addToCart,
    buyNow,
    favorite,
    onFavorite,
    navigate,
  } = props;

  return (
    <section className="shoe-purchase-card" aria-label="Purchase options">
      <div className="shoe-size-header">
        <h2 className="h3">Size (EU)</h2>
        <button className="commerce-size-button" type="button" onClick={() => setSizeGuide(true)}>
          Size guide
        </button>
      </div>
      <div className="shoe-size-grid" role="group" aria-label="EU size">
        {sizes.map((size) => (
          <button
            type="button"
            key={size}
            disabled={
              inventory.loading ||
              Boolean(inventory.error) ||
              (inventory.data?.managed && sizeUnavailable(size))
            }
            className={`shoe-size-btn ${selectedSize === size ? "active" : ""} ${sizeUnavailable(size) ? "unavailable" : ""}`}
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

      <p className={`commerce-availability ${inventory.error ? "error" : ""}`} role="status">
        {inventory.loading
          ? "Checking size availability…"
          : inventory.error ||
            (inventory.data?.managed
              ? "Live stock · refreshes every 5 seconds"
              : "Size-level inventory not configured for this product.")}
      </p>

      <h2 className="h3">Color</h2>
      <ColorSwatches
        colors={colors}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        setNotification={setNotification}
      />

      <h2 className="h3">Quantity</h2>
      <div className="shoe-quantity quantity-control">
        <button type="button" disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
          −
        </button>
        <span aria-live="polite">{quantity}</span>
        <button
          type="button"
          disabled={quantity >= maxQuantity}
          onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      {notification && (
        <p className="shoe-notification" role="alert">
          {notification}
        </p>
      )}

      <div className="shoe-actions" ref={actionsRef}>
        {product.customizable && (
          <button type="button" className="shoe-secondary-btn" onClick={() => navigate(`/customizer/${product.id}`)}>
            Customize
          </button>
        )}
        <button type="button" className={`shoe-cart-btn ${cartPulse ? "is-success" : ""}`} disabled={outOfStock} onClick={addToCart}>
          {cartPulse ? "Added ✓" : "+ Add to cart"}
        </button>
        <button type="button" className="shoe-buy-btn" disabled={outOfStock} onClick={buyNow}>
          Buy now →
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

      <ul className="shoe-trust-mini">
        <li>Free shipping $150+</li>
        <li>30-day returns</li>
        <li>Secure checkout</li>
      </ul>
    </section>
  );
}

function ColorSwatches({ colors, selectedColor, setSelectedColor, setNotification }) {
  const active = selectedColor || colors[0];
  return (
    <div className="shoe-color-swatches" role="group" aria-label="Color">
      {colors.map((color) => (
        <button
          type="button"
          key={color}
          className={active === color ? "active" : ""}
          aria-pressed={active === color}
          aria-label={color}
          onClick={() => {
            setSelectedColor(color);
            setNotification("");
          }}
        >
          <span className="shoe-swatch" style={swatchStyle(color)} />
          <span className="shoe-swatch-label">{color}</span>
        </button>
      ))}
    </div>
  );
}

function PriceRow({ price, oldPrice, discount, info }) {
  return (
    <div className="shoe-price-block">
      <div className="shoe-price">
        <strong>{money(price)}</strong>
        {oldPrice > price && <del>{money(oldPrice)}</del>}
        {discount > 0 && <span className="save-chip">Save {money(oldPrice - price)}</span>}
      </div>
      <p className={`stock-pill stock-${info.tone}`} data-testid="stock">
        {info.label}
      </p>
    </div>
  );
}

function LowerSections({ product, relatedProducts, recentProducts, cardProps }) {
  return (
    <div className="shoe-product-stack">
      <PricePanel product={product} />
      <ProductReviews productId={product.id} />
      <ProductCarousel eyebrow="YOU MAY ALSO LIKE" title="Related products" id="related" products={relatedProducts} cardProps={cardProps} />
      <ProductCarousel eyebrow="YOUR HISTORY" title="Recently viewed" id="recent" products={recentProducts} cardProps={cardProps} />
    </div>
  );
}

function StickyBar({ price, info, outOfStock, addToCart, product }) {
  return (
    <div className="shoe-mobile-bar" role="region" aria-label="Quick purchase">
      <div className="shoe-mobile-bar-meta">
        <ProductImage src={product.image} alt="" width="48" height="48" />
        <div>
          <strong>{money(price)}</strong>
          <span className={`stock-pill stock-${info.tone}`}>{info.label}</span>
        </div>
      </div>
      <button type="button" className="shoe-buy-btn" disabled={outOfStock} onClick={addToCart}>
        Add to cart
      </button>
    </div>
  );
}

export default function ProductPage(props) {
  const { id } = useParams();
  return <ProductDetails key={id} {...props} />;
}