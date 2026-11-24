export const money = (value) => `$${(Number(value) || 0).toFixed(2)}`;
export const cents = (c) => `$${((Number(c) || 0) / 100).toFixed(2)}`;

export function stockInfo(stock) {
  if (stock == null || !Number.isFinite(Number(stock))) return { label: "Availability unknown", tone: "unknown" };
  const n = Number(stock);
  if (n <= 0) return { label: "Out of stock", tone: "out" };
  if (n <= 5) return { label: `Only ${n} left`, tone: "low" };
  return { label: "In stock", tone: "in" };
}

export const PRODUCT_IMAGE_FALLBACK = "/images/products/fallback.webp";

export function productImageSrc(url) {
  if (typeof url !== "string" || !url.trim()) return PRODUCT_IMAGE_FALLBACK;
  const u = url.trim();
  if (u.startsWith("/")) return u;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `/${u.replace(/^\//, "")}`;
}

/** Responsive srcset for local WebP assets and legacy remote URLs. */
export function imageSrcSet(url) {
  const src = productImageSrc(url);
  if (src.includes("/images/products/") && src.endsWith(".webp") && !src.includes("-400") && !src.includes("-800")) {
    const base = src.replace(/\.webp$/, "");
    return `${base}-400.webp 400w, ${base}-800.webp 800w, ${src} 1200w`;
  }
  if (src.includes("images.unsplash.com")) {
    const base = src.replace(/([?&])w=\d+/, "$1").replace(/[?&]$/, "");
    const sep = base.includes("?") ? "&" : "?";
    return [400, 700, 1000].map((w) => `${base}${sep}w=${w}&auto=format&q=75 ${w}w`).join(", ");
  }
  if (src.includes("images.pexels.com")) {
    return `${src.replace(/w=\d+/, "w=400")} 400w, ${src.replace(/w=\d+/, "w=800")} 800w, ${src} 1200w`;
  }
  return undefined;
}

export const SIZES = Array.from({ length: 11 }, (_, i) => i + 36); // EU 36–46

export const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "Unknown date"
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};
