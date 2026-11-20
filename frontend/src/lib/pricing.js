// SHOES pricing rules — ES-module copy of backend/lib/pricing.js.
// Keep the two files identical in logic; backend/test/pricing-parity.test.js
// asserts both produce the same numbers. The backend always re-prices orders.
//
// All amounts are INTEGER CENTS.
// Rules:
//   - Promo codes: SHOES10 = 10 %, WELCOME15 = 15 % off the merchandise subtotal.
//   - Discount = round(subtotal * percent / 100) (half-up to the nearest cent).
//   - Shipping is decided on the PRE-DISCOUNT subtotal:
//       subtotal >= $150.00 -> free, otherwise $10.00. An empty cart ships free.
//   - total = subtotal - discount + shipping (never below 0).

const PROMO_CODES = Object.freeze({ SHOES10: 10, WELCOME15: 15 });
const FREE_SHIPPING_THRESHOLD_CENTS = 15000;
const SHIPPING_FEE_CENTS = 1000;
const MAX_QUANTITY_PER_LINE = 10;

function normalizePromoCode(code) {
  if (typeof code !== "string") return "";
  return code.trim().toUpperCase();
}

function promoPercent(code) {
  const c = normalizePromoCode(code);
  return Object.prototype.hasOwnProperty.call(PROMO_CODES, c) ? PROMO_CODES[c] : 0;
}

function isValidPromoCode(code) {
  const c = normalizePromoCode(code);
  return c === "" || Object.prototype.hasOwnProperty.call(PROMO_CODES, c);
}

function toCents(dollars) {
  const n = Number(dollars);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToDollars(cents) {
  return Math.round(Number(cents) || 0) / 100;
}

function formatCents(cents) {
  const value = (Math.round(Number(cents) || 0) / 100).toFixed(2);
  return `$${value}`;
}

// lines: [{ unitPriceCents, quantity }]
function calculateTotals(lines, promoCode) {
  const safe = Array.isArray(lines) ? lines : [];
  let subtotalCents = 0;
  let itemCount = 0;
  for (const line of safe) {
    const price = Math.max(0, Math.round(Number(line && line.unitPriceCents) || 0));
    const qty = Math.max(0, Math.floor(Number(line && line.quantity) || 0));
    subtotalCents += price * qty;
    itemCount += qty;
  }
  const percent = promoPercent(promoCode);
  const discountCents = Math.round((subtotalCents * percent) / 100);
  const shippingCents =
    subtotalCents === 0 || subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FEE_CENTS;
  const totalCents = Math.max(0, subtotalCents - discountCents + shippingCents);
  return {
    itemCount,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents,
    promoCode: percent ? normalizePromoCode(promoCode) : "",
    promoPercent: percent,
    freeShippingRemainingCents: Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents),
  };
}

export {
  PROMO_CODES,
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FEE_CENTS,
  MAX_QUANTITY_PER_LINE,
  normalizePromoCode,
  promoPercent,
  isValidPromoCode,
  toCents,
  centsToDollars,
  formatCents,
  calculateTotals,
};
