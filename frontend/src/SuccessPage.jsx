import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { shoesAPI } from "./api";
import "./CheckoutPage.css";

const money = (value) => {
  const amount = Number(value);
  return `$${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
};

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

export default function SuccessPage({ onComplete }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [initialData] = useState(() => ({
    order: location.state?.order || readSavedOrder(),
    token:
      location.state?.receiptToken ||
      readSession("shoes-receipt-token"),
  }));

  const [order, setOrder] = useState(initialData.order);
  const [loading, setLoading] = useState(
    Boolean(initialData.order?.id && initialData.token)
  );
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const orderId = initialData.order?.id;
  const receiptToken = initialData.token;

  useEffect(() => {
    if (!orderId || !receiptToken) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchReceipt() {
      try {
        const result = await shoesAPI.getReceipt(
          orderId,
          receiptToken
        );

        if (cancelled) return;

        if (!result.success || !result.receipt) {
          throw new Error("Invalid receipt response.");
        }

        setOrder(result.receipt);
        setVerified(true);
        setError("");
      } catch (err) {
        if (cancelled) return;

        setVerified(false);
        setError(
          err.message ||
          "Could not verify the receipt with the server."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchReceipt();

    return () => {
      cancelled = true;
    };
  }, [orderId, receiptToken]);

  const downloadPDF = async () => {
    if (!order?.id || !receiptToken || !verified || downloading) {
      return;
    }

    setDownloading(true);
    setError("");

    try {
      const blob = await shoesAPI.downloadReceipt(
        order.id,
        receiptToken
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `SHOES-${order.id}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      setError(
        err.message || "Could not download PDF receipt."
      );
    } finally {
      setDownloading(false);
    }
  };

  const cancelDemoOrder = async () => {
    if (
      !order?.id ||
      !receiptToken ||
      !verified ||
      cancelling ||
      order.status === "DEMO_CANCELLED"
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this demo order?"
    );

    if (!confirmed) return;

    setCancelling(true);
    setError("");

    try {
      await shoesAPI.cancelOrder(
        order.id,
        receiptToken
      );

      setOrder((current) => ({
        ...current,
        status: "DEMO_CANCELLED",
      }));
    } catch (err) {
      setError(
        err.message || "Could not cancel demo order."
      );
    } finally {
      setCancelling(false);
    }
  };

  const continueShopping = () => {
    onComplete?.();

    try {
      sessionStorage.removeItem("shoes-last-order");
      sessionStorage.removeItem("shoes-receipt-token");
    } catch {
      // Session storage may be unavailable.
    }

    navigate("/shop", { replace: true });
  };

  if (!order) {
    return (
      <main className="checkout-page">
        <div className="checkout-empty">
          <h1>No Receipt Found</h1>
          <p>Complete a demo order to view your receipt.</p>

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

  const isCancelled = order.status === "DEMO_CANCELLED";

  return (
    <main className="checkout-page">
      <div className="checkout-container">
        <div
          style={{
            textAlign: "center",
            marginBottom: 35,
          }}
        >
          <h1
            style={{
              color: isCancelled ? "#ff7777" : "#b7ff35",
            }}
          >
            {isCancelled
              ? "Demo Order Cancelled"
              : verified
                ? "✓ Demo Order Confirmed"
                : "Demo Order Receipt"}
          </h1>

          <p>No real payment was processed.</p>

          {loading && (
            <p role="status">
              Verifying receipt with server...
            </p>
          )}

          {verified && (
            <p style={{ color: "#b7ff35" }}>
              ✓ Receipt verified by SHOES Backend
            </p>
          )}

          {!loading && !verified && (
            <p style={{ color: "#ff7777" }}>
              Receipt verification is unavailable.
            </p>
          )}

          {error && (
            <p
              role="alert"
              style={{
                color: "#ff7777",
                marginTop: 12,
              }}
            >
              {error}
            </p>
          )}
        </div>

        <section
          className="checkout-panel"
          style={{
            maxWidth: 650,
            margin: "auto",
          }}
        >
          <h2>SHOES. — Electronic Receipt</h2>

          <p>
            <strong>Order Number:</strong> {order.id}
          </p>

          <p>
            <strong>Date:</strong>{" "}
            {order.date
              ? new Date(order.date).toLocaleString()
              : "—"}
          </p>

          <p>
            <strong>Customer:</strong>{" "}
            {order.customer?.name || "—"}
          </p>

          <p>
            <strong>Email:</strong>{" "}
            {order.customer?.email || "—"}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            <span
              style={{
                color: isCancelled ? "#ff7777" : "#b7ff35",
              }}
            >
              {order.status || "UNKNOWN"}
            </span>
          </p>

          <hr />

          {(order.items || []).map((item, index) => (
            <div
              className="checkout-item"
              key={`${item.id}-${item.size}-${index}`}
            >
              {item.image && (
                <img
                  src={item.image}
                  alt={item.name || "Sneakers"}
                  loading="lazy"
                />
              )}

              <div>
                <strong>{item.name}</strong>

                <small>
                  Size: {item.size} | Quantity: {item.quantity}
                </small>
              </div>

              <strong>
                {money(
                  Number(item.price) *
                  Number(item.quantity)
                )}
              </strong>
            </div>
          ))}

          <div className="checkout-totals">
            <div>
              <span>Subtotal</span>
              <strong>{money(order.subtotal)}</strong>
            </div>

            <div>
              <span>Shipping</span>
              <strong>
                {Number(order.shipping) === 0
                  ? "FREE"
                  : money(order.shipping)}
              </strong>
            </div>

            <div className="checkout-grand-total">
              <span>Total (Demo)</span>
              <strong>{money(order.total)}</strong>
            </div>
          </div>

          <p
            style={{
              color: "#aaa",
              marginTop: 25,
              fontSize: 12,
            }}
          >
            DEMO RECEIPT — NOT PROOF OF PAYMENT
          </p>
        </section>

        <div
          style={{
            maxWidth: 650,
            margin: "25px auto",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            className="checkout-submit"
            type="button"
            onClick={downloadPDF}
            disabled={!verified || downloading}
          >
            {downloading
              ? "Downloading..."
              : "↓ Download PDF Receipt"}
          </button>

          <button
            className="checkout-submit"
            type="button"
            onClick={() => window.print()}
          >
            Print / Save Receipt
          </button>

          {!isCancelled && (
            <button
              className="checkout-submit"
              type="button"
              onClick={cancelDemoOrder}
              disabled={!verified || cancelling}
              style={{
                background: "#242424",
                color: "#ff7777",
              }}
            >
              {cancelling
                ? "Cancelling..."
                : "Cancel Demo Order"}
            </button>
          )}

          <button
            className="checkout-submit"
            type="button"
            onClick={continueShopping}
          >
            Continue Shopping →
          </button>
        </div>
      </div>
    </main>
  );
}
