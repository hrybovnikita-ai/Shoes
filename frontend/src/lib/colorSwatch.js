/** Map catalog color names to hex for accessible swatches (fallback: neutral gray). */
const NAMED = {
  black: "#141414",
  white: "#f4f4f4",
  red: "#c41e3a",
  navy: "#1a2a4a",
  blue: "#2563eb",
  grey: "#6b7280",
  gray: "#6b7280",
  green: "#16a34a",
  yellow: "#eab308",
  orange: "#ea580c",
  pink: "#ec4899",
  purple: "#9333ea",
  brown: "#78350f",
  beige: "#d4c4a8",
  cream: "#f5f0e6",
  gold: "#ca8a04",
  silver: "#9ca3af",
  multicolor: "conic-gradient(from 0deg, #e11d48, #eab308, #22c55e, #3b82f6, #a855f7, #e11d48)",
};

export function swatchStyle(name) {
  const key = String(name || "")
    .toLowerCase()
    .trim();
  if (!key) return { background: "#888" };
  if (NAMED[key]) {
    const v = NAMED[key];
    if (typeof v === "string" && v.includes("gradient")) return { background: v };
    return { background: v };
  }
  for (const [k, v] of Object.entries(NAMED)) {
    if (key.includes(k)) {
      if (typeof v === "string" && v.includes("gradient")) return { background: v };
      return { background: v };
    }
  }
  return { background: "#8a8a8a" };
}