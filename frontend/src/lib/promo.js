import { isValidPromoCode, normalizePromoCode } from "./pricing";

const KEY = "shoes-promo-v1";

export function getSavedPromo() {
  try {
    const c = normalizePromoCode(sessionStorage.getItem(KEY) || "");
    return c && isValidPromoCode(c) ? c : "";
  } catch {
    return "";
  }
}

export function savePromo(code) {
  try {
    if (code) sessionStorage.setItem(KEY, code);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
