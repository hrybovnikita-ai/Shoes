
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "./firebase";
import { shoesAPI } from "./api";
import "./CheckoutPage.css";

const PROMO_CODES = {
  SHOES10: 0.1,
  WELCOME15: 0.15,
};

const SHIPPING_FEE = 10;
const FREE_SHIPPING_THRESHOLD = 150;

const money = (value) =>
  `$${(Number(value) || 0).toFixed(2)}`;

const validQuantity = (value) =>
  Number.isInteger(Number(value)) &&
  Number(value) >= 1 &&
  Number(value) <= 10;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

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
    phone: "",
    address: "",
    apartment: "",
    city: "",
    country: "",
    postalCode: "",
  });

  const [deliveryMethod, setDeliveryMethod] =
    useState("standard");

  const promoCode = String(
    location.state?.promoCode || ""
  ).toUpperCase();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user);

        if (user) {
          setForm((previous) => ({
            ...previous,
            name:
              previous.name ||
              user.displayName ||
              "",
            email:
              user.email ||
              previous.email,
          }));
        }

        setAuthReady(true);
      },
      (authError) => {
        console.error(
          "Firebase authentication error:",
          authError
        );

        setCurrentUser(null);
        setAuthReady(true);
      }
    );

    return () => unsubscribe();
  }, []);

  const summary = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum +
        (Number(item.price) || 0) *
          (Number(item.quantity) || 1),
      0
    );

    const discountRate =
      PROMO_CODES[promoCode] || 0;

    const discount =
      subtotal * discountRate;

    const shipping =
      subtotal === 0 ||
      subtotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : SHIPPING_FEE;

    const total = Math.max(
      0,
      subtotal - discount + shipping
    );

    const itemCount = items.reduce(
      (sum, item) =>
        sum + (Number(item.quantity) || 1),
      0
    );

    return {
      subtotal,
      discount,
      shipping,
      total,
      itemCount,
    };
  }, [items, promoCode]);

  const update = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) setError("");
  };

  const validateOrder = () => {
    if (!items.length) {
      throw new Error(
        "Your shopping cart is empty."
      );
    }

    for (const item of items) {
      if (
        !Number.isInteger(Number(item.id)) ||
        !Number.isInteger(Number(item.size)) ||
        !validQuantity(item.quantity || 1)
      ) {
        throw new Error(
          "Please select valid products, sizes and quantities."
        );
      }

      if (!item.color) {
        throw new Error(
          "Please select a color for every product."
        );
      }
    }

    if (
      !form.name.trim() ||
      !(currentUser?.email || form.email.trim())
    ) {
      throw new Error(
        "Please enter your name and email."
      );
    }

    if (
      !form.address.trim() ||
      !form.city.trim() ||
      !form.country.trim() ||
      !form.postalCode.trim()
    ) {
      throw new Error(
        "Please complete your shipping address."
      );
    }
  };

  const placeOrder = async (event) => {
    event.preventDefault();

    if (loading || !authReady) return;

    setLoading(true);
    setError("");

    try {
      validateOrder();

      const user = auth.currentUser;

      const customer = {
        name: form.name.trim(),
        email:
          user?.email ||
          form.email.trim(),
        phone: form.phone.trim(),
        shippingAddress: {
          street: form.address.trim(),
          apartment: form.apartment.trim(),
          city: form.city.trim(),
          country: form.country.trim(),
          postalCode: form.postalCode.trim(),
        },
        deliveryMethod,
        promoCode,
      };

      const orderItems = items.map((item) => ({
        id: Number(item.id),
        size: Number(item.size),
        color: item.color,
        quantity: Number(item.quantity || 1),
      }));

      const firebaseToken = user
        ? await user.getIdToken()
        : null;

      // Backend must independently validate
      // products, stock, promo codes and totals.
      // No payment information is transmitted.
      const result = await shoesAPI.createOrder(
        customer,
        orderItems,
        firebaseToken
      );

      if (
        !result?.success ||
        !result?.order ||
        !result?.receiptToken
      ) {
        throw new Error(
          result?.message ||
          "The server returned an invalid order response."
        );
      }

      sessionStorage.setItem(
        "shoes-last-order",
        JSON.stringify(result.order)
      );

      sessionStorage.setItem(
        "shoes-receipt-token",
        result.receiptToken
      );

      navigate("/success", {
        replace: true,
        state: {
          order: result.order,
          receiptToken: result.receiptToken,
        },
      });
    } catch (err) {
      console.error(
        "SHOES Checkout Error:",
        err
      );

      setError(
        err?.message ||
        "Unable to process your demo order."
      );
    } finally {
      setLoading(false);
    }
  };

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
        <button
          type="button"
          className="checkout-back"
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          ← Back
        </button>

        <div className="checkout-heading">
          <span>SHOES / DEMO CHECKOUT</span>
          <h1>Checkout</h1>
          <p>
            Complete your demo order.
            No real money will be charged.
          </p>
        </div>

        {authReady && currentUser && (
          <div className="checkout-demo-notice">
            Signed in as{" "}
            <strong>
              {currentUser.email}
            </strong>
            . Your order can be linked
            to your account.
          </div>
        )}

        {authReady && !currentUser && (
          <div className="checkout-demo-notice">
            Guest Checkout — You can place
            a demo order without signing in.
            Guest orders will not appear
            in My Orders.
          </div>
        )}

        <div className="checkout-layout">
          <form
            id="demo-checkout-form"
            className="checkout-form"
            onSubmit={placeOrder}
          >
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
                  readOnly={Boolean(currentUser?.email)}
                  required
                />
              </label>

              <label>
                Phone Number
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={update}
                  placeholder="+1 555 123 4567"
                  autoComplete="tel"
                  maxLength={30}
                />
              </label>
            </section>

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

              <label>
                Apartment / Suite
                <input
                  type="text"
                  name="apartment"
                  value={form.apartment}
                  onChange={update}
                  placeholder="Apartment 12"
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

            <section className="checkout-panel">
              <h2>03. Delivery Method</h2>

              <label>
                <input
                  type="radio"
                  name="delivery"
                  value="standard"
                  checked={deliveryMethod === "standard"}
                  onChange={() =>
                    setDeliveryMethod("standard")
                  }
                />
                Standard Delivery
              </label>

              <p className="checkout-disclaimer">
                Free shipping on orders of
                $150 or more. Otherwise $10.
              </p>
            </section>

            <section className="checkout-panel">
              <h2>04. Payment Method</h2>

              <div className="checkout-demo-notice">
                <strong>Demo Payment</strong>
                <p>
                  This is a demonstration
                  order. No real payments
                  will be processed.
                </p>
              </div>
            </section>

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

            <button
              className="checkout-submit"
              type="submit"
              disabled={loading || !authReady}
              aria-busy={loading}
            >
              {loading
                ? "Processing Demo Order..."
                : !authReady
                  ? "Loading Account..."
                  : `Place Demo Order — ${money(summary.total)} →`}
            </button>
          </form>

          <aside className="checkout-summary">
            <h2>Order Summary</h2>

            {items.map((item, index) => (
              <div
                className="checkout-item"
                key={`${item.id}-${item.size}-${item.color}-${index}`}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                />

                <div>
                  <strong>{item.name}</strong>

                  <small>
                    Size: EU {item.size}
                  </small>

                  <small>
                    Color: {item.color || "Default"}
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

            <div className="checkout-totals">
              <div>
                <span>Items</span>
                <strong>{summary.itemCount}</strong>
              </div>

              <div>
                <span>Subtotal</span>
                <strong>
                  {money(summary.subtotal)}
                </strong>
              </div>

              {summary.discount > 0 && (
                <div>
                  <span>
                    Discount ({promoCode})
                  </span>
                  <strong>
                    -{money(summary.discount)}
                  </strong>
                </div>
              )}

              <div>
                <span>Shipping</span>
                <strong>
                  {summary.shipping === 0
                    ? "FREE"
                    : money(summary.shipping)}
                </strong>
              </div>

              <div className="checkout-grand-total">
                <span>Total</span>
                <strong>
                  {money(summary.total)}
                </strong>
              </div>
            </div>

            <p className="checkout-disclaimer">
              This is a demonstration
              storefront. No real purchases,
              payments or deliveries occur.
            </p>

            <p className="checkout-disclaimer">
              Final order amounts are
              calculated and validated
              by the backend.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
