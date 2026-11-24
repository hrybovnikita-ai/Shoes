"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Webhook } = require("standardwebhooks");
const { resetDb, startServer, api, pool } = require("./helpers");

const WEBHOOK_SECRET = "whsec_c2hvdXMtVGVzdFNlY3JldEtleU11c3RCZVRoaXNMb25n";

function signClerkWebhook(payload) {
  const wh = new Webhook(WEBHOOK_SECRET);
  const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ts = new Date();
  const body = JSON.stringify(payload);
  const signature = wh.sign(id, ts, body);
  return {
    body,
    headers: {
      "Content-Type": "application/json",
      "svix-id": id,
      "svix-timestamp": String(Math.floor(ts.getTime() / 1000)),
      "svix-signature": signature,
    },
  };
}

const sampleUser = {
  id: "user_clerk_webhook_test",
  first_name: "Clerk",
  last_name: "Tester",
  image_url: "https://example.test/avatar.png",
  primary_email_address_id: "em_1",
  email_addresses: [
    {
      id: "em_1",
      email_address: "clerk-webhook@example.test",
      verification: { status: "verified" },
    },
  ],
};

test("Clerk webhook: 503 without secret, 400 without signature, sync user.created", async () => {
  await resetDb();
  const hadSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  const { server, base } = await startServer();

  const noCfg = await api(base.replace("/api", ""), "POST", "/api/webhooks/clerk", {
    body: "{}",
    headers: { "Content-Type": "application/json" },
  });
  assert.equal(noCfg.status, 503);

  process.env.CLERK_WEBHOOK_SIGNING_SECRET = WEBHOOK_SECRET;

  const bad = await fetch(`${base.replace("/api", "")}/api/webhooks/clerk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "user.created", data: sampleUser }),
  });
  assert.equal(bad.status, 400);

  const { body, headers } = signClerkWebhook({ type: "user.created", data: sampleUser, object: "event" });
  const ok = await fetch(`${base.replace("/api", "")}/api/webhooks/clerk`, {
    method: "POST",
    headers,
    body,
  });
  assert.equal(ok.status, 200);
  const row = (await pool.query("SELECT * FROM shoes_users WHERE clerk_user_id = $1", [sampleUser.id])).rows[0];
  assert.equal(row.email, "clerk-webhook@example.test");
  assert.equal(row.display_name, "Clerk Tester");

  const dup = await fetch(`${base.replace("/api", "")}/api/webhooks/clerk`, {
    method: "POST",
    headers,
    body,
  });
  assert.equal(dup.status, 200);
  const dupJson = await dup.json();
  assert.equal(dupJson.duplicate, true);

  server.close();
  if (hadSecret) process.env.CLERK_WEBHOOK_SIGNING_SECRET = hadSecret;
  else delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
});