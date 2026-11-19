import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { shoesAPI } from "./api";
import "./CheckoutPage.css";

const money = (value) =>
  `$${Number(value || 0).toFixed(2)}`;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ==========================================
  // FIREBASE AUTHENTICATION
  // ==========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user);
        setAuthReady(true);

        if (user) {
          setForm((previous) => ({
            ...previous,
            name:
              previous.name ||
              user.displayName ||
              "",
            email: user.email || previous.email,
          }));
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // ==========================================
  // CHECKOUT PRODUCTS
  // ==========================================

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

  // ==========================================
  // CHECKOUT FORM
  // ==========================================

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

  // ==========================================
  // ORDER SUMMARY
  // ==========================================

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

  // ==========================================
  // UPDATE FORM
  // ==========================================

  const update = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  // ==========================================
  // PLACE DEMO ORDER
  // ==========================================

  const placeOrder = async (event) => {
    event.preventDefault();

    if (
      loading ||
      !authReady ||
      items.length === 0
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const user = auth.currentUser;

      const customer = {
        name: form.name.trim(),
        email: user?.email || form.email.trim(),
      };

      if (!customer.name || !customer.email) {
        throw new Error(
          "Please enter your name and email."
        );
      }

      // Validate order items.
      const orderItems = items.map((item) => ({
        id: Number(item.id),
        size: Number(item.size),
        quantity: Number(item.quantity || 1),
      }));

      if (
        orderItems.some(
          (item) =>
            !Number.isInteger(item.id) ||
            !Number.isInteger(item.size) ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1
        )
      ) {
        throw new Error(
          "Please select valid products and sizes."
        );
      }

      // ======================================
      // FIREBASE ID TOKEN
      // ======================================

      const firebaseToken = user
        ? await user.getIdToken()
        : null;

      // ======================================
      // BACKEND REQUEST
      // ======================================

      // Payment card details are NOT sent.
      // The backend calculates prices itself.
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

      // ======================================
      // SAVE DEMO RECEIPT
      // ======================================

      sessionStorage.setItem(
        "shoes-last-order",
        JSON.stringify(result.order)
      );

      sessionStorage.setItem(
        "shoes-receipt-token",
        result.receiptToken
      );

      // Clear sensitive fields.
      setForm((previous) => ({
        ...previous,
        card: "",
        expiry: "",
        cvv: "",
      }));

      // ======================================
      // SUCCESS PAGE
      // ======================================

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
          "Unable to process your demo order. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // EMPTY CHECKOUT
  // ==========================================

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

  // ==========================================
  // CHECKOUT PAGE
  // ==========================================

  return (
    <main className="checkout-page">
      <div className="checkout-container">
        {/* BACK BUTTON */}

        <button
          type="button"
          className="checkout-back"
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          ← Back
        </button>

        {/* HEADER */}

        <div className="checkout-heading">
          <span>SHOES / DEMO CHECKOUT</span>

          <h1>Checkout</h1>

          <p>
            Complete your demo order.
            No real money will be charged.
          </p>
        </div>

        {/* AUTHENTICATION STATUS */}

        {authReady && currentUser && (
          <div
            className="checkout-demo-notice"
            style={{ marginBottom: 20 }}
          >
            Signed in as{" "}
            <strong>{currentUser.email}</strong>.
            Your order can be linked to your account.
          </div>
        )}

        {authReady && !currentUser && (
          <div
            className="checkout-demo-notice"
            style={{ marginBottom: 20 }}
          >
            Guest Checkout — You can place a demo
            order without signing in. Guest orders
            will not appear in My Orders.
          </div>
        )}

        <div className="checkout-layout">
          {/* CHECKOUT FORM */}

          <form
            id="demo-checkout-form"
            className="checkout-form"
            onSubmit={placeOrder}
          >
            {/* CONTACT INFORMATION */}

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
            </section>

            {/* SHIPPING ADDRESS */}

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

            {/* DEMO PAYMENT */}

            <section className="checkout-panel">
              <h2>03. Demo Payment</h2>

              <div className="checkout-demo-notice">
                DEMO MODE — No real payments are
                processed. Enter fictional test
                numbers only.
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

            {/* ERROR MESSAGE */}

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

            {/* SUBMIT ORDER */}

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
                  : `Place Demo Order — ${money(total)} →`}
            </button>
          </form>

          {/* ORDER SUMMARY */}

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
                    Size:{" "}
                    {item.size ?? "Not selected"}
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

            {/* TOTALS */}

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
              No real purchases, payments or
              deliveries occur.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
