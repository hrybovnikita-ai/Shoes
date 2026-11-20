
import { useEffect, useState } from "react";
import "./ShoppingCart.css";

const PROMO_CODES = {
  SHOES10: 0.1,
  WELCOME15: 0.15,
};

const money = (value) =>
  `$${(Number(value) || 0).toFixed(2)}`;

const sameVariant = (a, b) =>
  String(a.id) === String(b.id) &&
  String(a.size ?? "") === String(b.size ?? "") &&
  String(a.color ?? "") === String(b.color ?? "");

export default function ShoppingCart({
  isOpen,
  onClose,
  cart = [],
  setCart,
  onCheckout,
}) {
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleEscape);

    return () =>
      window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const updateQuantity = (target, change) => {
    setCart((previous) =>
      previous
        .map((item) => {
          if (!sameVariant(item, target)) return item;

          return {
            ...item,
            quantity: Math.max(
              0,
              (Number(item.quantity) || 1) + change
            ),
          };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (target) => {
    setCart((previous) =>
      previous.filter((item) => !sameVariant(item, target))
    );
  };

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();

    if (Object.hasOwn(PROMO_CODES, code)) {
      setPromoCode(code);
      setMessage(`${code} applied successfully!`);
    } else {
      setPromoCode("");
      setMessage("Invalid promo code.");
    }
  };

  const subtotal = cart.reduce(
    (sum, item) =>
      sum +
      (Number(item.price) || 0) *
        (Number(item.quantity) || 1),
    0
  );

  const discountRate = PROMO_CODES[promoCode] || 0;
  const discount = subtotal * discountRate;
  const shipping =
    subtotal === 0 || subtotal >= 150 ? 0 : 10;
  const total = Math.max(
    0,
    subtotal - discount + shipping
  );

  const itemCount = cart.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1),
    0
  );

  const handleCheckout = () => {
    if (!cart.length) return;

    onCheckout?.({
      items: cart.map((item) => ({ ...item })),
      subtotal,
      discount,
      shipping,
      total,
      promoCode,
    });
  };

  return (
    <>
      {isOpen && (
        <div
          className="cart-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`shopping-cart ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-modal={isOpen}
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="cart-header">
          <div>
            <span className="cart-label">
              YOUR SELECTION
            </span>
            <h2>Shopping Cart ({itemCount})</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="empty-icon">🛒</div>
              <h3>Your cart is empty</h3>
              <p>Find your next favorite sneakers.</p>
              <button type="button" onClick={onClose}>
                Explore Collection
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                className="cart-product"
                key={`${item.id}-${item.size ?? ""}-${item.color ?? ""}`}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                />

                <div className="cart-product-info">
                  <h3>{item.name}</h3>

                  <p>
                    {item.brand}
                    {item.size != null
                      ? ` · EU ${item.size}`
                      : ""}
                    {item.color
                      ? ` · ${item.color}`
                      : ""}
                  </p>

                  <strong>
                    {money(
                      Number(item.price) *
                      (Number(item.quantity) || 1)
                    )}
                  </strong>

                  <div className="cart-product-actions">
                    <div className="quantity-control">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() =>
                          updateQuantity(item, -1)
                        }
                      >
                        −
                      </button>

                      <span>{item.quantity || 1}</span>

                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          updateQuantity(item, 1)
                        }
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="remove-product"
                      onClick={() => removeItem(item)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-bottom">
          <div className="promo-section">
            <label htmlFor="promo-code">
              PROMO CODE
            </label>

            <div className="promo-input">
              <input
                id="promo-code"
                value={promoInput}
                onChange={(event) => {
                  setPromoInput(event.target.value);
                  setMessage("");
                }}
                placeholder="Enter promo code"
              />

              <button
                type="button"
                onClick={applyPromo}
              >
                Apply
              </button>
            </div>

            {message && (
              <p className="promo-message" role="status">
                {message}
              </p>
            )}
          </div>

          <div className="cart-summary">
            <div>
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>

            <div>
              <span>Discount</span>
              <span>-{money(discount)}</span>
            </div>

            <div>
              <span>Shipping</span>
              <span>
                {shipping === 0
                  ? "FREE"
                  : money(shipping)}
              </span>
            </div>

            <div className="cart-total">
              <strong>Total</strong>
              <strong>{money(total)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="checkout-button"
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            Proceed to Checkout →
          </button>

          <p className="secure-checkout">
            Demo checkout · No real payments · USD
          </p>
        </div>
      </aside>
    </>
  );
}
