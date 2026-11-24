"use strict";

const { Server } = require("socket.io");
const auth = require("../lib/auth");
const { pool } = require("../db");
const controllers = require("../controllers");
const { allowedOrigins } = require("../cors");
const log = require("../lib/logger");
const { CHANNEL, setIo, publishTracking } = require("./publish");
const { redis } = require("../commerce/redis");

function attachTrackingSocket(httpServer) {
  if (process.env.VERCEL) {
    log.warn("tracking.socket_disabled", { reason: "vercel" });
    return null;
  }

  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin(origin, cb) {
        if (!origin || allowedOrigins().has(String(origin).replace(/\/+$/, "").toLowerCase())) cb(null, true);
        else cb(new Error("Origin not allowed"));
      },
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  setIo(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const identity = await auth.verifyToken(token);
      socket.data.user = await auth.resolveUser(pool, identity);
      socket.data.identity = identity;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("order:subscribe", async ({ orderId }, ack) => {
      try {
        const rows = (await pool.query("SELECT * FROM shoes_orders WHERE id = $1", [String(orderId)])).rows;
        const order = rows[0];
        if (!order) throw new Error("Order not found");
        const fakeReq = { params: { id: order.id }, user: socket.data.user, get: () => null };
        if (!controllers._internal.ownsOrder(socket.data.user, order)) throw new Error("Forbidden");
        await socket.join(`order:${order.id}`);
        if (typeof ack === "function") ack({ ok: true });
      } catch (error) {
        if (typeof ack === "function") ack({ ok: false, message: error.message });
      }
    });

    socket.on("order:unsubscribe", ({ orderId }) => {
      socket.leave(`order:${order.id}`);
    });
  });

  const client = redis();
  if (client) {
    const sub = client.duplicate();
    sub.connect()
      .then(() => sub.subscribe(CHANNEL))
      .then(() => {
        sub.on("message", (channel, message) => {
          if (channel !== CHANNEL) return;
          try {
            const data = JSON.parse(message);
            if (data.orderId) io.to(`order:${data.orderId}`).emit("order:update", data);
          } catch {
            /* ignore */
          }
        });
      })
      .catch(() => {});
  }

  log.info("tracking.socket_ready");
  return io;
}

module.exports = { attachTrackingSocket, publishTracking };