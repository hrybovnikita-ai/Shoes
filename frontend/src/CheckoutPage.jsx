import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { shoesAPI } from "./api";
import { useAuth } from "./auth/AuthContext";
import ProductImage from "./components/ProductImage";
import { useToast } from "./components/Toast";
import useDocumentMeta from "./hooks/useDocumentMeta";
import { cents } from "./lib/format";
import { calculateTotals, isValidPromoCode, normalizePromoCode, toCents } from "./lib/pricing";
import { getSavedPromo, savePromo } from "./lib/promo";
import { KEYS } from "./lib/storage";
import { validateCheckout } from "./lib/validation";
import "./CheckoutPage.css";
import "./commerce/commerce.css";

const COUNTRIES = [
  ["UA", "Ukraine"], ["US", "United States"], ["GB", "United Kingdom"], ["DE", "Germany"], ["FR", "France"],
  ["PL", "Poland"], ["IT", "Italy"], ["ES", "Spain"], ["NL", "Netherlands"], ["CA", "Canada"],
  ["AU", "Australia"], ["CZ", "Czechia"], ["SE", "Sweden"], ["AT", "Austria"], ["IE", "Ireland"],
];

const EMPTY_FORM = { name: "", email: "", phone: "", street: "", apartment: "", city: "", country: "", postalCode: "" };

function readBuyNow() {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEYS.buyNow) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function Field({ label, name, error, children, hint }) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && !error && <small className="muted">{hint}</small>}
      {error && (
        <small className="field-error" id={`${name}-error`} role="alert">
          {error}
        </small>
      )}
    </label>
  );
}

