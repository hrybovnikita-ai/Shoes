import { useState } from "react";
import { shoesAPI } from "../api";
import { useAuth } from "../auth/AuthContext";

const STATUSES = [
  "order_confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export default function AdminTrackingPanel({ orders, onUpdated }) {
  const { getToken } = useAuth();
  const [orderId, setOrderId] = useState(orders[0]?.id || "");
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [eta, setEta] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");
    try {
      const token = await getToken();
      await shoesAPI.updateFulfillment(
        orderId,
        {
          status,
          message: message || undefined,
          trackingNumber: trackingNumber || undefined,
          carrier: carrier || undefined,
          estimatedDeliveryAt: eta ? new Date(eta).toISOString() : undefined,
        },
        token
      );
      setOk("Fulfillment status updated and customers notified.");
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel commerce-panel">
      <h2>Order tracking</h2>
      <p>Move orders through fulfillment. Tracking numbers are store-managed unless a shipping API is configured.</p>
      <form className="commerce-fields" onSubmit={submit}>
        <label>
          Order
          <select value={orderId} onChange={(e) => setOrderId(e.target.value)} required>
            <option value="">Select order</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} · {o.fulfillment_status || "order_confirmed"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Customer message
          <input maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <label>
          Tracking number (optional)
          <input maxLength={80} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
        </label>
        <label>
          Carrier (optional)
          <input maxLength={80} value={carrier} onChange={(e) => setCarrier(e.target.value)} />
        </label>
        <label>
          Estimated delivery
          <input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
        </label>
        <button type="submit" disabled={busy || !orderId}>
          {busy ? "Saving…" : "Update fulfillment"}
        </button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {ok && <p role="status">{ok}</p>}
    </section>
  );
}