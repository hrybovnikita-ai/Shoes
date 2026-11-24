import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { LinesSkeleton } from "../components/Skeleton";
import useDocumentMeta from "../hooks/useDocumentMeta";
import useOrderTracking from "../tracking/useOrderTracking";
import "../tracking/tracking.css";

export default function OrderTrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { tracking, error, live, refresh } = useOrderTracking(id, { getToken, enabled: Boolean(id) });

  useDocumentMeta({ title: id ? `Tracking ${id}` : "Order tracking", noindex: true });

  if (!tracking && !error) {
    return (
      <main className="container tracking-page" id="main-content">
        <LinesSkeleton lines={5} />
      </main>
    );
  }

  if (error) {
    return (
      <main className="container tracking-page empty-state" id="main-content">
        <h1>Tracking unavailable</h1>
        <p role="alert">{error}</p>
        <button type="button" className="primary" onClick={() => navigate("/account")}>
          Go to account
        </button>
      </main>
    );
  }

  const latest = tracking.events?.at(-1);

  return (
    <main className="container tracking-page" id="main-content">
      <button type="button" className="text-link" onClick={() => navigate("/account")}>
        ← My orders
      </button>
      <header className="tracking-hero">
        <div>
          <div className="eyebrow">ORDER TRACKING</div>
          <h1>{tracking.orderId}</h1>
          <p className="muted">{latest?.message || "We will notify you as your order moves forward."}</p>
        </div>
        <div>
          <span className={`tracking-live ${live ? "live" : ""}`}>{live ? "Live updates" : "Polling updates every 20s"}</span>
          <button type="button" className="account-secondary" onClick={refresh}>
            Refresh
          </button>
        </div>
      </header>

      <p className="tracking-status-pill" role="status">
        Current status: <strong>{tracking.timeline.find((t) => t.current)?.label || "—"}</strong>
      </p>

      {tracking.trackingNumber && (
        <p>
          Tracking number: <strong>{tracking.trackingNumber}</strong>
          {tracking.carrier ? ` · ${tracking.carrier}` : ""}
          {tracking.trackingSimulated && (
            <span className="muted"> · Store-entered reference (not carrier API data)</span>
          )}
        </p>
      )}
      {tracking.estimatedDeliveryAt && (
        <p>Estimated delivery: {new Date(tracking.estimatedDeliveryAt).toLocaleString("en-US")}</p>
      )}

      <ol className="tracking-timeline" aria-label="Delivery progress">
        {tracking.timeline.map((step) => (
          <li key={step.status} className={`tracking-step ${step.complete ? "complete" : ""} ${step.current ? "current" : ""}`}>
            <span className="tracking-dot" aria-hidden="true" />
            <div>
              <strong>{step.label}</strong>
              {step.current && <p className="muted">In progress</p>}
            </div>
          </li>
        ))}
      </ol>

      <section className="tracking-events" aria-labelledby="events-title">
        <h2 id="events-title">Updates</h2>
        <ul>
          {tracking.events.map((e) => (
            <li key={e.id}>
              <strong>{e.label}</strong> · {new Date(e.at).toLocaleString("en-US")}
              {e.message ? <p className="muted">{e.message}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}