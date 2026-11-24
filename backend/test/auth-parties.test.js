"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

function loadAuth(env) {
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    CLERK_AUTHORIZED_PARTIES: process.env.CLERK_AUTHORIZED_PARTIES,
    FRONTEND_URL: process.env.FRONTEND_URL,
  };
  Object.assign(process.env, env);
  delete require.cache[require.resolve("../lib/auth")];
  delete require.cache[require.resolve("../cors")];
  const auth = require("../lib/auth");
  const parties = auth.authorizedParties();
  Object.assign(process.env, prev);
  delete require.cache[require.resolve("../lib/auth")];
  return parties;
}

test("Clerk authorized parties include HTTPS builtins", () => {
  const p = loadAuth({ NODE_ENV: "test", CLERK_AUTHORIZED_PARTIES: "http://localhost:5173" });
  assert.ok(p.includes("http://localhost:5173"));
  assert.ok(p.includes("https://shoes-red-alpha.vercel.app"));
  assert.ok(p.includes("https://shoes.is-a.dev"));
});

test("production strips localhost from Clerk parties", () => {
  const p = loadAuth({
    NODE_ENV: "production",
    CLERK_AUTHORIZED_PARTIES: "http://localhost:5173,http://127.0.0.1:5173,https://shoes-red-alpha.vercel.app",
  });
  assert.ok(!p.some((o) => /localhost|127\.0\.0\.1/.test(o)));
  assert.ok(p.includes("https://shoes-red-alpha.vercel.app"));
  assert.ok(p.includes("https://shoes.is-a.dev"));
});

test("FRONTEND_URL comma-separated values are parsed for CORS extras", () => {
  const cors = require("../cors");
  assert.ok(
    cors.isAllowedOrigin("https://shop.example", {
      FRONTEND_URL: "https://shoes-red-alpha.vercel.app,https://shop.example",
    })
  );
  assert.ok(!cors.isAllowedOrigin("https://other.example", { FRONTEND_URL: "https://a.example,https://b.example" }));
});