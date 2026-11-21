"use strict";
// Dependency-free fixed-window rate limiter keyed by client IP.
// NOTE: state is per process. On Vercel each serverless instance keeps its
// own counters, so this is a best-effort abuse brake, not a hard global quota.

function clientIp(req) {
  const fwd = req.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function rateLimit({ windowMs = 60_000, max = 60, name = "default" } = {}) {
  const hits = new Map();
  let lastSweep = Date.now();

  return function rateLimitMiddleware(req, res, next) {
    if (process.env.RATE_LIMIT_DISABLED === "true" && process.env.NODE_ENV === "test") {
      return next();
    }
    const now = Date.now();
    if (now - lastSweep > windowMs) {
      for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
      lastSweep = now;
    }
    const key = `${name}:${clientIp(req)}`;
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - entry.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil((entry.reset - now) / 1000)));
    if (entry.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ success: false, message: "Too many requests. Please try again shortly." });
    }
    return next();
  };
}

module.exports = { rateLimit, clientIp };
