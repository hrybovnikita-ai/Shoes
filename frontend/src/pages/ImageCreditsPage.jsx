import { useEffect, useState } from "react";
import "./AboutPage.css";

export default function ImageCreditsPage() {
  const [data, setData] = useState({ credits: [], products: [] });
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/image-credits.json")
      .then((r) => {
        if (!r.ok) throw new Error("Could not load image credits");
        return r.json();
      })
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <main className="container image-credits-page" style={{ padding: "3rem 0 4rem", maxWidth: "min(1100px, 100% - 2rem)", margin: "0 auto" }}>
      <h1>Image credits</h1>
      <p className="muted">
        Product photos on this demo storefront come from Wikimedia Commons, Openverse, Flickr, and
        other sources under licenses that allow reuse. Attribution is required where noted (CC BY).
      </p>

      {err && <p className="error-text">{err}</p>}

      <section className="about-block">
        <h2>Products with explicit attribution</h2>
        <ul className="credits-list">
          {data.credits.map((row) => (
            <li key={row.slug || row.title}>
              <strong>{row.title}</strong>
              <span className="muted"> — {row.source}</span>
              {row.license && <div className="small muted">License: {row.license}</div>}
              {row.author && <div className="small muted">Author: {row.author}</div>}
              {row.url && (
                <a href={row.url} target="_blank" rel="noopener noreferrer">
                  Source file
                </a>
              )}
              {row.note && <p className="small">{row.note}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="about-block">
        <h2>Full catalog manifest</h2>
        <p className="small muted">
          Per-product image provider and match notes ({data.products?.length || 0} sneakers).
        </p>
        <div className="credits-table-wrap">
          <table className="credits-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>Provider</th>
                <th>Source</th>
                <th>License</th>
              </tr>
            </thead>
            <tbody>
              {(data.products || []).map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>{p.source || "—"}</td>
                  <td className="mono small">{p.file || "—"}</td>
                  <td className="small">{p.license || "Wikimedia Commons (verify file page)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}