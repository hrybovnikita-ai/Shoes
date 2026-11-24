"use strict";

const log = require("../lib/logger");

function providerEnabled() {
  return Boolean(process.env.SHIPPING_API_URL && process.env.SHIPPING_API_KEY);
}

async function fetchExternalTracking({ carrier, trackingNumber }) {
  if (!providerEnabled() || !trackingNumber) return null;
  try {
    const res = await fetch(
      `${process.env.SHIPPING_API_URL.replace(/\/$/, "")}/track?carrier=${encodeURIComponent(carrier || "")}&number=${encodeURIComponent(trackingNumber)}`,
      {
        headers: { Authorization: `Bearer ${process.env.SHIPPING_API_KEY}` },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      provider: process.env.SHIPPING_PROVIDER_NAME || "carrier",
      simulated: false,
      events: Array.isArray(data.events) ? data.events : [],
      estimatedDeliveryAt: data.estimatedDeliveryAt || null,
    };
  } catch (error) {
    log.warn("shipping.provider_failed", { error: error.message });
    return null;
  }
}

module.exports = { providerEnabled, fetchExternalTracking };