import { useState } from "react";
import { shoesAPI } from "../api";
import { categories } from "../data/catalog";

export default function SiteFooter({ go }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ status: "idle", message: "" });

  async function subscribe(e) {
    e.preventDefault();
    setState({ status: "loading", message: "" });
    try {
      const r = await shoesAPI.subscribeNewsletter(email.trim());
      setState({ status: "done", message: r.message || "You're subscribed." });
      setEmail("");
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  }

  const link = (label, to) => (
    <a
      href={to}
      onClick={(e) => {
        e.preventDefault();
        go(to);
      }}
    >
      {label}
    </a>
  );

  return (
    <footer className="footer" id="about">
      <div className="container">
        <div className="footer-grid">
          <div>
            {link(
              <span className="logo">
                SHOES<span>.</span>
              </span>,
              "/"
            )}
            <p>
              Premium footwear. Modern lifestyle.
              <br />
              Find your next favorite pair.
            </p>
            <p className="muted small">SHOES is a portfolio demo store. No real goods are shipped.</p>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            {link("Home", "/")}
            {link("Shop all", "/shop")}
            {link("Categories", "/categories")}
            {link("My Account", "/account")}
            {link("Image credits", "/image-credits")}
          </div>
          <div className="footer-col">
            <h4>Collections</h4>
            {categories.map((c) => (
              <span key={c.name}>{link(c.name, `/shop?category=${encodeURIComponent(c.name)}`)}</span>
            ))}
          </div>
          <div>
            <h4>Stay in the loop</h4>
            <p>Get updates on new drops and collections.</p>
            <form className="newsletter" onSubmit={subscribe}>
              <input
                aria-label="Newsletter email"
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state.status !== "loading") setState({ status: "idle", message: "" });
                }}
                placeholder="Email address"
              />
              <button aria-label="Subscribe" type="submit" disabled={state.status === "loading"}>
                →
              </button>
            </form>
            {state.message && (
              <small className={state.status === "error" ? "form-error" : "muted"} role="status">
                {state.message}
              </small>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} SHOES. All rights reserved.</span>
          <span>Designed for the next step. ⚡</span>
        </div>
      </div>
    </footer>
  );
}
