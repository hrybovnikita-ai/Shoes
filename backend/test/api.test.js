"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { pool, resetDb, startServer, api, tokenFor, customer } = require("./helpers");
const email = require("../email");

let server;
let base;
const alice = tokenFor("firebase", "fb-alice", "alice@example.test");
const bob = tokenFor("firebase", "fb-bob", "bob@example.test");

test.before(async () => {
  await resetDb();
  ({ server, base } = await startServer());
});
test.after(async () => {
  server.close();
  await pool.end();
});

const order = (over = {}) => ({
  customer: customer(),
  items: [{ id: 5, size: 40, color: "Red", quantity: 2 }],
  promoCode: "",
  paymentMethod: "demo",
  ...over,
});

test("health, config and API index", async () => {
  const h = await api(base, "GET", "/health");
  assert.equal(h.status, 200);
  assert.equal(h.body.status, "healthy");
  assert.equal(h.body.pendingMigrations, 0);
  const c = await api(base, "GET", "/config");
  assert.equal(c.body.features.stripeCheckout, false);
  assert.equal(c.body.features.demoCheckout, true);
  assert.equal(c.body.pricing.freeShippingThresholdCents, 15000);
  assert.equal(h.headers.get("x-content-type-options"), "nosniff");
  const nf = await api(base, "GET", "/nope");
  assert.equal(nf.status, 404);
});

