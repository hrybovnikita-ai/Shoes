import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useDocumentMeta from "../hooks/useDocumentMeta";
import "./AboutPage.css";

const BELIEFS = [
  { title: "Style Without Limits", text: "Discover sneakers that express who you are, from minimal everyday essentials to standout streetwear designs." },
  { title: "Comfort Every Day", text: "Find footwear designed to complement your daily routine, whether you're exploring the city or enjoying a relaxed weekend." },
  { title: "Sneakers For Everyone", text: "Explore a diverse selection of styles, colors, and silhouettes for different tastes and occasions." },
  { title: "Passion For Sneakers", text: "We celebrate sneaker culture, creativity, and the confidence that comes with finding your perfect pair." },
];

const FEATURES = [
  { title: "Curated Sneaker Selection", text: "Explore a carefully organized collection of running, lifestyle, and casual sneakers." },
  { title: "Easy Shopping", text: "Browse collections, compare styles, and find your next favorite pair with ease." },
  { title: "Save Your Favorites", text: "Keep track of the sneakers you love and return to them whenever inspiration strikes." },
  { title: "Discover Your Style", text: "Explore different brands, designs, and colors to find sneakers that match your look." },
];

const COLLECTIONS = [
  { icon: "🏃", title: "Running Sneakers", text: "Sport-inspired styles for an active lifestyle." },
  { icon: "👟", title: "Lifestyle Sneakers", text: "Versatile designs for everyday comfort and confidence." },
  { icon: "★", title: "Casual Classics", text: "Timeless silhouettes that never go out of style." },
  { icon: "🔥", title: "Streetwear Favorites", text: "Bold designs inspired by modern sneaker culture." },
];

const num = (i) => String(i + 1).padStart(2, "0");

// Adds .is-visible to [data-reveal] elements as they scroll into view.
function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const items = root.querySelectorAll("[data-reveal]");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      items.forEach((el) => el.classList.add("is-visible"));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

export default function AboutPage() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  useReveal(rootRef);
  useDocumentMeta({
    title: "About",
    description:
      "About SHOES: a sneaker destination for style, comfort and individuality. Explore running, lifestyle, casual and streetwear sneakers.",
  });

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const scrollToStory = () => {
    const el = document.getElementById("about-story");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <main className="about" id="main-content" ref={rootRef}>
      {/* 1. Hero */}
      <section className="about-hero" aria-labelledby="about-hero-title">
        <div className="about-container about-hero-inner" data-reveal>
          <span className="about-eyebrow">About SHOES</span>
          <h1 id="about-hero-title" className="about-hero-title">
            More than sneakers. <span className="about-accent">It&apos;s a lifestyle.</span>
          </h1>
          <p className="about-hero-text">
            Welcome to SHOES — your destination for sneakers that combine style, comfort, and individuality. Discover
            footwear that matches your personality and keeps you moving.
          </p>
          <div className="about-actions">
            <button type="button" className="about-btn about-btn-primary" onClick={() => navigate("/shop")}>
              Shop Sneakers
            </button>
            <button type="button" className="about-btn about-btn-ghost" onClick={scrollToStory}>
              Discover Our Story
            </button>
          </div>
        </div>
      </section>

      {/* 2. Our story */}
      <section className="about-section" id="about-story" aria-labelledby="about-story-title">
        <div className="about-container about-story">
          <div className="about-story-text" data-reveal>
            <span className="about-eyebrow">Where it began</span>
            <h2 id="about-story-title" className="about-h2">Our Story</h2>
            <p>
              SHOES was created for people who see sneakers as more than everyday footwear. From timeless classics to
              bold streetwear styles, we bring together collections that celebrate individuality, confidence, and
              self-expression.
            </p>
          </div>
          <div className="about-story-visual about-glass" data-reveal aria-hidden="true">
            <div className="about-story-glow" />
            <span className="about-story-logo">SHOES</span>
            <span className="about-story-tag">Made for sneaker lovers</span>
          </div>
        </div>
      </section>

      {/* 3. What we believe in */}
      <section className="about-section about-section-alt" aria-labelledby="about-values-title">
        <div className="about-container">
          <div className="about-head" data-reveal>
            <span className="about-eyebrow">Our values</span>
            <h2 id="about-values-title" className="about-h2">What We Believe In</h2>
          </div>
          <ul className="about-grid about-grid-4">
            {BELIEFS.map((v, i) => (
              <li key={v.title} className="about-card about-glass" data-reveal style={{ "--delay": `${i * 80}ms` }}>
                <span className="about-icon about-icon-num" aria-hidden="true">{num(i)}</span>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Why shop with SHOES */}
      <section className="about-section" aria-labelledby="about-why-title">
        <div className="about-container">
          <div className="about-head" data-reveal>
            <span className="about-eyebrow">The SHOES difference</span>
            <h2 id="about-why-title" className="about-h2">Why Shop With SHOES?</h2>
          </div>
          <ul className="about-grid about-grid-2">
            {FEATURES.map((f, i) => (
              <li key={f.title} className="about-feature about-glass" data-reveal style={{ "--delay": `${i * 80}ms` }}>
                <span className="about-feature-num" aria-hidden="true">{num(i)}</span>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. Collections */}
      <section className="about-section about-section-alt" aria-labelledby="about-collections-title">
        <div className="about-container">
          <div className="about-head about-head-center" data-reveal>
            <span className="about-eyebrow">Find your style</span>
            <h2 id="about-collections-title" className="about-h2">Explore Our Collections</h2>
            <p className="about-muted">
              From everyday essentials to statement sneakers, explore collections designed for every mood, outfit, and
              occasion.
            </p>
          </div>
          <ul className="about-grid about-grid-4">
            {COLLECTIONS.map((c, i) => (
              <li key={c.title} data-reveal style={{ "--delay": `${i * 80}ms` }}>
                <button type="button" className="about-collection" onClick={() => navigate("/shop")}>
                  <span className="about-collection-icon" aria-hidden="true">{c.icon}</span>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                  <span className="about-collection-link" aria-hidden="true">Shop now →</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6. Store information */}
      <section className="about-section about-section-compact" aria-labelledby="about-notice-title">
        <div className="about-container">
          <div className="about-notice" role="note" data-reveal>
            <span className="about-notice-icon" aria-hidden="true">i</span>
            <div>
              <h2 id="about-notice-title">Store Information</h2>
              <p>
                SHOES is currently a demonstration online store. You can explore products and experience the shopping
                features, but purchases are simulated and no physical products are shipped.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CTA */}
      <section className="about-section about-cta-wrap" aria-labelledby="about-cta-title">
        <div className="about-container">
          <div className="about-cta about-glass" data-reveal>
            <h2 id="about-cta-title" className="about-h2">Your next favorite pair starts here.</h2>
            <p className="about-muted">
              Explore our sneaker collection, discover new styles, and find the perfect match for your everyday look.
            </p>
            <button type="button" className="about-btn about-btn-primary" onClick={() => navigate("/shop")}>
              Explore Sneakers
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
