"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const be = require("../lib/pricing");

test("promo codes and shipping rules", () => {
  const t = be.calculateTotals([{ unitPriceCents: 15000, quantity: 1 }], "SHOES10");
  assert.deepEqual(
    [t.subtotalCents, t.discountCents, t.shippingCents, t.totalCents],
    [15000, 1500, 0, 13500],
    "free shipping is decided on the pre-discount subtotal"
  );
  const w = be.calculateTotals([{ unitPriceCents: 8500, quantity: 1 }], " welcome15 ");
  assert.deepEqual([w.discountCents, w.shippingCents, w.totalCents, w.promoCode], [1275, 1000, 8225, "WELCOME15"]);
  const none = be.calculateTotals([{ unitPriceCents: 14999, quantity: 1 }], "");
  assert.equal(none.shippingCents, 1000);
  assert.equal(be.calculateTotals([], "SHOES10").totalCents, 0);
  assert.equal(be.isValidPromoCode("NOPE"), false);
  assert.equal(be.isValidPromoCode(""), true);
  assert.equal(be.calculateTotals([{ unitPriceCents: 1000, quantity: 1 }], "NOPE").discountCents, 0);
});

test("half-cent discounts round consistently", () => {
  // 3 x $13.35 = $40.05 -> 15% = 600.75 cents -> 601
  const t = be.calculateTotals([{ unitPriceCents: 1335, quantity: 3 }], "WELCOME15");
  assert.equal(t.discountCents, 601);
  assert.equal(be.toCents(19.99), 1999);
  assert.equal(be.toCents("0.1") + be.toCents("0.2"), 30);
});

test("frontend pricing module produces identical results (parity)", async () => {
  const fe = await import(pathToFileURL(path.join(__dirname, "../../frontend/src/lib/pricing.js")).href);
  assert.deepEqual(fe.PROMO_CODES, be.PROMO_CODES);
  assert.equal(fe.FREE_SHIPPING_THRESHOLD_CENTS, be.FREE_SHIPPING_THRESHOLD_CENTS);
  assert.equal(fe.SHIPPING_FEE_CENTS, be.SHIPPING_FEE_CENTS);
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const codes = ["", "SHOES10", "WELCOME15", "shoes10", "BAD"];
  for (let i = 0; i < 2000; i += 1) {
    const lines = Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => ({
      unitPriceCents: Math.floor(rnd() * 30000),
      quantity: 1 + Math.floor(rnd() * 10),
    }));
    const code = codes[i % codes.length];
    assert.deepEqual(fe.calculateTotals(lines, code), be.calculateTotals(lines, code));
  }
});
