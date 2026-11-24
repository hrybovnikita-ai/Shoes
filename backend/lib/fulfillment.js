"use strict";

const STATUSES = [
  "order_confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const LABELS = Object.freeze({
  order_confirmed: "Order confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
});

const TRANSITIONS = Object.freeze({
  order_confirmed: new Set(["processing", "cancelled"]),
  processing: new Set(["packed", "cancelled"]),
  packed: new Set(["shipped", "cancelled"]),
  shipped: new Set(["out_for_delivery", "delivered", "cancelled"]),
  out_for_delivery: new Set(["delivered", "cancelled"]),
  delivered: new Set(),
  cancelled: new Set(),
});

function assertStatus(value) {
  const status = String(value || "").toLowerCase();
  if (!STATUSES.includes(status)) throw new Error("Invalid fulfillment status");
  return status;
}

function canTransition(from, to) {
  return TRANSITIONS[from]?.has(to) ?? false;
}

function timeline(status) {
  const activeIndex = STATUSES.indexOf(status === "cancelled" ? "cancelled" : status);
  return STATUSES.filter((s) => s !== "cancelled").map((s, index) => ({
    status: s,
    label: LABELS[s],
    complete: status === "cancelled" ? false : index <= activeIndex,
    current: s === status,
  }));
}

module.exports = { STATUSES, LABELS, TRANSITIONS, assertStatus, canTransition, timeline };