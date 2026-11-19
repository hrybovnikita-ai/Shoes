const express = require("express");
const cors = require("cors");

const { home } = require("./controllers");
const routes = require("./routes");

const app = express();

app.disable("x-powered-by");

const origins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const localOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
];

app.use(
  cors({
    origin: (origin, cb) =>
      !origin || [...origins, ...localOrigins].includes(origin)
        ? cb(null, true)
        : cb(new Error("CORS origin denied")),
  })
);

app.use(express.json({ limit: "100kb" }));

app.get("/", home);
app.use("/api", routes);

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request",
    });
  }

  if (err.message === "CORS origin denied") {
    return res.status(403).json({
      success: false,
      message: "Origin not allowed",
    });
  }

  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

module.exports = app;
