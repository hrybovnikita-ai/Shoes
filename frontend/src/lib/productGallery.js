/** Normalize API gallery payloads for ProductGallery UI. */
export function resolveProductGallery(product) {
  if (!product) return { slides: [], limitation: null };
  const limitation = product.galleryLimitation || null;

  const raw = Array.isArray(product.gallery) && product.gallery.length
    ? product.gallery
    : (Array.isArray(product.images) && product.images.length ? product.images : [product.image]).map((url) => ({
        url,
        angle: "primary",
        label: "Primary",
        verified: true,
      }));

  const seen = new Set();
  const slides = [];
  for (const entry of raw) {
    const url = typeof entry === "string" ? entry : entry?.url;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    slides.push({
      url,
      angle: entry.angle || "primary",
      label: entry.label || entry.angle || `View ${slides.length + 1}`,
      verified: entry.verified !== false,
      colorway: entry.colorway || null,
    });
  }

  return { slides, limitation };
}

export function filterSlidesByColor(slides, color) {
  if (!color) return slides;
  const scoped = slides.filter((s) => !s.colorway || s.colorway === color);
  return scoped.length ? scoped : slides;
}