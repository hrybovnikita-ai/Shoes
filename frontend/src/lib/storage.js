// localStorage helpers with cross-tab (storage event) and in-app
// (CustomEvent) change notifications.
export const KEYS = {
  cart: "shoes-cart-v2",
  legacyCart: "shoes_cart",
  favorites: "shoes-favorites-v2", // existing format: JSON array of product ids
  recent: "shoes-recently-viewed-v1",
  theme: "shoes-theme",
  buyNow: "shoes-buy-now-v1", // sessionStorage
};

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const value = JSON.parse(raw);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    const raw = JSON.stringify(value);
    if (localStorage.getItem(key) === raw) return;
    localStorage.setItem(key, raw);
    window.dispatchEvent(new CustomEvent("shoes:storage", { detail: { key } }));
  } catch {
    /* storage full or blocked (private mode) — keep in memory only */
  }
}

export function subscribe(key, callback) {
  const onStorage = (e) => {
    if (e.key === key) callback();
  };
  const onLocal = (e) => {
    if (e.detail?.key === key) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("shoes:storage", onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("shoes:storage", onLocal);
  };
}

// Favorites keep the existing shoes-favorites-v2 format (array of ids). Ids
// are normalized to numbers when numeric, without dropping unknown entries.
export function normalizeFavorites(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const v of value) {
    const id = typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v;
    if ((typeof id === "number" && Number.isFinite(id)) || typeof id === "string") {
      if (!out.includes(id)) out.push(id);
    }
  }
  return out;
}
