const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

process.env.NODE_ENV = "test";
delete process.env.DATABASE_URL;
delete process.env.FIREBASE_PROJECT_ID;
delete process.env.GOOGLE_CLOUD_PROJECT;
delete process.env.GCLOUD_PROJECT;
process.env.FRONTEND_URL = "https://my-shop.example.com/"; // trailing slash on purpose

const request = require("supertest");
const app = require("../app");
const cors = require("../cors");
const PROD = "https://shoes-red-alpha.vercel.app";

describe("startup", () => {
  test("app loads with no env vars at all", () => {
    assert.equal(typeof app, "function");
  });

  test("app + firebase-admin/auth load WITHOUT require(esm) (as on Vercel's runtime loader)", () => {
    const r = spawnSync(
      process.execPath,
      ["--no-experimental-require-module", "-e", "require('./app'); require('firebase-admin/auth'); console.log('OK')"],
      { cwd: path.join(__dirname, ".."), env: { PATH: process.env.PATH }, encoding: "utf8" }
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /OK/);
  });
});

describe("CORS", () => {
  test("normalizes origins (trim, trailing slash, case)", () => {
    assert.equal(cors.normalizeOrigin(" https://Shoes-Red-Alpha.vercel.app/ "), PROD);
    assert.ok(cors.isAllowedOrigin(PROD));
    assert.ok(cors.isAllowedOrigin("https://my-shop.example.com"));
    assert.ok(cors.isAllowedOrigin("http://localhost:5173"));
    assert.ok(!cors.isAllowedOrigin("https://evil.example"));
    assert.ok(cors.isAllowedOrigin("https://a.example", { CORS_ORIGINS: "https://a.example/, https://b.example" }));
  });

  test("preflight from production origin -> 204 with methods/headers, no credentials", async () => {
    const r = await request(app)
      .options("/api/products")
      .set("Origin", PROD)
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "authorization,content-type");
    assert.equal(r.status, 204);
    assert.equal(r.headers["access-control-allow-origin"], PROD);
    for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) assert.match(r.headers["access-control-allow-methods"], new RegExp(m));
    assert.match(r.headers["access-control-allow-headers"], /Authorization/);
    assert.match(r.headers["access-control-allow-headers"], /Content-Type/);
    assert.equal(r.headers["access-control-allow-credentials"], undefined);
    assert.match(r.headers.vary, /Origin/);
  });

  test("preflight for protected route with Authorization header", async () => {
    const r = await request(app)
      .options("/api/me/orders")
      .set("Origin", PROD)
      .set("Access-Control-Request-Method", "GET")
      .set("Access-Control-Request-Headers", "authorization");
    assert.equal(r.status, 204);
    assert.equal(r.headers["access-control-allow-origin"], PROD);
  });

  test("FRONTEND_URL with trailing slash is honored", async () => {
    const r = await request(app).options("/api/products").set("Origin", "https://my-shop.example.com").set("Access-Control-Request-Method", "GET");
    assert.equal(r.headers["access-control-allow-origin"], "https://my-shop.example.com");
  });

  test("unknown origin gets no ACAO (browser blocks) but no crash", async () => {
    const r = await request(app).options("/api/products").set("Origin", "https://evil.example").set("Access-Control-Request-Method", "GET");
    assert.equal(r.status, 204);
    assert.equal(r.headers["access-control-allow-origin"], undefined);
  });

  test("CORS headers are present on 404 JSON", async () => {
    const r = await request(app).get("/api/does-not-exist").set("Origin", PROD);
    assert.equal(r.status, 404);
    assert.match(r.headers["content-type"], /json/);
    assert.equal(r.headers["access-control-allow-origin"], PROD);
  });
});

describe("degraded mode (no DATABASE_URL / FIREBASE_PROJECT_ID)", () => {
  test("GET /api/products -> 503 JSON with CORS, not a crash", async () => {
    const r = await request(app).get("/api/products").set("Origin", PROD);
    assert.equal(r.status, 503);
    assert.match(r.headers["content-type"], /json/);
    assert.equal(r.headers["access-control-allow-origin"], PROD);
    assert.equal(r.body.success, false);
  });

  test("GET /api/health reports not_configured", async () => {
    const r = await request(app).get("/api/health").set("Origin", PROD);
    assert.equal(r.status, 503);
    assert.equal(r.body.database, "not_configured");
    assert.equal(r.body.auth, "not_configured");
    assert.equal(r.headers["access-control-allow-origin"], PROD);
  });

  test("protected route without token -> 401 JSON", async () => {
    const r = await request(app).get("/api/me").set("Origin", PROD);
    assert.equal(r.status, 401);
    assert.equal(r.headers["access-control-allow-origin"], PROD);
  });

  test("protected route with token but no FIREBASE_PROJECT_ID -> 503 JSON", async () => {
    const r = await request(app).get("/api/me").set("Authorization", "Bearer abc.def.ghi").set("Origin", PROD);
    assert.equal(r.status, 503);
    assert.equal(r.body.code, "AUTH_NOT_CONFIGURED");
  });

  test("invalid JSON body -> 400 JSON", async () => {
    const r = await request(app).post("/api/orders").set("Content-Type", "application/json").set("Origin", PROD).send("{bad");
    assert.equal(r.status, 400);
    assert.equal(r.headers["access-control-allow-origin"], PROD);
  });
});
