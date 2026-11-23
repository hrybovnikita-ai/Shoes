"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { pool, resetDb, startServer, api, customer } = require("./helpers");
const { seedNikeColorways, validateCatalog, NIKE } = require("../lib/seedNike");

let server;
let base;
let originalRows;

const ORIGINAL_COLUMNS = "id, name, brand, category, price, old_price, color, rating, stock, image";

test.before(async () => {
  await resetDb(); // migrations 001–007 + the original 6-product demo catalog
  await pool.query("UPDATE shoes_products SET stock = 4 WHERE id = 2"); // an edit made in the DB
  originalRows = (await pool.query(`SELECT ${ORIGINAL_COLUMNS} FROM shoes_products ORDER BY id`)).rows;
  ({ server, base } = await startServer());
});
test.after(async () => {
  server.close();
  await pool.end();
});

test("catalog data: 25 unique Nike colorways, 5 per color family", () => {
  assert.deepEqual(validateCatalog(), []);
  assert.equal(NIKE.length, 25);
  const perColor = {};
  for (const p of NIKE) perColor[p.color] = (perColor[p.color] || 0) + 1;
  assert.deepEqual(perColor, { Purple: 5, Green: 5, Orange: 5, Yellow: 5, Black: 5 });
  assert.ok(NIKE.every((p) => p.brand === "Nike" && p.image.startsWith("https://cdn.shopify.com/")));
  assert.ok(validateCatalog([...NIKE, { ...NIKE[0], id: 999 }]).some((e) => e.includes("duplicate style code")));
});

test("seed inserts 25 rows once and never touches the original products", async () => {
  const first = await seedNikeColorways(pool);
  assert.equal(first.inserted.length, 25);
  assert.equal(first.skipped.length, 0);

  const second = await seedNikeColorways(pool);
  assert.equal(second.inserted.length, 0, "re-running is a no-op");
  assert.equal(second.skipped.length, 25);
  assert.ok(second.skipped.every((s) => s.reason === "already present"));

  assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM shoes_products")).rows[0].n, 31);
  const after = (await pool.query(`SELECT ${ORIGINAL_COLUMNS} FROM shoes_products WHERE id <= 6 ORDER BY id`)).rows;
  assert.deepEqual(after, originalRows, "original 6 products unchanged (including the edited stock)");
  const legacy = (await pool.query("SELECT style_code, colorway, description, sizes FROM shoes_products WHERE id <= 6")).rows;
  assert.ok(legacy.every((r) => r.style_code === null && r.colorway === null && r.description === null && r.sizes === null));
});

test("duplicate style codes are rejected by the database (case-insensitive)", async () => {
  await assert.rejects(
    pool.query(
      `INSERT INTO shoes_products (id, name, brand, category, price, stock, image, color, style_code)
       VALUES (900, 'Dup', 'Nike', 'Lifestyle', 100, 1, 'https://x.test/a.jpg', 'Purple', 'dd1391-104')`
    ),
    (err) => err.code === "23505"
  );
});

test("seed reports, and does not overwrite, a conflicting existing row", async () => {
  const fake = { ...NIKE[0], id: 950, styleCode: "ZZ0000-001" };
  await pool.query(
    `INSERT INTO shoes_products (id, name, brand, category, price, stock, image, color)
     VALUES (950, 'Someone else''s product', 'Other', 'Casual', 10, 1, 'https://x.test/b.jpg', 'Red')`
  );
  const r = await seedNikeColorways(pool, { list: [fake] });
  assert.equal(r.inserted.length, 0);
  assert.match(r.skipped[0].reason, /conflicts with existing row/);
  const row = (await pool.query("SELECT name, brand FROM shoes_products WHERE id = 950")).rows[0];
  assert.deepEqual(row, { name: "Someone else's product", brand: "Other" });
  await pool.query("DELETE FROM shoes_products WHERE id = 950"); // test-only cleanup of the test row
});

test("dry-run seed rolls back", async () => {
  const extra = { ...NIKE[0], id: 960, styleCode: "ZZ0000-002" };
  const r = await seedNikeColorways(pool, { list: [extra], dryRun: true });
  assert.deepEqual(r.inserted, [960]);
  assert.equal((await pool.query("SELECT 1 FROM shoes_products WHERE id = 960")).rowCount, 0);
});

test("GET /products?color= filters by color family (case-insensitive, comma list)", async () => {
  const purple = await api(base, "GET", "/products?color=purple");
  assert.equal(purple.status, 200);
  assert.equal(purple.body.count, 5);
  assert.ok(purple.body.products.every((p) => p.color === "Purple"));

  const multi = await api(base, "GET", "/products?color=Purple,BLACK");
  const blackTotal = (await pool.query("SELECT COUNT(*)::int AS n FROM shoes_products WHERE lower(color) = 'black'")).rows[0].n;
  assert.equal(multi.body.count, 5 + blackTotal);

  const all = await api(base, "GET", "/products?color=all");
  const none = await api(base, "GET", "/products");
  assert.equal(all.body.count, none.body.count);
  assert.equal(none.body.count, 31);

  const unknown = await api(base, "GET", "/products?color=teal");
  assert.equal(unknown.body.count, 0);

  for (const c of ["green", "orange", "yellow"]) {
    const r = await api(base, "GET", `/products?color=${c}`);
    assert.equal(r.body.count, 5, c);
  }
});

test("search matches style code and colorway; detail exposes the new fields", async () => {
  const byCode = await api(base, "GET", "/products?search=dd1391-104");
  assert.equal(byCode.body.count, 1);
  assert.equal(byCode.body.products[0].styleCode, "DD1391-104");
  const byColorway = await api(base, "GET", "/products?search=university%20gold");
  assert.ok(byColorway.body.products.some((p) => p.styleCode === "DM0029-103"));

  const detail = await api(base, "GET", "/products/101");
  assert.equal(detail.status, 200);
  assert.equal(detail.body.product.colorway, "Lilac/University Blue/Barely Grape/Black");
  assert.deepEqual(detail.body.product.sizes, [36, 37, 38, 39, 40, 41, 42]);
  assert.ok(detail.body.product.description.length > 20);

  const legacy = await api(base, "GET", "/products/1");
  for (const k of ["styleCode", "colorway", "description", "sizes"]) assert.ok(!(k in legacy.body.product), `no ${k} on legacy product`);
});

test("cart quote and demo order work for a new product and respect its size list", async () => {
  const ok = await api(base, "POST", "/cart/quote", { body: { items: [{ id: 103, size: 42, color: "Purple", quantity: 1 }] } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const bad = await api(base, "POST", "/cart/quote", { body: { items: [{ id: 101, size: 45, color: "Purple", quantity: 1 }] } });
  assert.equal(bad.status, 400);
  assert.match(bad.body.error || bad.body.message || "", /EU 45/);
  const legacy = await api(base, "POST", "/cart/quote", { body: { items: [{ id: 1, size: 36, color: "Red", quantity: 1 }] } });
  assert.equal(legacy.status, 200, "legacy products keep the full EU 36–46 range");

  const before = (await pool.query("SELECT stock FROM shoes_products WHERE id = 121")).rows[0].stock;
  const order = await api(base, "POST", "/orders", {
    body: { customer: customer(), items: [{ id: 121, size: 43, color: "Black", quantity: 1 }], promoCode: "", paymentMethod: "demo" },
  });
  assert.equal(order.status, 201, JSON.stringify(order.body));
  assert.equal((await pool.query("SELECT stock FROM shoes_products WHERE id = 121")).rows[0].stock, before - 1);
});
