"use strict";
// Backward-compatible shim. Authentication now lives in lib/auth.js, which
// verifies Firebase ID tokens (default) and, when configured, Clerk sessions.
const { pool } = require("./db");
const { makeMiddleware } = require("./lib/auth");

const requireAuth = makeMiddleware(pool, { required: true });
const optionalAuth = makeMiddleware(pool, { required: false });

module.exports = { requireAuth, optionalAuth };
