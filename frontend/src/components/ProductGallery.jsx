import { useCallback, useEffect, useRef, useState } from "react";
import ProductImage from "./ProductImage";

export default function ProductGallery({ images, productName, badge, discount }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const frameRef = useRef(null);
  const dialogRef = useRef(null);

  const src = images[active] || images[0];

  const moveZoom = useCallback(
    (e) => {
      if (!zoom || !frameRef.current) return;
      const rect = frameRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      frameRef.current.style.setProperty("--zoom-x", `${x}%`);
      frameRef.current.style.setProperty("--zoom-y", `${y}%`);
    },
    [zoom]
  );

  useEffect(() => {
    if (!fullscreen) return undefined;
    dialogRef.current?.showModal();
    const onKey = (e) => {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, images.length]);

  useEffect(() => {
    if (!fullscreen) dialogRef.current?.close();
  }, [fullscreen]);

  return (
  <>
    <section className="shoe-gallery" aria-label="Product images">
      <div className="shoe-gallery-sticky">
        <div
          className={`shoe-main-image ${zoom ? "is-zoomed" : ""}`}
          ref={frameRef}
          onMouseMove={moveZoom}
          onMouseLeave={() => frameRef.current?.style.removeProperty("--zoom-x")}
        >
          <button
            type="button"
            className="shoe-image-hit"
            onClick={() => setFullscreen(true)}
            onDoubleClick={() => setZoom((z) => !z)}
            aria-label={`View ${productName} fullscreen. Double-click to toggle zoom.`}
          >
            <ProductImage
              src={src}
              sizes="(max-width: 900px) 100vw, 42vw"
              alt={`${productName} — image ${active + 1} of ${images.length}`}
              width="900"
              height="900"
              loading="eager"
              fetchPriority="high"
            />
          </button>
          {badge && <span className="shoe-product-badge">{badge}</span>}
          {discount > 0 && <span className="shoe-discount-badge">−{discount}%</span>}
          <div className="shoe-gallery-toolbar">
            <button type="button" className="shoe-gallery-tool" onClick={() => setZoom((z) => !z)} aria-pressed={zoom}>
              {zoom ? "Zoom off" : "Zoom"}
            </button>
            <button type="button" className="shoe-gallery-tool" onClick={() => setFullscreen(true)}>
              Fullscreen
            </button>
          </div>
          {images.length > 1 && (
            <div className="shoe-gallery-controls">
              <button
                type="button"
                onClick={() => setActive((c) => (c - 1 + images.length) % images.length)}
                aria-label="Previous image"
              >
                ←
              </button>
              <button type="button" onClick={() => setActive((c) => (c + 1) % images.length)} aria-label="Next image">
                →
              </button>
            </div>
          )}
        </div>
        {images.length > 1 && (
          <GalleryThumbs images={images} active={active} onPick={setActive} />
        )}
      </div>
    </section>

    <dialog
      className="shoe-fullscreen-dialog"
      ref={dialogRef}
      onClose={() => setFullscreen(false)}
      aria-label={`${productName} image preview`}
    >
      <button type="button" className="shoe-fullscreen-close" onClick={() => setFullscreen(false)} aria-label="Close preview">
        ✕
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="shoe-fullscreen-nav prev"
            onClick={() => setActive((c) => (c - 1 + images.length) % images.length)}
            aria-label="Previous"
          >
            ←
          </button>
          <button
            type="button"
            className="shoe-fullscreen-nav next"
            onClick={() => setActive((c) => (c + 1) % images.length)}
            aria-label="Next"
          >
            →
          </button>
        </>
      )}
      <ProductImage src={src} alt={productName} className="shoe-fullscreen-img" loading="eager" />
      <p className="shoe-fullscreen-meta">
        {active + 1} / {images.length}
      </p>
    </dialog>
  </>
  );
}

function GalleryThumbs({ images, active, onPick }) {
  return (
    <div className="shoe-thumbnails" role="tablist" aria-label="Product thumbnails">
      {images.map((image, index) => (
        <button
          type="button"
          key={`${image}-${index}`}
          role="tab"
          className={active === index ? "selected" : ""}
          onClick={() => onPick(index)}
          aria-label={`View image ${index + 1}`}
          aria-selected={active === index}
        >
          <ProductImage src={image} alt="" width="96" height="96" />
        </button>
      ))}
    </div>
  );
}