export const money = (value) => `$${(Number(value) || 0).toFixed(2)}`;
export const cents = (c) => `$${((Number(c) || 0) / 100).toFixed(2)}`;

export function stockInfo(stock) {
  if (stock == null || !Number.isFinite(Number(stock))) return { label: "Availability unknown", tone: "unknown" };
  const n = Number(stock);
  if (n <= 0) return { label: "Out of stock", tone: "out" };
  if (n <= 5) return { label: `Only ${n} left`, tone: "low" };
  return { label: "In stock", tone: "in" };
}

// Unsplash (w=) and Shopify's CDN (width=) both resize on the fly.
export function imageSrcSet(url) {
  if (typeof url !== "string") return undefined;
  if (url.startsWith("https://cdn.shopify.com/")) {
    const base = url.split("?")[0];
    return [400, 700, 1000].map((w) => `${base}?width=${w} ${w}w`).join(", ");
  }
  if (!url.includes("images.unsplash.com")) return undefined;
  const base = url.replace(/([?&])w=\d+/, "$1").replace(/[?&]$/, "");
  const sep = base.includes("?") ? "&" : "?";
  return [400, 700, 1000].map((w) => `${base}${sep}w=${w}&auto=format&q=75 ${w}w`).join(", ");
}

export const SIZES = Array.from({ length: 11 }, (_, i) => i + 36); // EU 36–46

// Store colour families used by the colour filter chips.
export const COLOR_FILTERS = ["Purple", "Green", "Orange", "Yellow", "Black"];

// Sizes a product actually sells (migration 007 `sizes`), else the full grid.
export const sizesFor = (product) =>
  Array.isArray(product?.sizes) && product.sizes.length ? product.sizes.map(Number) : SIZES;

export const sizeRangeLabel = (product) => {
  const s = sizesFor(product);
  return `EU ${Math.min(...s)}–${Math.max(...s)}`;
};

// Text used by every product search box.
export const searchText = (p) =>
  `${p.name} ${p.brand} ${p.category} ${p.color} ${p.colorway || ""} ${p.styleCode || ""}`.toLowerCase();

export const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "Unknown date"
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};
