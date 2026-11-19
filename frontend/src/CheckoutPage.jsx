
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { shoesAPI } from "./api";
import "./CheckoutPage.css";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get products from ProductPage or Cart
  const [items] = useState(() => {
    const state = location.state;

    const incoming = Array.isArray(state?.items)
      ? state.items
      : state?.product
        ? [state.product]
        : [];

    return incoming.filter(
      (item) => item && item.id != null
    );
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
    card: "",
    expiry: "",
    cvv: "",
  });

  // Calculate order summary
  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      Number(item.price || 0) *
        Number(item.quantity || 1),
    0
  );

  const shipping =
    subtotal === 0 || subtotal >= 150 ? 0 : 12;

  const total = subtotal + shipping;

  // Update form fields
  const update = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) setError("");
  };

  // Submit demo order to Backend
  const placeOrder = async (event) => {
    event.preventDefault();

    if (loading || items.length === 0) return;

    setLoading(true);
    setError("");

    try {
      const customer = {
        name: form.name.trim(),
        email: form.email.trim(),
      };

      // Backend calculates prices independently.
      // Never send payment card details.
      const orderItems = items.map((item) => ({
        id: Number(item.id),
        size: Number(item.size),
        quantity: Number(item.quantity || 1),
      }));

      const result = await shoesAPI.createOrder(
        customer,
        orderItems
      );

      if (
        !result.success ||
        !result.order ||
        !result.receiptToken
      ) {
        throw new Error(
          "The server returned an invalid order response."
        );
      }

      // Store only demo order and receipt token.
      // Card number, expiry and CVV are never stored.
      sessionStorage.setItem(
        "shoes-last-order",
        JSON.stringify(result.order)
      );

      sessionStorage.setItem(
        "shoes-receipt-token",
        result.receiptToken
      );

      // Clear sensitive form fields from React state.
      setForm((previous) => ({
        ...previous,
        card: "",
        expiry: "",
        cvv: "",
      }));

      navigate("/success", {
        replace: true,
        state: {
          order: result.order,
          receiptToken: result.receiptToken,
        },
      });
    } catch (err) {
      setError(
        err.message ||
          "Unable to process your demo order. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Empty checkout
  if (items.length === 0) {
    return (
      <main className="checkout-page">
        <div className="checkout-empty">
          <h1>Your Cart Is Empty</h1>

          <p>
            Select your favorite sneakers to continue.
          </p>

          <button
            type="button"
            onClick={() => navigate("/shop")}
          >
            Back to Shop →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="checkout-container">
        {/* Back button */}
        <button
          type="button"
          className="checkout-back"
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          ← Back
        </button>

        {/* Header */}
        <div className="checkout-heading">
          <span>SHOES / DEMO CHECKOUT</span>

          <h1>Checkout</h1>

          <p>
            Complete your demo order.
            No real money will be charged.
          </p>
        </div>

        <div className="checkout-layout">
          {/* Checkout form */}
          <form
            id="demo-checkout-form"
            className="checkout-form"
            onSubmit={placeOrder}
          >
            {/* Contact information */}
            <section className="checkout-panel">
              <h2>01. Contact Information</h2>

              <label>
                Full Name
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={update}
                  placeholder="John Smith"
                  autoComplete="name"
                  maxLength={150}
                  required
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={update}
                  placeholder="john@example.com"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </label>
            </section>

            {/* Shipping information */}
            <section className="checkout-panel">
              <h2>02. Shipping Address</h2>

              <label>
                Street Address
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={update}
                  placeholder="123 Main Street"
                  autoComplete="street-address"
                  required
                />
              </label>

              <div className="checkout-fields">
                <label>
                  City
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={update}
                    placeholder="New York"
                    autoComplete="address-level2"
                    required
                  />
                </label>

                <label>
                  Country
                  <input
                    type="text"
                    name="country"
                    value={form.country}
                    onChange={update}
                    placeholder="United States"
                    autoComplete="country-name"
                    required
                  />
                </label>
              </div>

              <label>
                Postal Code
                <input
                  type="text"
                  name="postalCode"
                  value={form.postalCode}
                  onChange={update}
                  placeholder="10001"
                  autoComplete="postal-code"
                  required
                />
              </label>
            </section>

            {/* Demo payment */}
            <section className="checkout-panel">
              <h2>03. Demo Payment</h2>

              <div className="checkout-demo-notice">
                DEMO MODE — No real payments are processed.
                Enter fictional test numbers only.
              </div>

              <label>
                Test Card Number
                <input
                  type="text"
                  name="card"
                  value={form.card}
                  onChange={update}
                  placeholder="1111 2222 3333 4444"
                  inputMode="numeric"
                  pattern="[0-9 ]{12,23}"
                  maxLength={23}
                  autoComplete="off"
                  required
                />
              </label>

              <div className="checkout-fields">
                <label>
                  Expiration Date
                  <input
                    type="text"
                    name="expiry"
                    value={form.expiry}
                    onChange={update}
                    placeholder="12/30"
                    pattern="(0[1-9]|1[0-2])/[0-9]{2}"
                    maxLength={5}
                    autoComplete="off"
                    required
                  />
                </label>

                <label>
                  Test CVV
                  <input
                    type="text"
                    name="cvv"
                    value={form.cvv}
                    onChange={update}
                    placeholder="123"
                    pattern="[0-9]{3,4}"
                    maxLength={4}
                    inputMode="numeric"
                    autoComplete="off"
                    required
                  />
                </label>
              </div>
            </section>

            {/* Error message */}
            {error && (
              <p
                role="alert"
                style={{
                  color: "#ff6666",
                  marginBottom: 16,
                }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              className="checkout-submit"
              type="submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading
                ? "Processing Demo Order..."
                : `Place Demo Order — ${money(total)} →`}
            </button>
          </form>

          {/* Order summary */}
          <aside className="checkout-summary">
            <h2>Order Summary</h2>

            {items.map((item, index) => (
              <div
                className="checkout-item"
                key={`${item.id}-${item.size}-${index}`}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                />

                <div>
                  <strong>{item.name}</strong>

                  <small>
                    Size: {item.size ?? "Not selected"}
                  </small>

                  <small>
                    Quantity: {item.quantity || 1}
                  </small>

                  <span>
                    {money(
                      Number(item.price || 0) *
                        Number(item.quantity || 1)
                    )}
                  </span>
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="checkout-totals">
              <div>
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>

              <div>
                <span>Shipping</span>
                <strong>
                  {shipping === 0
                    ? "FREE"
                    : money(shipping)}
                </strong>
              </div>

              <div className="checkout-grand-total">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
            </div>

            <p className="checkout-disclaimer">
              This is a demonstration storefront.
              No real purchases, payments or deliveries occur.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
