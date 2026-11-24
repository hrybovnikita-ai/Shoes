"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { pool, resetDb, startServer, api, tokenFor, customer } = require("./helpers");
const { expire } = require("../commerce/inventory");
const notifications = require("../commerce/notifications");
const search = require("../commerce/search");

let server;
let base;
const alice = tokenFor("firebase", "commerce-alice", "alice-commerce@example.test");
const admin = tokenFor("firebase", "commerce-admin", "admin-commerce@example.test");

test.before(async () => {
  await resetDb();
  ({ server, base } = await startServer());
  await api(base, "GET", "/admin/me", { token: admin });
  await pool.query("UPDATE shoes_users SET role = 'admin' WHERE firebase_uid = 'commerce-admin'");
});

test.after(async () => {
  server?.close();
  await pool.end();
});

test("size guide recommends by foot length and saves user preferences", async () => {
  const guide = await api(base, "GET", "/size-guide?brand=generic&footCm=25");
  assert.equal(guide.status, 200);
  assert.ok(guide.body.chart.length >= 10);
  assert.equal(guide.body.recommendation.eu, 40);

  const save = await api(base, "PUT", "/me/sizes", {
    token: alice,
    body: { brand: "Nike", eu: 42, footCm: 26.5, system: "EU" },
  });
  assert.equal(save.status, 200);
  const prefs = await api(base, "GET", "/me/sizes", { token: alice });
  assert.equal(prefs.body.preferences.length, 1);
  assert.equal(prefs.body.preferences[0].brand, "nike");
  assert.equal(Number(prefs.body.preferences[0].eu), 42);
});

test("managed inventory, reservations, and oversell protection", async () => {
  const productId = 5;
  const color = "Black";
  const size = 40;
  await pool.query("DELETE FROM shoes_variants WHERE product_id = $1", [productId]);
  await pool.query("UPDATE shoes_products SET stock = 2, color = $2, inventory_managed = FALSE WHERE id = $1", [productId, color]);

  const alloc = await api(base, "PUT", `/admin/inventory/${productId}`, {
    token: admin,
    body: { size, color, stock: 2, version: 0, activate: true },
  });
  assert.equal(alloc.status, 200);

  const inv = await api(base, "GET", `/products/${productId}/inventory`);
  assert.equal(inv.body.managed, true);
  assert.equal(inv.body.variants[0].available, 2);

  const key1 = crypto.randomUUID();
  const key2 = crypto.randomUUID();
  const line = [{ id: productId, size, color, quantity: 1 }];
  const r1 = await api(base, "POST", "/reservations", { body: { key: key1, items: line } });
  const r2 = await api(base, "POST", "/reservations", { body: { key: key2, items: line } });
  assert.equal(r1.status, 201);
  assert.equal(r2.status, 201);

  const inv2 = await api(base, "GET", `/products/${productId}/inventory`);
  assert.equal(inv2.body.variants[0].available, 0);

  const r3 = await api(base, "POST", "/reservations", {
    body: { key: crypto.randomUUID(), items: line },
  });
  assert.equal(r3.status, 409);

  await pool.query("UPDATE shoes_reservations SET expires_at = NOW() - INTERVAL '1 minute' WHERE status = 'active'");
  assert.ok((await expire()) >= 2);
  const inv3 = await api(base, "GET", `/products/${productId}/inventory`);
  assert.equal(inv3.body.variants[0].available, 2);
});

test("price history, alerts, and notification discovery", async () => {
  const productId = 1;
  const before = (await pool.query("SELECT price FROM shoes_products WHERE id=$1", [productId])).rows[0].price;
  const mid = Number(before) - 5;

  const watch = await api(base, "PUT", `/me/price-alerts/${productId}`, {
    token: alice,
    body: { targetPrice: mid },
  });
  assert.equal(watch.status, 200);

  await pool.query("UPDATE shoes_products SET old_price = price, price = $2 WHERE id = $1", [productId, mid]);
  await pool.query("UPDATE shoes_products SET old_price = price, price = $2 WHERE id = $1", [productId, mid - 10]);

  const history = await api(base, "GET", `/products/${productId}/prices`);
  assert.ok(history.body.history.length >= 2);
  const latest = history.body.history.at(-1);
  assert.ok(Number(latest.price) < Number(before));

  const watchHigh = await api(base, "PUT", `/me/price-alerts/${productId}`, {
    token: alice,
    body: { targetPrice: Number(latest.price) + 5 },
  });
  assert.equal(watchHigh.status, 400);

  await notifications.discover();
  const rows = await pool.query(
    `SELECT COUNT(*)::int n FROM shoes_price_notifications n
     JOIN shoes_price_alerts a ON a.id = n.alert_id WHERE a.user_id = (SELECT id FROM shoes_users WHERE firebase_uid = 'commerce-alice')`
  );
  assert.ok(rows.rows[0].n >= 1);

  const alerts = await api(base, "GET", "/me/price-alerts", { token: alice });
  assert.equal(alerts.body.alerts.filter((a) => a.active).length, 1);
  assert.ok(alerts.body.notifications.length >= 1);
});

test("search falls back to PostgreSQL and supports filters", async () => {
  const jordan = await api(base, "GET", "/search?q=jordn&limit=10");
  assert.equal(jordan.status, 200);
  assert.equal(jordan.body.engine, "postgresql");
  assert.ok(jordan.body.products.some((p) => /jordan/i.test(p.name)));

  const filtered = await api(base, "GET", "/search?category=Running&sort=price-asc&inStock=true&limit=20");
  assert.equal(filtered.status, 200);
  assert.ok(filtered.body.products.every((p) => p.category === "Running"));
  const prices = filtered.body.products.map((p) => p.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));

  const fallback = await search.search({ q: "nike", limit: 5, sort: "featured" });
  assert.equal(fallback.engine, "postgresql");
  assert.ok(fallback.products.length > 0);
});

test("checkout consumes an active reservation", async () => {
  const productId = 2;
  const size = 42;
  const color = (await pool.query("SELECT color FROM shoes_products WHERE id=$1", [productId])).rows[0].color;
  const key = crypto.randomUUID();

  await api(base, "POST", "/reservations", {
    body: { key, items: [{ id: productId, size, color, quantity: 1 }] },
  });

  const order = await api(base, "POST", "/orders", {
    body: {
      customer: customer(),
      items: [{ id: productId, size, color, quantity: 1 }],
      paymentMethod: "demo",
      reservationKey: key,
    },
  });
  assert.equal(order.status, 201);
  const consumed = await pool.query("SELECT status FROM shoes_reservations WHERE id=$1", [key]);
  assert.equal(consumed.rows[0].status, "consumed");
});