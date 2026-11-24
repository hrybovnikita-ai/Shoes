"use strict";

const router = require("express").Router();
const { pool } = require("../db");
const { optionalAuth } = require("../firebaseAdmin");
const requireAdmin = require("../middleware/requireAdmin");
const { rateLimit } = require("../lib/rateLimit");
const controllers = require("../controllers");
const tracking = require("./service");
const fulfillment = require("../lib/fulfillment");

const read = rateLimit({ name: "tracking-read", windowMs: 60_000, max: 180 });
const write = rateLimit({ name: "tracking-write", windowMs: 60_000, max: 60 });

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (e.status === 404) return res.status(404).json({ success: false, message: e.message });
    if (e.status === 409) return res.status(409).json({ success: false, message: e.message });
    next(e);
  }
};

router.get("/orders/:id/tracking", read, optionalAuth, wrap(async (req, res) => {
  const order = await controllers._internal.authorizedOrder(req, res, pool, false);
  if (!order) return;
  const payload = await tracking.getTracking(order);
  res.json({ success: true, tracking: payload });
}));

router.patch("/admin/orders/:id/fulfillment", write, ...requireAdmin, wrap(async (req, res) => {
  const status = fulfillment.assertStatus(req.body?.status);
  const payload = await tracking.transitionOrder({
    orderId: String(req.params.id),
    nextStatus: status,
    message: typeof req.body?.message === "string" ? req.body.message.slice(0, 500) : null,
    actorUserId: req.user?.id,
    trackingNumber: typeof req.body?.trackingNumber === "string" ? req.body.trackingNumber.trim().slice(0, 80) : null,
    carrier: typeof req.body?.carrier === "string" ? req.body.carrier.trim().slice(0, 80) : null,
    estimatedDeliveryAt: req.body?.estimatedDeliveryAt || null,
  });
  res.json({ success: true, tracking: payload });
}));

module.exports = router;