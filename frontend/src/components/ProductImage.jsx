import { useState } from "react";
import { imageSrcSet, productImageSrc } from "../lib/format";
import "./ProductImage.css";

const FALLBACK = "/images/products/placeholder.webp";

/**
 * Product photo with lazy load, srcset, skeleton, and graceful fallback.
 */
export default function ProductImage({
  src,
  alt,
  className = "",
  width,
  height,
  loading = "lazy",
  sizes,
  fetchPriority,
}) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const resolved = productImageSrc(broken ? "" : src);
  const finalSrc = broken ? FALLBACK : resolved || FALLBACK;

  return (
    <span
      className={`product-image-frame${loaded ? " is-loaded" : ""}${broken ? " is-fallback" : ""} ${className}`.trim()}
      style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
    >
      {!loaded && <span className="product-image-skeleton" aria-hidden="true" />}
      <img
        className="product-image-el"
        src={finalSrc}
        srcSet={broken ? undefined : imageSrcSet(resolved)}
        sizes={sizes}
        alt={alt || ""}
        loading={loading}
        decoding="async"
        width={width}
        height={height}
        fetchPriority={fetchPriority}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setBroken(true);
          setLoaded(true);
        }}
      />
    </span>
  );
}