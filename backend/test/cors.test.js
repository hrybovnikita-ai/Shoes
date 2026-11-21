"use strict";
// CORS, preflight and crash-proof startup (the production incident of 2026-11-20).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { pool, resetDb, startServer, api } = require("./helpers");
const cors = require("../cors");

const PROD = "https://shoes-red-alpha.vercel.app";
let server;
let base;

test.before(async () => {
  await resetDb();
  ({ server, base } = await startServer());
});
test.after(async () => {
  server.close();
  await pool.end();
});

test("origin normalization and allowlist", () => {
  assert.equal(cors.normalizeOrigin(" https://Shoes-Red-Alpha.vercel.app/ "), PROD);
  assert.ok(cors.isAllowedOrigin(PROD, {}));
  assert.ok(cors.isAllowedOrigin("http://localhost:5173", {}));
  assert.ok(!cors.isAllowedOrigin("https://evil.example", {}));
  assert.ok(cors.isAllowedOrigin("https://shop.example", { FRONTEND_URL: "https://shop.example/" }));
  assert.ok(cors.isAllowedOrigin("https://b.example", { CORS_ORIGINS: "https://a.example, https://b.example/" }));
});

test("preflight from the production origin -> 204 with methods + headers, no credentials", async () => {
  const r = await api(base, "OPTIONS", "/products", {
    headers: { Origin: PROD, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization,content-type" },
  });
  assert.equal(r.status, 204);
  const h = r.headers;
  assert.equal(h.get("access-control-allow-origin"), PROD);
  for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) assert.match(h.get("access-control-allow-methods"), new RegExp(m));
  assert.match(h.get("access-control-allow-headers"), /Authorization/);
  assert.match(h.get("access-control-allow-headers"), /Content-Type/);
  assert.equal(h.get("access-control-allow-credentials"), null);
  assert.match(h.get("vary"), /Origin/);
});

test("unknown origin: no ACAO header, but no error either", async () => {
  const r = await api(base, "OPTIONS", "/products", { headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "GET" } });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("access-control-allow-origin"), null);
  const g = await api(base, "GET", "/products", { headers: { Origin: "https://evil.example" } });
  assert.equal(g.status, 200);
  assert.equal(g.headers.get("access-control-allow-origin"), null);
});

test("GET /api/products returns JSON with ACAO for the production origin", async () => {
  const r = await api(base, "GET", "/products", { headers: { Origin: PROD } });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /application\/json/);
  assert.equal(r.headers.get("access-control-allow-origin"), PROD);
  assert.ok(r.body.products.length > 0);
});

test("ACAO also on 404 and 401 JSON responses", async () => {
  const nf = await api(base, "GET", "/nope", { headers: { Origin: PROD } });
  assert.equal(nf.status, 404);
  assert.equal(nf.headers.get("access-control-allow-origin"), PROD);
  const ua = await api(base, "GET", "/me/orders", { headers: { Origin: PROD } });
  assert.equal(ua.status, 401);
  assert.equal(ua.headers.get("access-control-allow-origin"), PROD);
});

test("app and firebase-admin load without require(esm) (Vercel's loader)", () => {
  const r = spawnSync(
    process.execPath,
    ["--no-experimental-require-module", "-e", "require('./app'); require('firebase-admin/auth'); require('@clerk/backend'); console.log('OK')"],
    { cwd: path.join(__dirname, ".."), env: { PATH: process.env.PATH }, encoding: "utf8" }
  );
  assert.equal(r.status, 0, r.stderr);
});

test("with NO env vars the API still answers JSON 503 with CORS (no crash)", async () => {
  const script = `
    const app = require('./app');
    const s = app.listen(0, '127.0.0.1', async () => {
      const b = 'http://127.0.0.1:' + s.address().port + '/api';
      const out = {};
      for (const p of ['/products', '/health']) {
        const r = await fetch(b + p, { headers: { Origin: '${PROD}' } });
        out[p] = { status: r.status, type: r.headers.get('content-type'), acao: r.headers.get('access-control-allow-origin') };
      }
      console.log(JSON.stringify(out)); s.close();
    });`;
  const child = spawn(process.execPath, ["--no-experimental-require-module", "-e", script], {
    cwd: path.join(__dirname, ".."),
    env: { PATH: process.env.PATH, LOG_LEVEL: "silent" },
  });
  let stdout = "";
  child.stdout.on("data", (d) => (stdout += d));
  const code = await new Promise((ok) => child.on("close", ok));
  assert.equal(code, 0);
  const out = JSON.parse(stdout.trim().split("\n").pop());
  for (const p of ["/products", "/health"]) {
    assert.equal(out[p].status, 503, p);
    assert.match(out[p].type, /json/);
    assert.equal(out[p].acao, PROD);
  }
});
