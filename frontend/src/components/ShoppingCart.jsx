import { useEffect, useState } from "react";
import "./ShoppingCart.css";

const PROMO_CODES = {
  SHOES10: 0.1,
  WELCOME15: 0.15,
};

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
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const updateQuantity = (id, size, change) => {
    setCart((previous) =>
      previous
        .map((item) =>
          item.id === id && item.size === size
            ? {
                ...item,
                quantity: Math.max(
                  0,
                  (item.quantity || 1) + change
                ),
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id, size) => {
    setCart((previous) =>
      previous.filter(
        (item) => !(item.id === id && item.size === size)
      )
    );
  };

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();

    if (PROMO_CODES[code]) {
      setPromoCode(code);
      setMessage("Promo code applied!");
    } else {
      setPromoCode("");
      setMessage("Invalid promo code.");
    }
  };

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + Number(item.price) * (item.quantity || 1),
    0
  );

  const discountRate = PROMO_CODES[promoCode] || 0;
  const discount = subtotal * discountRate;
  const shipping = subtotal === 0 || subtotal >= 150 ? 0 : 10;
  const total = Math.max(0, subtotal - discount + shipping);

  const formatPrice = (price) => `$${price.toFixed(2)}`;

  return (
    <>
      {isOpen && (
        <div className="cart-overlay" onClick={onClose} />
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
            <span className="cart-label">YOUR SELECTION</span>
            <h2>Shopping Cart</h2>
          </div>

          <button onClick={onClose} aria-label="Close cart">
            ✕
          </button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="empty-icon">🛒</div>
              <h3>Your cart is empty</h3>
              <p>Find your next favorite sneakers.</p>
              <button onClick={onClose}>Explore Collection</button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                className="cart-product"
                key={`${item.id}-${item.size ?? "default"}`}
              >
                <img src={item.image} alt={item.name} />

                <div className="cart-product-info">
                  <h3>{item.name}</h3>
                  <p>
                    {item.brand}
                    {item.size ? ` · EU ${item.size}` : ""}
                  </p>

                  <strong>
                    {formatPrice(Number(item.price))}
                  </strong>

                  <div className="cart-product-actions">
                    <div className="quantity-control">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.size, -1)
                        }
                      >
                        −
                      </button>
                      <span>{item.quantity || 1}</span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.size, 1)
                        }
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="remove-product"
                      onClick={() =>
                        removeItem(item.id, item.size)
                      }
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
            <label htmlFor="promo-code">PROMO CODE</label>

            <div className="promo-input">
              <input
                id="promo-code"
                value={promoInput}
                onChange={(event) =>
                  setPromoInput(event.target.value)
                }
                placeholder="Enter promo code"
              />
              <button onClick={applyPromo}>Apply</button>
            </div>

            {message && <p className="promo-message">{message}</p>}
          </div>

          <div className="cart-summary">
            <div>
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <div>
              <span>Discount</span>
              <span>-{formatPrice(discount)}</span>
            </div>

            <div>
              <span>Shipping</span>
              <span>
                {shipping === 0 ? "FREE" : formatPrice(shipping)}
              </span>
            </div>

            <div className="cart-total">
              <strong>Total</strong>
              <strong>{formatPrice(total)}</strong>
            </div>
          </div>

          <button
            className="checkout-button"
            disabled={cart.length === 0}
            onClick={() =>
              onCheckout?.({
                items: cart,
                subtotal,
                discount,
                shipping,
                total,
                promoCode,
              })
            }
          >
            Proceed to Checkout →
          </button>

          <p className="secure-checkout">
            Secure checkout · USD
          </p>
        </div>
      </aside>
    </>
  );
}
