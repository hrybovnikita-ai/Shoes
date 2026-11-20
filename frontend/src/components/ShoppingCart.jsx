import { useEffect, useRef, useState } from "react";
import { calculateTotals, FREE_SHIPPING_THRESHOLD_CENTS, isValidPromoCode, normalizePromoCode, toCents } from "../lib/pricing";
import { cents } from "../lib/format";
import { getSavedPromo, savePromo } from "../lib/promo";
import "./ShoppingCart.css";

export default function ShoppingCart({ isOpen, onClose, cart = [], onUpdate, onRemove, onCheckout }) {
  const [promoInput, setPromoInput] = useState(getSavedPromo);
  const [promoCode, setPromoCode] = useState(getSavedPromo);
  const [message, setMessage] = useState("");
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    panelRef.current?.focus();
    const handleEscape = (event) => event.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const applyPromo = () => {
    const code = normalizePromoCode(promoInput);
    if (code && isValidPromoCode(code)) {
      setPromoCode(code);
      savePromo(code);
      setMessage(`${code} applied.`);
    } else {
      setPromoCode("");
      savePromo("");
      setMessage(code ? "Invalid promo code." : "Enter a promo code.");
    }
  };

  const totals = calculateTotals(
    cart.map((i) => ({ unitPriceCents: toCents(i.price), quantity: Number(i.quantity) || 1 })),
    promoCode
  );
  const progress = Math.min(100, Math.round((totals.subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100));

  return (
    <>
      {isOpen && <div className="cart-overlay" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`shopping-cart ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-modal={isOpen}
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
        inert={!isOpen}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="cart-header">
          <div>
            <span className="cart-label">YOUR SELECTION</span>
            <h2>Shopping Cart ({totals.itemCount})</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close cart">
            ✕
          </button>
        </div>

        {cart.length > 0 && (
          <div className="shipping-progress" aria-live="polite">
            {totals.freeShippingRemainingCents > 0 ? (
              <span>
                Add <strong>{cents(totals.freeShippingRemainingCents)}</strong> more for free shipping
              </span>
            ) : (
              <span>
                <strong>You unlocked free shipping!</strong>
              </span>
            )}
            <div className="progress-track" aria-hidden="true">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="empty-icon" aria-hidden="true">
                🛒
              </div>
              <h3>Your cart is empty</h3>
              <p>Find your next favorite sneakers.</p>
              <button type="button" onClick={onClose}>
                Explore Collection
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const qty = Number(item.quantity) || 1;
              return (
                <div className="cart-product" key={`${item.id}-${item.size ?? ""}-${item.color ?? ""}`} data-testid="cart-line">
                  <img src={item.image} alt={item.name} loading="lazy" width="90" height="90" />
                  <div className="cart-product-info">
                    <h3>{item.name}</h3>
                    <p>
                      {item.brand}
                      {item.size != null ? ` · EU ${item.size}` : ""}
                      {item.color ? ` · ${item.color}` : ""}
                    </p>
                    <strong>{cents(toCents(item.price) * qty)}</strong>
                    <div className="cart-product-actions">
                      <div className="quantity-control">
                        <button type="button" aria-label={`Decrease quantity of ${item.name}`} onClick={() => onUpdate(item, qty - 1)}>
                          −
                        </button>
                        <span aria-label="Quantity">{qty}</span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${item.name}`}
                          disabled={qty >= 10}
                          onClick={() => onUpdate(item, qty + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button type="button" className="remove-product" onClick={() => onRemove(item)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="cart-bottom">
          <div className="promo-section">
            <label htmlFor="promo-code">PROMO CODE</label>
            <div className="promo-input">
              <input
                id="promo-code"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value);
                  setMessage("");
                }}
                onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                placeholder="SHOES10 or WELCOME15"
                autoComplete="off"
              />
              <button type="button" onClick={applyPromo}>
                Apply
              </button>
            </div>
            {message && (
              <p className={`promo-message ${promoCode ? "" : "error"}`} role="status">
                {message}
              </p>
            )}
          </div>

          <div className="cart-summary">
            <div>
              <span>Subtotal</span>
              <span>{cents(totals.subtotalCents)}</span>
            </div>
            <div>
              <span>Discount{totals.promoCode ? ` (${totals.promoCode})` : ""}</span>
              <span>-{cents(totals.discountCents)}</span>
            </div>
            <div>
              <span>Shipping</span>
              <span>{totals.shippingCents === 0 ? "FREE" : cents(totals.shippingCents)}</span>
            </div>
            <div className="cart-total">
              <strong>Total</strong>
              <strong data-testid="cart-total">{cents(totals.totalCents)}</strong>
            </div>
          </div>

          <button type="button" className="checkout-button" disabled={cart.length === 0} onClick={onCheckout}>
            Proceed to Checkout →
          </button>
          <p className="secure-checkout">Prices are re-checked by the server at checkout · USD</p>
        </div>
      </aside>
    </>
  );
}