test("product listing, search, filters, sorting, details, related", async () => {
  const all = await api(base, "GET", "/products");
  assert.equal(all.body.count, 70);
  const s = await api(base, "GET", "/products?search=jordan");
  assert.ok(s.body.products.some((p) => /jordan/i.test(p.name)));
  const cat = await api(base, "GET", "/products?category=Running");
  assert.ok(cat.body.products.length >= 2);
  assert.ok(cat.body.products.every((p) => p.category === "Running"));
  const asc = await api(base, "GET", "/products?sort=price-asc");
  const prices = asc.body.products.map((p) => p.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  const range = await api(base, "GET", "/products?minPrice=100&maxPrice=160");
  assert.ok(range.body.products.every((p) => p.price >= 100 && p.price <= 160));
  const one = await api(base, "GET", "/products/3");
  assert.equal(one.body.product.name, "Nike Air Jordan");
  assert.equal(one.body.product.brand, "Jordan");
  assert.equal((await api(base, "GET", "/products/999")).status, 404);
  assert.equal((await api(base, "GET", "/products/abc")).status, 404);
  const rel = await api(base, "GET", "/products/3/related");
  assert.equal(rel.body.products.length, 4);
  assert.ok(!rel.body.products.some((p) => p.id === 3));
  assert.ok(rel.body.products.every((p) => p.category === "Basketball" || p.brand === "Jordan"));
});

test("cart quote uses DB prices and validates promo codes", async () => {
  const q = await api(base, "POST", "/cart/quote", {
    body: { items: [{ id: 1, size: 42, quantity: 1, price: 0.01 }], promoCode: "WELCOME15" },
  });
  assert.equal(q.status, 200);
  assert.deepEqual(
    [q.body.totals.subtotalCents, q.body.totals.discountCents, q.body.totals.shippingCents, q.body.totals.totalCents],
    [15000, 2250, 0, 12750]
  );
  assert.equal((await api(base, "POST", "/cart/quote", { body: { items: [{ id: 1, size: 42, quantity: 1 }], promoCode: "FREE100" } })).status, 400);
  assert.equal((await api(base, "POST", "/cart/quote", { body: { items: [{ id: 1, size: 13, quantity: 1 }] } })).status, 400);
  assert.equal((await api(base, "POST", "/cart/quote", { body: { items: [{ id: 1, size: 42, quantity: 11 }] } })).status, 400);
  assert.equal((await api(base, "POST", "/cart/quote", { body: { items: [{ id: 1, size: 42, quantity: 1, color: "Purple" }] } })).status, 400);
  assert.equal((await api(base, "POST", "/cart/quote", { body: "{bad", headers: { "Content-Type": "application/json" } })).status, 400);
});

test("guest demo order: server pricing, stock, receipt token, PDF, cancel", async () => {
  const before = (await api(base, "GET", "/products/5")).body.product.stock;
  const r = await api(base, "POST", "/orders", { body: order({ promoCode: "shoes10", items: [{ id: 5, size: 40, quantity: 2, price: 1 }] }) });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const o = r.body.order;
  assert.match(o.id, /^SH-/);
  assert.deepEqual([o.subtotal, o.discount, o.shipping, o.total], [170, 17, 0, 153]);
  assert.equal(o.promoCode, "SHOES10");
  assert.equal(o.status, "DEMO_CONFIRMED");
  assert.equal(o.paymentStatus, "demo");
  assert.equal(o.paymentProcessed, false);
  assert.equal(o.items[0].image.startsWith("/images/products/"), true);
  assert.equal((await api(base, "GET", "/products/5")).body.product.stock, before - 2);

  const tok = r.body.receiptToken;
  assert.equal((await api(base, "GET", `/orders/${o.id}`)).status, 403);
  assert.equal((await api(base, "GET", `/orders/${o.id}`, { headers: { "x-receipt-token": "0".repeat(64) } })).status, 403);
  const got = await api(base, "GET", `/orders/${o.id}`, { headers: { "x-receipt-token": tok } });
  assert.equal(got.status, 200);
  assert.equal(got.body.receipt.shippingAddress.city, "Kyiv");
  assert.equal((await api(base, "GET", `/orders/${o.id}`, { token: alice })).status, 403, "other users cannot read guest orders");

  const pdf = await api(base, "GET", `/orders/${o.id}/receipt`, { headers: { "x-receipt-token": tok }, raw: true });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  const bytes = Buffer.from(await pdf.arrayBuffer());
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");

  const c = await api(base, "PATCH", `/orders/${o.id}/cancel`, { headers: { "x-receipt-token": tok } });
  assert.equal(c.status, 200);
  assert.equal(c.body.status, "DEMO_CANCELLED");
  assert.equal((await api(base, "GET", "/products/5")).body.product.stock, before, "restocked");
  assert.equal((await api(base, "PATCH", `/orders/${o.id}/cancel`, { headers: { "x-receipt-token": tok } })).status, 409);
});

test("checkout validation returns field errors", async () => {
  const r = await api(base, "POST", "/orders", {
    body: order({ customer: customer({ email: "nope", phone: "x", shippingAddress: { street: "", city: "", country: "", postalCode: "!" } }) }),
  });
  assert.equal(r.status, 400);
  assert.deepEqual(Object.keys(r.body.fields).sort(), ["city", "country", "email", "phone", "postalCode", "street"]);
  assert.equal((await api(base, "POST", "/orders", { body: order({ items: [] }) })).status, 400);
  assert.equal((await api(base, "POST", "/orders", { body: order({ promoCode: "HACK" }) })).status, 400);
  assert.equal((await api(base, "POST", "/orders", { body: order({ items: [{ id: 1, size: 42, quantity: 10 }, { id: 1, size: 43, quantity: 10 }, { id: 1, size: 44, quantity: 10 }] }) })).status, 409, "stock enforced");
  assert.equal((await api(base, "POST", "/orders", { body: order({ paymentMethod: "stripe" }) })).status, 503, "stripe disabled without keys");
});

test("auth: missing/invalid tokens are rejected on protected routes", async () => {
  assert.equal((await api(base, "GET", "/me/orders")).status, 401);
  assert.equal((await api(base, "GET", "/me/orders", { token: "garbage-token-123" })).status, 401);
  assert.equal((await api(base, "GET", "/me/orders", { headers: { Authorization: "Basic abc" } })).status, 401);
  assert.equal((await api(base, "POST", "/orders", { body: order(), headers: { Authorization: "Bearer bad-token-xyz" } })).status, 401);
});

test("signed-in orders appear in My Orders, isolated per user (zero-orders fix)", async () => {
  const mism = await api(base, "POST", "/orders", { token: alice, body: order() });
  assert.equal(mism.status, 403, "order email must match account");

  const a = await api(base, "POST", "/orders", { token: alice, body: order({ customer: customer({ email: "Alice@Example.test" }) }) });
  assert.equal(a.status, 201);
  const mine = await api(base, "GET", "/me/orders", { token: alice });
  assert.equal(mine.status, 200);
  assert.equal(mine.body.count, 1);
  assert.equal(mine.body.orders[0].id, a.body.order.id);
  assert.match(mine.body.orders[0].items[0].name, /Converse/i);

  const theirs = await api(base, "GET", "/me/orders", { token: bob });
  assert.equal(theirs.body.count, 0);
  assert.equal((await api(base, "GET", `/orders/${a.body.order.id}`, { token: bob })).status, 403);
  assert.equal((await api(base, "GET", `/me/orders/${a.body.order.id}`, { token: bob })).status, 403);
  assert.equal((await api(base, "GET", `/orders/${a.body.order.id}`, { token: alice })).status, 200, "owner reads without receipt token");
  assert.equal((await api(base, "GET", `/orders/${a.body.order.id}/receipt`, { token: alice, raw: true })).status, 200);
  assert.equal((await api(base, "PATCH", `/orders/${a.body.order.id}/cancel`, { token: bob })).status, 403);
  const me = await api(base, "GET", "/me", { token: alice });
  assert.equal(me.body.user.providers.firebase, true);
  assert.equal(me.body.user.providers.clerk, false);
});

test("legacy orders (firebase_uid only, no user_id) are still found", async () => {
  await pool.query(
    `INSERT INTO shoes_orders (id, firebase_uid, customer_name, customer_email, items, subtotal, shipping, total, status, receipt_token_hash)
     VALUES ('SH-00000000-0000-4000-8000-000000000001','fb-carol','C','carol@example.test','[]',10,10,20,'DEMO_CONFIRMED','ab')`
  );
  const r = await api(base, "GET", "/me/orders", { token: tokenFor("firebase", "fb-carol", "carol@example.test") });
  assert.equal(r.body.count, 1);
});

test("favorites: merge never loses entries, add/remove, per user", async () => {
  const m = await api(base, "PUT", "/me/favorites", { token: alice, body: { productIds: [2, 4, 999, "x"] } });
  assert.deepEqual(m.body.productIds.sort(), [2, 4]);
  const m2 = await api(base, "PUT", "/me/favorites", { token: alice, body: { productIds: [1] } });
  assert.deepEqual(m2.body.productIds.sort(), [1, 2, 4]);
  const d = await api(base, "DELETE", "/me/favorites/2", { token: alice });
  assert.deepEqual(d.body.productIds.sort(), [1, 4]);
  assert.equal((await api(base, "POST", "/me/favorites/999", { token: alice })).status, 404);
  assert.deepEqual((await api(base, "GET", "/me/favorites", { token: bob })).body.productIds, []);
  assert.equal((await api(base, "GET", "/me/favorites")).status, 401);
});

test("reviews: auth required, validated, verified-purchase flag, one per user", async () => {
  assert.equal((await api(base, "POST", "/products/5/reviews", { body: { rating: 5, body: "Great shoes, comfy." } })).status, 401);
  assert.equal((await api(base, "POST", "/products/5/reviews", { token: alice, body: { rating: 7, body: "Great shoes, comfy." } })).status, 400);
  const r = await api(base, "POST", "/products/5/reviews", { token: alice, body: { rating: 5, title: "Love", body: "Great shoes, comfy." } });
  assert.equal(r.status, 201);
  assert.equal(r.body.review.verifiedPurchase, true);
  const r2 = await api(base, "POST", "/products/5/reviews", { token: bob, body: { rating: 3, body: "Okay for the price." } });
  assert.equal(r2.body.review.verifiedPurchase, false);
  await api(base, "POST", "/products/5/reviews", { token: alice, body: { rating: 4, body: "Updated: still good." } });
  const list = await api(base, "GET", "/products/5/reviews");
  assert.equal(list.body.count, 2);
  assert.equal(list.body.average, 3.5);
  const p = await api(base, "GET", "/products/5");
  assert.equal(p.body.product.reviewCount, 2);
});

test("identity linking requires both sign-ins and merges a new Clerk profile into the Firebase owner", async () => {
  const clerkAlice = tokenFor("clerk", "user_clerk_alice", "alice@example.test");
  // New Clerk sign-in gets its own empty profile — NOT auto-linked by email.
  const fresh = await api(base, "GET", "/me/orders", { token: clerkAlice });
  assert.equal(fresh.body.count, 0, "no silent linking by e-mail");
  await api(base, "PUT", "/me/favorites", { token: clerkAlice, body: { productIds: [6] } });

  assert.equal((await api(base, "POST", "/me/link-identity", { token: clerkAlice, body: { token: "bogus-token-123" } })).status, 401);
  assert.equal((await api(base, "POST", "/me/link-identity", { token: clerkAlice, body: { token: clerkAlice } })).status, 400);

  const link = await api(base, "POST", "/me/link-identity", { token: clerkAlice, body: { token: alice } });
  assert.equal(link.status, 200, JSON.stringify(link.body));
  assert.equal(link.body.user.providers.firebase, true);
  assert.equal(link.body.user.providers.clerk, true);

  const viaClerk = await api(base, "GET", "/me/orders", { token: clerkAlice });
  assert.equal(viaClerk.body.count, 1, "Clerk session now sees the Firebase-owned order");
  const favs = await api(base, "GET", "/me/favorites", { token: alice });
  assert.deepEqual(favs.body.productIds.sort(), [1, 4, 6], "favorites unioned");
  const merged = await pool.query("SELECT * FROM shoes_users WHERE merged_into IS NOT NULL");
  assert.equal(merged.rowCount, 1, "folded profile is kept, not deleted");

  const again = await api(base, "POST", "/me/link-identity", { token: alice, body: { token: clerkAlice } });
  assert.equal(again.body.alreadyLinked, true);
  const bobLink = await api(base, "POST", "/me/link-identity", { token: bob, body: { token: clerkAlice } });
  assert.equal(bobLink.status, 409, "cannot steal an identity linked elsewhere");
});

test("guest order claim: disabled without e-mail, works with an e-mailed code", async () => {
  const g = await api(base, "POST", "/orders", { body: order({ customer: customer({ email: "dave@example.test" }) }) });
  assert.equal(g.status, 201, JSON.stringify(g.body));
  const id = g.body.order.id;
  const dave = tokenFor("firebase", "fb-dave", "dave@example.test");
  assert.equal((await api(base, "POST", "/me/orders/claim/request", { token: dave, body: { orderId: id } })).status, 503);

  const sent = [];
  email.__setTestSender(async (m) => {
    sent.push(m);
    return { sent: true, id: "test" };
  });
  try {
    const req1 = await api(base, "POST", "/me/orders/claim/request", { token: dave, body: { orderId: id } });
    assert.equal(req1.status, 200);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "dave@example.test");
    const code = /: (\d{6}) \(expires/.exec(sent[0].text)[1];
    const wrong = code === "000000" ? "111111" : "000000";
    assert.equal((await api(base, "POST", "/me/orders/claim/confirm", { token: dave, body: { orderId: id, code: wrong } })).status, 400);
    assert.equal((await api(base, "POST", "/me/orders/claim/confirm", { token: bob, body: { orderId: id, code } })).status, 400, "code bound to requester");
    const ok = await api(base, "POST", "/me/orders/claim/confirm", { token: dave, body: { orderId: id, code } });
    assert.equal(ok.status, 200);
    assert.equal((await api(base, "GET", "/me/orders", { token: dave })).body.count, 1);
    assert.equal((await api(base, "POST", "/me/orders/claim/confirm", { token: dave, body: { orderId: id, code } })).status, 400, "single use");
  } finally {
    email.__setTestSender(null);
  }
});

test("rate limiter returns 429 after the window budget", async () => {
  const { rateLimit } = require("../lib/rateLimit");
  const prev = process.env.RATE_LIMIT_DISABLED;
  delete process.env.RATE_LIMIT_DISABLED;
  test.after(() => { if (prev !== undefined) process.env.RATE_LIMIT_DISABLED = prev; });
  const mw = rateLimit({ name: "t", windowMs: 60_000, max: 2 });
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(s) { this.code = s; return this; }, json(b) { this.body = b; return this; } };
  const req = { get: () => "9.9.9.9", ip: "9.9.9.9" };
  let passed = 0;
  for (let i = 0; i < 3; i += 1) mw(req, res, () => passed++);
  assert.equal(passed, 2);
  assert.equal(res.code, 429);
});

test("newsletter stores e-mails once, validates input", async () => {
  assert.equal((await api(base, "POST", "/newsletter", { body: { email: "bad" } })).status, 400);
  assert.equal((await api(base, "POST", "/newsletter", { body: { email: "News@Example.test" } })).status, 201);
  assert.equal((await api(base, "POST", "/newsletter", { body: { email: "news@example.test" } })).status, 201);
  const n = await pool.query("SELECT COUNT(*)::int n FROM shoes_newsletter_subscribers");
  assert.equal(n.rows[0].n, 1);
});