export default function CheckoutPage({ cart = [], config }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();
  const { user, ready, getToken } = useAuth();
  const params = new URLSearchParams(location.search);
  const buyNow = params.get("mode") === "buy-now";
  const cancelledOrder = params.get("cancelled");

  useDocumentMeta({ title: "Checkout", noindex: true });

  const [items] = useState(() => (buyNow ? readBuyNow() : cart).filter((i) => i && i.id != null));
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [promoInput, setPromoInput] = useState(getSavedPromo);
  const [promoCode, setPromoCode] = useState(getSavedPromo);
  const [promoMessage, setPromoMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("demo");
  const [quote, setQuote] = useState({ loading: true, data: null, error: "" });
  const [placing, setPlacing] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverFields, setServerFields] = useState({});

  const stripeAvailable = Boolean(config?.features?.stripeCheckout);
  const [cancelState, setCancelState] = useState("");

  // Returning from Stripe's "cancel" link: release the pending order (and
  // its reserved stock) using the receipt token saved for that order.
  useEffect(() => {
    if (!cancelledOrder) return;
    let saved;
    try {
      saved = JSON.parse(sessionStorage.getItem("shoes-last-order") || "null");
    } catch {
      saved = null;
    }
    const receiptToken = sessionStorage.getItem("shoes-receipt-token");
    if (saved?.id !== cancelledOrder || !receiptToken) return;
    shoesAPI
      .cancelOrder(cancelledOrder, { receiptToken })
      .then(() => setCancelState("released"))
      .catch((err) => setCancelState(err.status === 409 ? "done" : "failed"));
  }, [cancelledOrder]);

  // Prefill from the signed-in account (render-time sync, no effect).
  const [prefilledFor, setPrefilledFor] = useState(null);
  if (user && prefilledFor !== user.uid) {
    setPrefilledFor(user.uid);
    setForm((f) => ({ ...f, name: f.name || user.displayName || "", email: user.email || f.email }));
  }

  const lines = useMemo(
    () =>
      items.map((i) => ({
        id: Number(i.id),
        size: Number(i.size),
        color: i.color || undefined,
        quantity: Number(i.quantity) || 1,
        ...(i.designId ? { designId: i.designId } : {}),
      })),
    [items]
  );

  // Server quote: the backend re-prices from database prices.
  useEffect(() => {
    if (!lines.length) return undefined;
    const controller = new AbortController();
    shoesAPI
      .quote(lines, promoCode, { signal: controller.signal })
      .then((data) => setQuote({ loading: false, data, error: "" }))
      .catch((err) => {
        if (err?.name !== "AbortError") setQuote({ loading: false, data: null, error: err.message });
      });
    return () => controller.abort();
  }, [lines, promoCode]);

  const local = calculateTotals(items.map((i) => ({ unitPriceCents: toCents(i.price), quantity: Number(i.quantity) || 1 })), promoCode);
  const totals = quote.data?.totals || local;
  const priceChanged = quote.data && quote.data.totals.totalCents !== local.totalCents;

  const errors = { ...validateCheckout(form), ...serverFields };
  const show = (k) => (submitted || touched[k]) && errors[k];

  const update = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setServerFields((s) => ({ ...s, [name]: undefined }));
    setServerError("");
  };
  const blur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));
  const inputProps = (name, extra = {}) => ({
    name,
    id: `checkout-${name}`,
    value: form[name],
    onChange: update,
    onBlur: blur,
    "aria-invalid": Boolean(show(name)),
    "aria-describedby": show(name) ? `${name}-error` : undefined,
    ...extra,
  });

  function applyPromo() {
    const code = normalizePromoCode(promoInput);
    if (!code) {
      setPromoCode("");
      savePromo("");
      setPromoMessage("Promo code removed.");
    } else if (isValidPromoCode(code)) {
      setPromoCode(code);
      savePromo(code);
      setPromoMessage(`${code} applied.`);
    } else {
      setPromoMessage("Invalid promo code.");
    }
  }

  const [hold,setHold] = useState(null);
  const [reserving,setReserving] = useState(false);
  const [now,setNow] = useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const held = hold && hold.signature === JSON.stringify(lines) && new Date(hold.expiresAt).getTime()>now;
  async function reserveSizes(token) {
    if (held) return hold;
    const key=crypto.randomUUID();
    const result=await shoesAPI.reserve(key,lines,token);
    const next={...result.reservation,signature:JSON.stringify(lines)};
    setHold(next);
    return next;
  }
  async function requestHold() {
    setReserving(true);setServerError('');
    try { await reserveSizes(user?await getToken():null); }
    catch(e){setServerError(e.message);}
    finally{setReserving(false);}
  }
  async function placeOrder(e) {
    e.preventDefault();
    if (placing || !ready) return;
    setSubmitted(true);
    setServerError("");
    if (Object.keys(validateCheckout(form)).length) {
      document.querySelector(".field.has-error input, .field.has-error select")?.focus();
      return;
    }
    setPlacing(true);
    try {
      const token = user ? await getToken() : null;
      const reservation = await reserveSizes(token);
      const result = await shoesAPI.createOrder(
        {
          customer: {
            name: form.name.trim(),
            email: (user?.email || form.email).trim(),
            phone: form.phone.trim(),
            shippingAddress: {
              street: form.street.trim(),
              apartment: form.apartment.trim() || undefined,
              city: form.city.trim(),
              country: form.country,
              postalCode: form.postalCode.trim(),
            },
          },
          items: lines,
          promoCode,
          paymentMethod,
          reservationKey: reservation.id,
        },
        token
      );
      if (!result?.order || !result?.receiptToken) throw new Error("The server returned an invalid order response.");
      sessionStorage.setItem("shoes-last-order", JSON.stringify(result.order));
      sessionStorage.setItem("shoes-receipt-token", result.receiptToken);
      if (buyNow) sessionStorage.removeItem(KEYS.buyNow);
      savePromo("");

      if (result.checkoutUrl) {
        // Stripe-hosted payment page (test mode). Card data never touches SHOES.
        window.location.assign(result.checkoutUrl);
        return;
      }
      navigate("/success", { replace: true, state: { order: result.order, receiptToken: result.receiptToken, clearCart: !buyNow } });
    } catch (err) {
      if (err.data?.fields) setServerFields(err.data.fields);
      setServerError(err.message || "Unable to place your order.");
      notify(err.message || "Unable to place your order.", { type: "error" });
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="checkout-page" id="main-content">
        <div className="checkout-empty empty-state">
          <div className="empty-icon" aria-hidden="true">
            🛒
          </div>
          <h1>Your Cart Is Empty</h1>
          {cancelledOrder && <p className="notice">Payment was cancelled. No money was taken.</p>}
          <p>Select your favorite sneakers to continue.</p>
          <button type="button" onClick={() => navigate("/shop")}>
            Back to Shop →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page" id="main-content">
      <section className="commerce-panel" aria-label="Stock reservation">
        <h2>Secure your sizes</h2>
        <p role="status">{held ? `Your sizes are reserved for ${Math.max(0,Math.ceil((new Date(hold.expiresAt)-now)/60000))} more minutes.` : 'Reserve your selected sizes for 10 minutes while you complete checkout.'}</p>
        <button type="button" disabled={held || reserving || placing} onClick={requestHold}>{reserving?'Reserving…':held?'Sizes reserved':'Reserve my sizes'}</button>
      </section>
      <div className="checkout-container">
        <button type="button" className="checkout-back" onClick={() => navigate(-1)} disabled={placing}>
          ← Back
        </button>

        <div className="checkout-heading">
          <span>SHOES / CHECKOUT</span>
          <h1>Checkout</h1>
          <p>{stripeAvailable ? "Pay with Stripe test mode, or place a demo order." : "Demo checkout — no real money will be charged."}</p>
        </div>

        {cancelledOrder && (
          <div className="checkout-demo-notice warn" role="status">
            Your Stripe payment was cancelled and no money was taken.
            {cancelState === "released" && " The pending order was released; you can try again below."}
            {cancelState === "failed" && " The pending order will expire automatically within an hour."}
          </div>
        )}
        {ready && user && (
          <div className="checkout-demo-notice">
            Signed in as <strong>{user.email}</strong>. This order will appear in <strong>My Orders</strong>.
          </div>
        )}
        {ready && !user && (
          <div className="checkout-demo-notice">
            Guest checkout. <a href="/login" onClick={(e) => { e.preventDefault(); navigate("/login", { state: { from: { pathname: "/checkout" } } }); }}>Sign in</a> to see this order in My Orders.
          </div>
        )}

        <div className="checkout-layout">
          <form id="checkout-form" className="checkout-form" onSubmit={placeOrder} noValidate>
            <section className="checkout-panel">
              <h2>01. Contact Information</h2>
              <Field label="Full Name" name="name" error={show("name")}>
                <input {...inputProps("name", { autoComplete: "name", maxLength: 120, required: true })} />
              </Field>
              <Field label="Email Address" name="email" error={show("email")} hint={user?.email ? "Linked to your account" : undefined}>
                <input {...inputProps("email", { type: "email", autoComplete: "email", maxLength: 254, readOnly: Boolean(user?.email), required: true })} />
              </Field>
              <Field label="Phone Number" name="phone" error={show("phone")}>
                <input {...inputProps("phone", { type: "tel", autoComplete: "tel", maxLength: 20, placeholder: "+380 50 123 4567", required: true })} />
              </Field>
            </section>

            <section className="checkout-panel">
              <h2>02. Shipping Address</h2>
              <Field label="Street Address" name="street" error={show("street")}>
                <input {...inputProps("street", { autoComplete: "address-line1", maxLength: 200, required: true })} />
              </Field>
              <Field label="Apartment / Suite (optional)" name="apartment" error={show("apartment")}>
                <input {...inputProps("apartment", { autoComplete: "address-line2", maxLength: 100 })} />
              </Field>
              <div className="checkout-fields">
                <Field label="Country" name="country" error={show("country")}>
                  <select {...inputProps("country", { autoComplete: "country", required: true })}>
                    <option value="">Select country</option>
                    {COUNTRIES.map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="City" name="city" error={show("city")}>
                  <input {...inputProps("city", { autoComplete: "address-level2", maxLength: 100, required: true })} />
                </Field>
              </div>
              <Field label="Postal Code" name="postalCode" error={show("postalCode")}>
                <input {...inputProps("postalCode", { autoComplete: "postal-code", maxLength: 10, required: true })} />
              </Field>
            </section>

            <section className="checkout-panel">
              <h2>03. Delivery</h2>
              <p className="checkout-disclaimer">Standard delivery — free on orders of $150 or more (before discount), otherwise $10.</p>
            </section>

            <section className="checkout-panel">
              <h2>04. Payment Method</h2>
              <div className="payment-options" role="radiogroup" aria-label="Payment method">
                <label className={`payment-option ${paymentMethod === "demo" ? "selected" : ""}`}>
                  <input type="radio" name="payment" value="demo" checked={paymentMethod === "demo"} onChange={() => setPaymentMethod("demo")} />
                  <span>
                    <strong>Demo — no real payment</strong>
                    <small>Creates a demo order. Nothing is charged.</small>
                  </span>
                </label>
                <label className={`payment-option ${paymentMethod === "stripe" ? "selected" : ""} ${stripeAvailable ? "" : "disabled"}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="stripe"
                    disabled={!stripeAvailable}
                    checked={paymentMethod === "stripe"}
                    onChange={() => setPaymentMethod("stripe")}
                  />
                  <span>
                    <strong>Card &amp; wallets via Stripe (TEST MODE)</strong>
                    <small>
                      {stripeAvailable
                        ? "You'll pay on Stripe's secure page. Apple Pay / Google Pay appear there when your device supports them. Use test card 4242 4242 4242 4242."
                        : "Not configured on this server yet."}
                    </small>
                  </span>
                </label>
              </div>
              <p className="checkout-disclaimer">SHOES never sees or stores your card number or CVV.</p>
            </section>

            {serverError && (
              <p className="checkout-error" role="alert">
                {serverError}
              </p>
            )}

            <button type="submit" className="checkout-submit" disabled={placing || !ready || quote.loading}>
              {placing
                ? "Processing…"
                : paymentMethod === "stripe"
                  ? `Continue to Stripe (test) · ${cents(totals.totalCents)}`
                  : `Place Demo Order · ${cents(totals.totalCents)}`}
            </button>
          </form>

          <aside className="checkout-summary" aria-label="Order summary">
            <h2>Order Summary</h2>
            {items.map((item) => (
              <div className="checkout-item" key={`${item.id}-${item.size}-${item.color}`}>
                <ProductImage src={item.image} alt={item.name} width="70" height="70" />
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    EU {item.size}
                    {item.color ? ` · ${item.color}` : ""} · Qty {item.quantity || 1}
                  </small>
                </div>
                <span>{cents(toCents(item.price) * (Number(item.quantity) || 1))}</span>
              </div>
            ))}

            <div className="promo-section">
              <label htmlFor="checkout-promo">Promo code</label>
              <div className="promo-input">
                <input id="checkout-promo" value={promoInput} onChange={(e) => { setPromoInput(e.target.value); setPromoMessage(""); }} placeholder="SHOES10 or WELCOME15" autoComplete="off" />
                <button type="button" onClick={applyPromo}>
                  Apply
                </button>
              </div>
              {promoMessage && <p className="promo-message" role="status">{promoMessage}</p>}
            </div>

            <div className="checkout-totals">
              <div>
                <span>Items</span>
                <strong>{totals.itemCount}</strong>
              </div>
              <div>
                <span>Subtotal</span>
                <strong>{cents(totals.subtotalCents)}</strong>
              </div>
              <div>
                <span>Discount{totals.promoCode ? ` (${totals.promoCode})` : ""}</span>
                <strong>-{cents(totals.discountCents)}</strong>
              </div>
              <div>
                <span>Shipping</span>
                <strong>{totals.shippingCents === 0 ? "FREE" : cents(totals.shippingCents)}</strong>
              </div>
              <div className="checkout-grand-total">
                <span>Total</span>
                <strong data-testid="checkout-total">{cents(totals.totalCents)}</strong>
              </div>
            </div>

            <p className={`checkout-disclaimer ${quote.error ? "error" : ""}`} role="status">
              {quote.loading
                ? "Checking prices with the server…"
                : quote.error
                  ? `Could not verify prices: ${quote.error}`
                  : priceChanged
                    ? "Prices were updated by the server — the total above is what you'll pay."
                    : "✓ Prices and discount verified by the server."}
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
