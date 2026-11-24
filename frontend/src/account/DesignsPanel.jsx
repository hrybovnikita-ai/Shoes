import { useEffect, useState } from "react";
import { shoesAPI } from "../api";
import { useAuth } from "../auth/AuthContext";
import { LinesSkeleton } from "../components/Skeleton";
import { money } from "../lib/format";

export default function DesignsPanel({ onOpenCustomizer }) {
  const { getToken } = useAuth();
  const [designs, setDesigns] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getToken()
      .then((token) => shoesAPI.getDesigns(token))
      .then((r) => active && setDesigns(r.designs || []))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [getToken]);

  return (
    <section className="account-panel wide commerce-panel" id="my-designs" aria-labelledby="designs-title">
      <h2 id="designs-title">My custom designs</h2>
      {!designs && !error && <LinesSkeleton lines={3} />}
      {error && <p className="form-error" role="alert">{error}</p>}
      {designs?.length === 0 && <p>You have not saved any designs yet. Customize a sneaker from a product page.</p>}
      {designs?.length > 0 && (
        <div className="designs-grid">
          {designs.map((d) => (
            <article className="design-card" key={d.id}>
              <img src={d.image} alt="" loading="lazy" />
              <strong>{d.name}</strong>
              <p className="muted">
                {d.brand} · {d.productName}
              </p>
              <p>+{money(d.surchargeCents / 100)} customization</p>
              <button type="button" className="account-secondary" onClick={() => onOpenCustomizer(d.productId, d.id)}>
                Open in customizer
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}