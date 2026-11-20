import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { saveBlob, shoesAPI } from "./api";
import { useAuth } from "./auth/AuthContext";
import { LinesSkeleton } from "./components/Skeleton";
import useDocumentMeta from "./hooks/useDocumentMeta";
import { formatDate, money } from "./lib/format";
import "./CheckoutPage.css";

function readSession(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function readSavedOrder() {
  try {
    return JSON.parse(readSession("shoes-last-order") || "null");
  } catch {
    return null;
  }
}

const POLL_MS = 2000;
const POLL_LIMIT = 30; // ~60 seconds

function paymentLabel(order) {
  if (!order) return "";
  if (order.paymentProvider === "demo") return "Demo — no real payment";
  return (
    {
      paid: "Paid (Stripe test mode)",
      unpaid: "Awaiting payment confirmation",
      failed: "Payment failed",
      expired: "Payment expired",
    }[order.paymentStatus] || order.paymentStatus
  );
}

export default function SuccessPage({ onComplete }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, getToken } = useAuth();
  const params = new URLSearchParams(location.search);
  useDocumentMeta({ title: "Order confirmation", noindex: true });

  const [initial] = useState(() => {
    const saved = readSavedOrder();
    const id = location.state?.order?.id || params.get("order") || saved?.id || null;
    return {
      id,
      order: location.state?.order || (saved?.id === id ? saved : null),
      token: location.state?.receiptToken || readSession("shoes-receipt-token"),
      clearCart: location.state?.clearCart !== false,
      fromStripe: Boolean(params.get("session_id")),
    };
  });

  const [order, setOrder] = useState(initial.order);
  const [loading, setLoading] = useState(Boolean(initial.id && initial.token));
  const [error, setError] = useState(initial.id && initial.token ? "" : "");
  const [polls, setPolls] = useState(0);
  const [busy, setBusy] = useState("");
  const cleared = useRef(false);

  const fetchOrder = useCallback(async () => {
    const token = user ? await getToken() : null;
    const r = await shoesAPI.getReceipt(initial.id, initial.token, token);
    return r.receipt;
  }, [initial.id, initial.token, user, getToken]);

  // Verify the order with the server; for Stripe, poll until the webhook
  // has updated it. Only the server decides whether an order is paid.
  useEffect(() => {
    if (!initial.id || !initial.token) return undefined;
    let cancelled = false;
    let timer;
    let count = 0;
    const tick = async () => {
      try {
        const receipt = await fetchOrder();
        if (cancelled) return;
        setOrder(receipt);
        setError("");
        setLoading(false);
        count += 1;
        setPolls(count);
        if (receipt.paymentProvider === "stripe" && receipt.paymentStatus === "unpaid" && count < POLL_LIMIT) {
          timer = setTimeout(tick, POLL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Could not verify the order with the server.");
        setLoading(false);
      }
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [initial.id, initial.token, fetchOrder]);

  // Empty the cart once the order is confirmed (demo) or paid (Stripe).
  useEffect(() => {
    if (cleared.current || !order || !initial.clearCart) return;
    const done = order.paymentProvider === "demo" ? order.status === "DEMO_CONFIRMED" : order.paymentStatus === "paid";
    if (done) {
      cleared.current = true;
      onComplete?.();
    }
  }, [order, initial.clearCart, onComplete]);

  async function downloadPDF() {
    setBusy("pdf");
    try {
      const token = user ? await getToken() : null;
      const blob = await shoesAPI.downloadReceipt(order.id, { receiptToken: initial.token, token });
      saveBlob(blob, `SHOES-${order.id}.pdf`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function cancelOrder() {
    if (!window.confirm("Cancel this order? Reserved items will be released.")) return;
    setBusy("cancel");
    try {
      const token = user ? await getToken() : null;
      const r = await shoesAPI.cancelOrder(order.id, { receiptToken: initial.token, token });
      setOrder(r.order || { ...order, status: r.status, canCancel: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  if (!initial.id || !initial.token) {
    return (
      <main className="checkout-page" id="main-content">
        <div className="checkout-empty empty-state">
          <h1>No Receipt Found</h1>
          <p>Complete an order to view your receipt{user ? ", or open My Orders" : ""}.</p>
          <button type="button" onClick={() => navigate(user ? "/account#orders" : "/shop")}>
            {user ? "Go to My Orders →" : "Back to Shop →"}
          </button>
        </div>
      </main>
    );
  }

  const waiting = order?.paymentProvider === "stripe" && order?.paymentStatus === "unpaid";
  const paid = order?.paymentStatus === "paid";
  const cancelled = /CANCELLED|EXPIRED/.test(order?.status || "");

  return (
    <main className="checkout-page" id="main-content">
      <div className="checkout-container success-container">
        <div className="checkout-heading">
          <span>SHOES / ORDER</span>
          <h1>
            {cancelled ? "Order Cancelled" : waiting ? "Confirming Payment…" : paid ? "Payment Received" : "Order Confirmed"}
            <span className="accent">.</span>
          </h1>
          {order && <p>Order number <strong data-testid="order-number">{order.id}</strong></p>}
        </div>

        {loading && <LinesSkeleton lines={4} />}
        {error && (
          <p className="checkout-error" role="alert">
            {error}
          </p>
        )}

        {waiting && (
          <div className="checkout-demo-notice" role="status">
            <span className="spinner" aria-hidden="true" /> Waiting for Stripe to confirm your test payment… This page updates automatically.
            {polls >= POLL_LIMIT && " Still pending — refresh later or check My Orders."}
          </div>
        )}

        {order && !loading && (
          <section className="checkout-panel receipt" aria-label="Receipt">
            <div className="receipt-meta">
              <div>
                <span>Date</span>
                <strong>{formatDate(order.date)}</strong>
              </div>
              <div>
                <span>Order status</span>
                <strong>{String(order.status).replaceAll("_", " ")}</strong>
              </div>
              <div>
                <span>Payment</span>
                <strong data-testid="payment-status">{paymentLabel(order)}</strong>
              </div>
            </div>
            {order.items?.map((item, i) => (
              <div className="checkout-item" key={`${item.id}-${i}`}>
                {item.image && <img src={item.image} alt={item.name} width="64" height="64" loading="lazy" />}
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    EU {item.size}
                    {item.color ? ` · ${item.color}` : ""} · Qty {item.quantity}
                  </small>
                </div>
                <span>{money(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="checkout-totals">
              <div>
                <span>Subtotal</span>
                <strong>{money(order.subtotal)}</strong>
              </div>
              <div>
                <span>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</span>
                <strong>-{money(order.discount)}</strong>
              </div>
              <div>
                <span>Shipping</span>
                <strong>{Number(order.shipping) ? money(order.shipping) : "FREE"}</strong>
              </div>
              <div className="checkout-grand-total">
                <span>Total</span>
                <strong>{money(order.total)}</strong>
              </div>
            </div>
            <p className="checkout-disclaimer">{order.notice}</p>
            <div className="receipt-actions">
              <button type="button" className="checkout-submit" onClick={downloadPDF} disabled={busy === "pdf"}>
                {busy === "pdf" ? "Preparing PDF…" : "⬇ Download PDF Receipt"}
              </button>
              {order.canCancel && (
                <button type="button" className="checkout-back danger" onClick={cancelOrder} disabled={busy === "cancel"}>
                  {busy === "cancel" ? "Cancelling…" : "Cancel Order"}
                </button>
              )}
              {user && (
                <button type="button" className="checkout-back" onClick={() => navigate("/account#orders")}>
                  My Orders →
                </button>
              )}
              <button type="button" className="checkout-back" onClick={() => navigate("/shop")}>
                Continue Shopping
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
