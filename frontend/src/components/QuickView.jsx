import { useEffect, useRef, useState } from "react";
import { money, SIZES, stockInfo } from "../lib/format";

export default function QuickView({ product, onClose, onAdd, onOpen, favorite, onFavorite }) {
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [onClose]);

  const stock = product.fromApi ? Number(product.stock) : 10;
  const info = stockInfo(product.fromApi ? product.stock : null);
  const max = Math.max(1, Math.min(10, stock));

  return (
    <div className="overlay centered" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="product-modal quickview" role="dialog" aria-modal="true" aria-labelledby="qv-title" tabIndex={-1} ref={dialogRef}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close quick view">
          ✕
        </button>
        <div className="modal-photo">
          <img src={product.image} alt={product.name} />
        </div>
        <div className="modal-content">
          <span className="eyebrow">
            {product.brand} · {product.category}
          </span>
          <h2 id="qv-title">{product.name}</h2>
          <div className="qv-price">
            <strong>{money(product.price)}</strong>
            {product.oldPrice > product.price && <del>{money(product.oldPrice)}</del>}
          </div>
          {product.fromApi && <p className={`stock-pill stock-${info.tone}`}>{info.label}</p>}
          <p className="muted">Color: {product.color}</p>
          <fieldset className="qv-sizes">
            <legend>Select EU size</legend>
            <div className="shoe-size-grid">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={size === s ? "active" : ""}
                  aria-pressed={size === s}
                  onClick={() => {
                    setSize(s);
                    setError("");
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="qv-row">
            <div className="quantity-control" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}>
                −
              </button>
              <span aria-live="polite">{qty}</span>
              <button type="button" aria-label="Increase quantity" disabled={qty >= max} onClick={() => setQty((q) => q + 1)}>
                +
              </button>
            </div>
            <button type="button" className={`favorite inline ${favorite ? "active" : ""}`} aria-pressed={favorite} onClick={() => onFavorite(product.id)}>
              {favorite ? "♥ Saved" : "♡ Save"}
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="primary wide"
            disabled={stock === 0}
            onClick={() => {
              if (size == null) return setError("Please select your size.");
              onAdd(product, { size, color: product.color, quantity: qty });
              onClose();
            }}
          >
            {stock === 0 ? "Sold out" : "Add to Cart"}
          </button>
          <button type="button" className="text-link" onClick={() => onOpen(product)}>
            View full details →
          </button>
        </div>
      </div>
    </div>
  );
}
