// Runs against a LOCAL Postgres test database only.
const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");

const TEST_DB = process.env.TEST_DATABASE_URL || "postgres://shoes@127.0.0.1:55432/shoes_hotfix_test";
const u = new URL(TEST_DB);
if (!["127.0.0.1", "localhost"].includes(u.hostname) || !u.pathname.endsWith("_test")) {
  throw new Error("Refusing to run DB tests against a non-local or non-*_test database");
}
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = TEST_DB;
process.env.FIREBASE_PROJECT_ID = "demo-shoes";

const request = require("supertest");
const app = require("../app");
const { pool, initDb, getPool } = require("../db");
const fb = require("../firebaseAdmin");
const PROD = "https://shoes-red-alpha.vercel.app";

const fakeAuth = {
  async verifyIdToken(token) {
    const m = /^test-(\w+)$/.exec(token);
    if (!m) throw Object.assign(new Error("bad token"), { code: "auth/argument-error" });
    return { uid: `uid-${m[1]}`, email: `${m[1]}@example.test`, email_verified: true, firebase: { sign_in_provider: "password" } };
  },
};

before(async () => {
  await pool.query("DROP TABLE IF EXISTS shoes_orders, shoes_products CASCADE");
  await initDb();
  fb.__setAuthForTests(fakeAuth);
});
after(async () => getPool().end());

describe("API with database", () => {
  test("GET /api/products returns JSON products with CORS", async () => {
    const r = await request(app).get("/api/products").set("Origin", PROD);
    assert.equal(r.status, 200);
    assert.match(r.headers["content-type"], /application\/json/);
    assert.equal(r.headers["access-control-allow-origin"], PROD);
    assert.ok(Array.isArray(r.body.products) && r.body.products.length > 0, JSON.stringify(r.body).slice(0, 200));
  });

  test("GET /api/health healthy", async () => {
    const r = await request(app).get("/api/health");
    assert.equal(r.status, 200);
    assert.equal(r.body.database, "ok");
    assert.equal(r.body.auth, "configured");
  });

  test("GET /api/me verifies the token", async () => {
    assert.equal((await request(app).get("/api/me").set("Authorization", "Bearer nope")).status, 401);
    const r = await request(app).get("/api/me").set("Authorization", "Bearer test-alice");
    assert.equal(r.status, 200);
    assert.equal(r.body.user.uid, "uid-alice");
    assert.equal(r.body.user.provider, "password");
  });

  test("signed-in order is linked to the account and isolated per user", async () => {
    const products = (await request(app).get("/api/products")).body.products;
    const p = products.find((x) => x.stock > 0);
    const body = { customer: { name: "Alice Test", email: "alice@example.test" }, items: [{ id: p.id, quantity: 1, size: 42 }] };
    const created = await request(app).post("/api/orders").set("Authorization", "Bearer test-alice").send(body);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const mine = await request(app).get("/api/me/orders").set("Authorization", "Bearer test-alice");
    assert.equal(mine.status, 200);
    assert.ok(mine.body.orders.some((o) => o.id === created.body.order.id));
    const bobs = await request(app).get("/api/me/orders").set("Authorization", "Bearer test-bob");
    assert.ok(!bobs.body.orders.some((o) => o.id === created.body.order.id));
  });
});
