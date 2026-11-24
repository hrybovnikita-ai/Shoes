"use strict";

const { pool } = require("../db");
const fulfillment = require("../lib/fulfillment");
const { publishTracking } = require("./publish");
const shipping = require("./shipping");

async function listEvents(orderId) {
  const { rows } = await pool.query(
    `SELECT id, status, message, created_at FROM shoes_order_status_events
     WHERE order_id = $1 ORDER BY created_at ASC, id ASC`,
    [orderId]
  );
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    label: fulfillment.LABELS[r.status] || r.status,
    message: r.message,
    at: new Date(r.created_at).toISOString(),
  }));
}

async function ensureInitialEvent(client, orderId) {
  const exists = await client.query(
    "SELECT 1 FROM shoes_order_status_events WHERE order_id = $1 LIMIT 1",
    [orderId]
  );
  if (!exists.rowCount) {
    await client.query(
      `INSERT INTO shoes_order_status_events(order_id, status, message) VALUES ($1, 'order_confirmed', $2)`,
      [orderId, "Your order is confirmed and will be prepared."]
    );
  }
}

function trackingPayload(order, events, external) {
  return {
    orderId: order.id,
    fulfillmentStatus: order.fulfillment_status,
    timeline: fulfillment.timeline(order.fulfillment_status),
    events,
    trackingNumber: order.tracking_number,
    carrier: order.carrier,
    estimatedDeliveryAt: order.estimated_delivery_at
      ? new Date(order.estimated_delivery_at).toISOString()
      : null,
    trackingProvider: order.tracking_provider,
    trackingSimulated: Boolean(order.tracking_simulated),
    external,
  };
}

async function getTracking(order) {
  const events = await listEvents(order.id);
  const external =
    order.tracking_number && shipping.providerEnabled()
      ? await shipping.fetchExternalTracking({
          carrier: order.carrier,
          trackingNumber: order.tracking_number,
        })
      : null;
  return trackingPayload(order, events, external);
}

async function transitionOrder({ orderId, nextStatus, message, actorUserId, trackingNumber, carrier, estimatedDeliveryAt }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT * FROM shoes_orders WHERE id = $1 FOR UPDATE", [orderId]);
    const order = rows[0];
    if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
    const from = fulfillment.assertStatus(order.fulfillment_status);
    const to = fulfillment.assertStatus(nextStatus);
    if (!fulfillment.canTransition(from, to)) {
      throw Object.assign(new Error(`Cannot move from ${from} to ${to}`), { status: 409 });
    }

    const simulated = !shipping.providerEnabled() && Boolean(trackingNumber);
    const provider = shipping.providerEnabled() ? process.env.SHIPPING_PROVIDER_NAME || "carrier" : simulated ? "manual" : null;

    await client.query(
      `UPDATE shoes_orders SET
         fulfillment_status = $2,
         tracking_number = COALESCE($3, tracking_number),
         carrier = COALESCE($4, carrier),
         estimated_delivery_at = COALESCE($5, estimated_delivery_at),
         tracking_provider = COALESCE($6, tracking_provider),
         tracking_simulated = CASE WHEN $7 THEN TRUE ELSE tracking_simulated END,
         updated_at = NOW()
       WHERE id = $1`,
      [
        orderId,
        to,
        trackingNumber || null,
        carrier || null,
        estimatedDeliveryAt || null,
        provider,
        simulated,
      ]
    );

    await client.query(
      `INSERT INTO shoes_order_status_events(order_id, status, message, actor_user_id)
       VALUES ($1,$2,$3,$4)`,
      [orderId, to, message || fulfillment.LABELS[to], actorUserId || null]
    );

    await client.query("COMMIT");
    const updated = (await pool.query("SELECT * FROM shoes_orders WHERE id = $1", [orderId])).rows[0];
    const payload = await getTracking(updated);
    await publishTracking(orderId, payload);
    return payload;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { listEvents, ensureInitialEvent, getTracking, transitionOrder };