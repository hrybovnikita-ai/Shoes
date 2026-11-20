// SHOES API — Express app. This file is also the Vercel entrypoint
// (Express framework preset detects app.js and its default export).
const express = require("express");
const { corsMiddleware } = require("./cors");

const app = express();

app.disable("x-powered-by");

// CORS first, so every response — including 404s, errors and the degraded
// fallback below — carries the right headers, and preflights end here (204).
app.use(corsMiddleware);

app.use(express.json({ limit: "100kb" }));

// Load routes defensively: if a dependency or config problem breaks the
// import, the API still answers with JSON 503 (with CORS) instead of the
// whole Vercel function crashing with a plain-text 500.
let routes;
let home;
try {
  routes = require("./routes");
  ({ home } = require("./controllers"));
} catch (error) {
  console.error("SHOES API failed to load routes:", error);
  const unavailable = (req, res) =>
    res.status(503).json({
      success: false,
      code: "API_UNAVAILABLE",
      message: "The SHOES API is temporarily unavailable",
    });
  routes = unavailable;
  home = unavailable;
}

app.get("/", home);
app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

const UNAVAILABLE_CODES = new Set([
  "DB_NOT_CONFIGURED",
  "AUTH_NOT_CONFIGURED",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ECONNRESET",
  "57P01", // admin_shutdown
  "57P03", // cannot_connect_now
  "53300", // too_many_connections
  "28P01", // invalid_password
  "28000", // invalid_authorization_specification
  "3D000", // database does not exist
]);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ success: false, message: "Invalid JSON request" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body too large" });
  }

  if (UNAVAILABLE_CODES.has(err.code)) {
    console.error("SHOES API dependency unavailable:", err.code, err.message);
    return res.status(503).json({
      success: false,
      code: err.code === "AUTH_NOT_CONFIGURED" ? err.code : "SERVICE_UNAVAILABLE",
      message: "The store is temporarily unavailable. Please try again shortly.",
    });
  }

  console.error("SHOES API error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

module.exports = app;
