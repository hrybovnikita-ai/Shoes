import { useEffect, useMemo, useState } from "react";
import { shoesAPI } from "../api";
import { useAuth } from "../auth/AuthContext";
import { money } from "../lib/format";
import { LinesSkeleton } from "../components/Skeleton";
import "./commerce.css";

const RANGES = [
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "30D", days: 30 },
  { id: "90d", label: "90D", days: 90 },
  { id: "all", label: "All time", days: null },
];

function filterHistory(history, rangeId) {
  const range = RANGES.find((r) => r.id === rangeId);
  if (!range?.days) return history;
  const cut = Date.now() - range.days * 86400000;
  const filtered = history.filter((h) => new Date(h.recorded_at).getTime() >= cut);
  return filtered.length ? filtered : history.slice(-1);
}

function daysSpan(history) {
  if (history.length < 2) return 0;
  const t0 = new Date(history[0].recorded_at).getTime();
  const t1 = new Date(history.at(-1).recorded_at).getTime();
  return Math.abs(t1 - t0) / 86400000;
}

function PriceStat({ label, value, accent }) {
  return (
    <div className={`price-stat${accent ? " is-current" : ""}`}>
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PriceChart({ chart, hover, setHover, active }) {
  return (
    <div className="price-chart-wrap">
      <p className="price-chart-focus" aria-live="polite">
        {active && (
          <>
            <strong>{money(active.price)}</strong>
            <span className="muted"> · {new Date(active.recorded_at).toLocaleDateString("en-US")}</span>
          </>
        )}
      </p>
      <svg
        viewBox={`0 0 ${chart.w} ${chart.h}`}
        className="commerce-chart price-chart"
        role="img"
        aria-label="Product price history in USD"
      >
        {[0, 0.5, 1].map((t) => {
          const y = chart.pad.t + chart.innerH * (1 - t);
          const val = chart.yMin + (chart.yMax - chart.yMin) * t;
          return (
            <g key={t}>
              <line x1={chart.pad.l} x2={chart.w - chart.pad.r} y1={y} y2={y} className="price-grid-line" />
              <text x={chart.pad.l - 6} y={y + 4} className="price-axis-label" textAnchor="end">
                {money(val)}
              </text>
            </g>
          );
        })}
        <polyline
          points={chart.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          className="price-line"
          strokeWidth="2.5"
        />
        {chart.points.map((p, i) => (
          <circle
            key={p.id || i}
            cx={p.x}
            cy={p.y}
            r={hover === p ? 6 : 4}
            className="price-point"
            onMouseEnter={() => setHover(p)}
            onMouseLeave={() => setHover(null)}
            tabIndex={0}
            onFocus={() => setHover(p)}
            onBlur={() => setHover(null)}
          >
            <title>
              {new Date(p.recorded_at).toLocaleDateString("en-US")}: {money(p.price)}
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

export default function PricePanel({ product }) {
  const { user, getToken } = useAuth();
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [range, setRange] = useState("all");
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const c = new AbortController();
    shoesAPI
      .prices(product.id, { signal: c.signal })
      .then((r) => setHistory(r.history))
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [product.id]);

  const filtered = useMemo(
    () => (history?.length ? filterHistory(history, range) : []),
    [history, range]
  );

  const prices = filtered.map((h) => Number(h.price));
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const current = Number(product.price);
  const showFilters = history && history.length > 1 && daysSpan(history) >= 7;

  const chart = useMemo(() => {
    if (filtered.length < 2) return null;
    const pad = { l: 52, r: 12, t: 14, b: 38 };
    const w = 600;
    const h = 188;
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const yMin = min;
    const yMax = max === min ? min + 1 : max;
    const points = filtered.map((row, i) => {
      const x = pad.l + (i / Math.max(1, filtered.length - 1)) * innerW;
      const y = pad.t + innerH - ((Number(row.price) - yMin) / (yMax - yMin)) * innerH;
      return { x, y, ...row };
    });
    return { w, h, points, pad, yMin, yMax, innerH };
  }, [filtered, min, max]);

  async function subscribe(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await shoesAPI.watchPrice(product.id, Number(target), await getToken());
      setMessage("Price alert saved. Manage it in your account.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const active = hover ?? chart?.points.at(-1);

  return (
    <section className="commerce-panel shoe-panel price-panel" aria-labelledby="price-history-title">
      <h2 id="price-history-title">Price history</h2>

      {history === null && !error && <LinesSkeleton lines={3} />}
      {error && <p className="form-error">{error}</p>}

      {history && history.length === 0 && (
        <p className="price-panel-empty muted">No price changes recorded yet.</p>
      )}

      {history?.length === 1 && (
        <div className="price-single-record">
          <p className="muted">One price on file — chart appears after the next change.</p>
          <div className="price-single-grid">
            <div>
              <small className="muted">Recorded</small>
              <strong>{money(history[0].price)}</strong>
              <span className="muted">{new Date(history[0].recorded_at).toLocaleDateString("en-US")}</span>
            </div>
            <div>
              <small className="muted">Current</small>
              <strong>{money(current)}</strong>
            </div>
          </div>
        </div>
      )}

      {history && history.length > 1 && (
        <>
          <div className="price-stats" role="group" aria-label="Price summary">
            <PriceStat label="Current" value={money(current)} accent />
            <PriceStat label="Lowest" value={money(min)} />
            <PriceStat label="Highest" value={money(max)} />
          </div>
          {showFilters && (
            <RangeTabs range={range} setRange={setRange} />
          )}
          {chart && <PriceChart chart={chart} hover={hover} setHover={setHover} active={active} />}
          <details className="price-table-details">
            <summary>View price records</summary>
            <div className="commerce-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((h) => (
                    <tr key={h.id}>
                      <td>{new Date(h.recorded_at).toLocaleString("en-US")}</td>
                      <td>{money(h.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}

      {user ? (
        <form onSubmit={subscribe} className="commerce-fields price-track-form">
          <label>
            Notify me when price drops below
            <div className="price-track-row">
              <span className="price-track-prefix">$</span>
              <input
                type="number"
                required
                min="0.01"
                max={Math.max(0.01, product.price - 0.01)}
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          </label>
          <button disabled={busy} type="submit" className="price-track-btn primary">
            {busy ? "Saving…" : "Track price"}
          </button>
        </form>
      ) : (
        <p className="muted price-track-guest">
          <a href="/login">Sign in</a> to track price drops.
        </p>
      )}
      {message && <p role="status" className="price-track-msg">{message}</p>}
    </section>
  );
}

function RangeTabs({ range, setRange }) {
  return (
    <div className="price-range-tabs" role="tablist" aria-label="Price history period">
      {RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          role="tab"
          aria-selected={range === r.id}
          className={range === r.id ? "active" : ""}
          onClick={() => setRange(r.id)}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}