"use strict";

const CHANNEL = "shoes:tracking";
let ioRef = null;

function setIo(io) {
  ioRef = io;
}

async function publishTracking(orderId, payload) {
  const message = JSON.stringify({ orderId, at: new Date().toISOString(), ...payload });
  try {
    const { redis } = require("../commerce/redis");
    const client = redis();
    if (client?.status === "ready") await client.publish(CHANNEL, message);
  } catch {
    /* Redis optional */
  }
  if (ioRef) ioRef.to(`order:${orderId}`).emit("order:update", payload);
}

module.exports = { CHANNEL, setIo, publishTracking };