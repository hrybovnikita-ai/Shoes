"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { products } = require("../data/catalog");

test("catalog has 50 unique demo products", () => {
  assert.equal(products.length, 50);
  const ids = new Set(products.map((p) => p.id));
  const slugs = new Set(products.map((p) => p.slug));
  const brands = new Set(products.map((p) => p.brand));
  assert.equal(ids.size, 50);
  assert.equal(slugs.size, 50);
  assert.ok(brands.size >= 10);
  assert.ok(products.every((p) => p.image && p.description && p.materials && p.sizeEu.length));
});