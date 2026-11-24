import { money, stockInfo } from "../lib/format";
import ProductImage from "./ProductImage";

export default function ProductCard({ product, favorite, onFavorite, onOpen, onQuickView }) {
  const stock = stockInfo(product.fromApi ? product.stock : null);
  const discount =
    product.oldPrice > product.price ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : 0;

  return (
    <article className="product-card" data-testid="product-card">
      <div className="product-photo">
        <a
          className="product-image-button"
          href={`/product/${product.id}`}
          onClick={(e) => {
            e.preventDefault();
            onOpen(product);
          }}
          aria-label={`View ${product.name}`}
        >
          <ProductImage
            src={product.image}
            sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 25vw"
            alt={product.name}
            width="600"
            height="600"
          />
        </a>
        <span className="tag">{product.badge || "FEATURED"}</span>
        {discount > 0 && <span className="tag tag-sale">-{discount}%</span>}
        <button
          type="button"
          className={`favorite ${favorite ? "active" : ""}`}
          onClick={() => onFavorite(product.id)}
          aria-pressed={favorite}
          aria-label={favorite ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
        >
          {favorite ? "♥" : "♡"}
        </button>
        <button type="button" className="quick-view" onClick={() => onQuickView(product)}>
          Quick view ↗
        </button>
      </div>

      <div className="product-details">
        <div className="product-meta">
          <span className="product-brand-line">
            <span className="brand-chip" aria-hidden="true">
              {String(product.brand || "SH").slice(0, 2).toUpperCase()}
            </span>
            {product.brand}
          </span>
          {product.rating != null && (
            <span title="Store rating">
              ★ {product.rating}
              {product.reviewCount ? <small> ({product.reviewCount})</small> : null}
            </span>
          )}
        </div>
        <h3>
          <a
            className="product-title-link"
            href={`/product/${product.id}`}
            onClick={(e) => {
              e.preventDefault();
              onOpen(product);
            }}
          >
            {product.name}
          </a>
        </h3>
        <p>
          {product.category} / {product.color}
        </p>
        {product.fromApi && <p className={`stock-pill stock-${stock.tone}`}>{stock.label}</p>}
        <div className="product-bottom">
          <div>
            <strong>{money(product.price)}</strong>{" "}
            {product.oldPrice != null && product.oldPrice > product.price && <del>{money(product.oldPrice)}</del>}
          </div>
          <button
            type="button"
            className="add-btn"
            disabled={product.fromApi && product.stock === 0}
            onClick={() => onQuickView(product)}
          >
            {product.fromApi && product.stock === 0 ? "Sold out" : "+ Add to Cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
