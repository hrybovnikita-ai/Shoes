import { useEffect, useRef, useState } from "react";
import ProductCard from "./ProductCard";

export default function ProductCarousel({ eyebrow, title, products, cardProps, id }) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [products.length]);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(320, el.clientWidth * 0.85), behavior: "smooth" });
    setTimeout(updateArrows, 300);
  };

  if (!products.length) return null;

  const few = products.length <= 2;

  return (
    <section className="shoe-carousel-section section" id={id} aria-labelledby={`${id}-title`}>
      <div className="shoe-carousel-head section-heading">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h2 id={`${id}-title`}>{title}</h2>
        </div>
        {products.length > 1 && !few && (
          <nav className="shoe-carousel-nav" aria-label="Carousel navigation">
            <button type="button" onClick={() => scroll(-1)} disabled={!canPrev} aria-label="Scroll products left">
              ←
            </button>
            <button type="button" onClick={() => scroll(1)} disabled={!canNext} aria-label="Scroll products right">
              →
            </button>
          </nav>
        )}
      </div>
      <div className={`shoe-carousel-track ${few ? "is-compact" : ""}`} ref={trackRef} onScroll={updateArrows}>
        {products.map((p) => (
          <div className="shoe-carousel-item" key={p.id}>
            <ProductCard product={p} {...cardProps(p)} />
          </div>
        ))}
      </div>
    </section>
  );
}