"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { products } = require("../data/catalog");

test("catalog has 70 unique demo products", () => {
  assert.equal(products.length, 70);
  const ids = new Set(products.map((p) => p.id));
  const slugs = new Set(products.map((p) => p.slug));
  const brands = new Set(products.map((p) => p.brand));
  assert.equal(ids.size, 70);
  assert.equal(slugs.size, 70);
  assert.ok(brands.size >= 10);
  assert.ok(products.every((p) => p.image && p.description && p.materials && p.sizeEu.length));
});