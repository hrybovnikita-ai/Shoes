export const money = (value) => `$${(Number(value) || 0).toFixed(2)}`;
export const cents = (c) => `$${((Number(c) || 0) / 100).toFixed(2)}`;

export function stockInfo(stock) {
  if (stock == null || !Number.isFinite(Number(stock))) return { label: "Availability unknown", tone: "unknown" };
  const n = Number(stock);
  if (n <= 0) return { label: "Out of stock", tone: "out" };
  if (n <= 5) return { label: `Only ${n} left`, tone: "low" };
  return { label: "In stock", tone: "in" };
}

// Unsplash supports on-the-fly resizing via the w= parameter.
export function imageSrcSet(url) {
  if (typeof url !== "string" || !url.includes("images.unsplash.com")) return undefined;
  const base = url.replace(/([?&])w=\d+/, "$1").replace(/[?&]$/, "");
  const sep = base.includes("?") ? "&" : "?";
  return [400, 700, 1000].map((w) => `${base}${sep}w=${w}&auto=format&q=75 ${w}w`).join(", ");
}

export const SIZES = Array.from({ length: 11 }, (_, i) => i + 36); // EU 36–46

export const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "Unknown date"
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};
