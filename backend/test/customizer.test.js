"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { pool, resetDb, startServer, api, tokenFor, customer } = require("./helpers");

let server;
let base;
const alice = tokenFor("firebase", "customizer-alice", "alice-custom@example.test");

test.before(async () => {
  await resetDb();
  ({ server, base } = await startServer());
});

test.after(async () => {
  server?.close();
  await pool.end();
});

const design = {
  upperColor: "#112233",
  soleColor: "#fafafa",
  laceColor: "#000000",
  heelColor: "#b7ff35",
  material: "leather",
};

test("customizer options, quote, save design, and priced checkout line", async () => {
  const meta = await api(base, "GET", "/products/1/customizer");
  assert.equal(meta.status, 200);
  assert.equal(meta.body.product.customizable, true);

  const quote = await api(base, "POST", "/customizer/quote", { body: { productId: 1, design } });
  assert.equal(quote.status, 200);
  assert.ok(quote.body.unitPriceCents > 15000);

  const save = await api(base, "POST", "/me/designs", {
    token: alice,
    body: { productId: 1, name: "Leather flare", design },
  });
  assert.equal(save.status, 201);
  const designId = save.body.design.id;

  const cartQuote = await api(base, "POST", "/cart/quote", {
    token: alice,
    body: {
      items: [{ id: 1, size: 42, color: "Red", quantity: 1, designId }],
    },
  });
  assert.equal(cartQuote.status, 200);
  assert.ok(cartQuote.body.lines[0].unitPriceCents > 15000);

  const order = await api(base, "POST", "/orders", {
    token: alice,
    body: {
      customer: customer({ email: "alice-custom@example.test" }),
      items: [{ id: 1, size: 42, color: "Red", quantity: 1, designId }],
      paymentMethod: "demo",
    },
  });
  assert.equal(order.status, 201);
  assert.ok(order.body.order.items[0].designId);
});