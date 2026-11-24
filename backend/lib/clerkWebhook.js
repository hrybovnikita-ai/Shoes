"use strict";

const { verifyWebhook } = require("@clerk/backend/webhooks");
const { pool } = require("../db");
const log = require("./logger");
const { upsertClerkProfile, softDeleteClerkProfile } = require("./clerkSync");

const HANDLED = new Set(["user.created", "user.updated", "user.deleted"]);

function expressToRequest(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    headers.set(key, Array.isArray(value) ? value[0] : value);
  }
  const url = `${req.protocol}://${req.get("host") || "localhost"}${req.originalUrl}`;
  return new Request(url, {
    method: req.method,
    headers,
    body: Buffer.isBuffer(req.body) ? req.body : undefined,
  });
}

async function clerkWebhook(req, res) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    return res.status(503).json({ success: false, message: "Clerk webhooks are not configured" });
  }
  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ success: false, message: "Invalid webhook body" });
  }

  let evt;
  try {
    evt = await verifyWebhook(expressToRequest(req), {
      signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    });
  } catch (err) {
    log.warn("clerk.webhook_bad_signature", { error: String(err?.message || err) });
    return res.status(400).json({ success: false, message: "Invalid Clerk webhook signature" });
  }

  const svixId = req.get("svix-id");
  if (!svixId) return res.status(400).json({ success: false, message: "Missing svix-id" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO shoes_payment_events (event_id, provider, type, order_id, livemode)
       VALUES ($1, 'clerk', $2, $3, FALSE) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [svixId, evt.type, evt.data?.id || null],
    );
    if (!ins.rowCount) {
      await client.query("COMMIT");
      return res.json({ received: true, duplicate: true });
    }

    let outcome = "ignored";
    if (HANDLED.has(evt.type) && evt.data) {
      if (evt.type === "user.deleted") {
        const row = await softDeleteClerkProfile(client, evt.data.id);
        outcome = row ? "soft_deleted" : "no_user";
      } else {
        await upsertClerkProfile(client, evt.data);
        outcome = "synced";
      }
    }

    await client.query("COMMIT");
    log.info("clerk.webhook", { svixId, type: evt.type, clerkUserId: evt.data?.id, outcome });
    return res.json({ received: true, outcome });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    log.error("clerk.webhook_failed", { error: err });
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  } finally {
    client.release();
  }
}

module.exports = { clerkWebhook };