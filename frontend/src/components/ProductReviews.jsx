import { useEffect, useMemo, useState } from "react";
import { shoesAPI } from "../api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "./Toast";
import { formatDate } from "../lib/format";
import { LinesSkeleton } from "./Skeleton";

function Stars({ value, size = "md" }) {
  const v = Math.round(Number(value) || 0);
  return (
    <span className={`stars stars-${size}`} aria-label={`${value} out of 5 stars`}>
      {"★★★★★".slice(0, v)}
      <span className="stars-off">{"★★★★★".slice(v)}</span>
    </span>
  );
}

function StarRatingInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className="star-rating-input" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={display >= n ? "on" : ""}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({ productId }) {
  const { user, getToken } = useAuth();
  const { notify } = useToast();
  const [data, setData] = useState({ loading: true, reviews: [], average: null, count: 0, error: "" });
  const [form, setForm] = useState({ rating: 5, title: "", body: "" });
  const [saving, setSaving] = useState(false);

  const load = () =>
    shoesAPI
      .getReviews(productId)
      .then((r) => setData({ loading: false, reviews: r.reviews, average: r.average, count: r.count, error: "" }))
      .catch((e) => setData((d) => ({ ...d, loading: false, error: e.message })));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const distribution = useMemo(() => {
    if (!data.count) return [5, 4, 3, 2, 1].map((star) => ({ star, count: 0, pct: 0 }));
    return [5, 4, 3, 2, 1].map((star) => {
      const count = data.reviews.filter((r) => Number(r.rating) === star).length;
      return { star, count, pct: Math.round((count / data.count) * 100) };
    });
  }, [data.reviews, data.count]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      await shoesAPI.createReview(
        productId,
        { rating: Number(form.rating), title: form.title, body: form.body },
        token
      );
      setForm({ rating: 5, title: "", body: "" });
      notify("Thanks! Your review was published.");
      load();
    } catch (err) {
      notify(err.message, { type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="shoe-reviews shoe-panel" aria-labelledby="reviews-title">
      <div className="shoe-section-head">
        <h2 id="reviews-title">Customer Reviews</h2>
      </div>
      <p className="muted small shoe-reviews-note">
        Reviews are from signed-in SHOES customers. Verified purchase means an order included this product.
      </p>

      {data.loading ? (
        <LinesSkeleton lines={4} />
      ) : data.error ? (
        <p className="form-error">{data.error}</p>
      ) : data.count === 0 ? (
        <div className="shoe-reviews-empty">
          <p className="muted">No reviews yet — be the first to share your experience.</p>
        </div>
      ) : (
        <div className="shoe-reviews-summary">
          <div className="shoe-reviews-score">
            <strong>{Number(data.average).toFixed(1)}</strong>
            <Stars value={data.average} size="lg" />
            <span className="muted">{data.count} review{data.count === 1 ? "" : "s"}</span>
          </div>
          <ul className="shoe-rating-bars" aria-label="Rating distribution">
            {distribution.map((row) => (
              <li key={row.star}>
                <span className="shoe-rating-bar-label">{row.star}★</span>
                <div className="shoe-rating-bar-track" role="presentation">
                  <div className="shoe-rating-bar-fill" style={{ width: `${row.pct}%` }} />
                </div>
                <span className="shoe-rating-bar-count muted">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!data.loading && !data.error && data.reviews.length > 0 && (
        <ul className="review-list review-cards">
          {data.reviews.map((r) => (
            <li key={r.id} className="review review-card">
              <div className="review-card-head">
                <Stars value={r.rating} />
                <strong>{r.title || "Review"}</strong>
              </div>
              <p>{r.body}</p>
              <footer className="review-meta muted">
                <span>{r.author}</span>
                <span>·</span>
                <span>{formatDate(r.createdAt)}</span>
                {r.verifiedPurchase && (
                  <>
                    <span>·</span>
                    <span className="verified-badge">✓ Verified purchase</span>
                  </>
                )}
              </footer>
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <form className="review-form" onSubmit={submit}>
          <h3>Write a review</h3>
          <label>
            Rating
            <StarRatingInput value={Number(form.rating)} onChange={(rating) => setForm({ ...form, rating })} />
          </label>
          <label>
            Title (optional)
            <input maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label>
            Your review
            <textarea
              required
              minLength={10}
              maxLength={1000}
              rows={4}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </label>
          <button type="submit" className="shoe-cart-btn shoe-submit-review" disabled={saving}>
            {saving ? "Publishing…" : "Publish review"}
          </button>
        </form>
      ) : (
        <p className="muted">
          <a href="/login">Sign in</a> to write a review.
        </p>
      )}
    </section>
  );
}
