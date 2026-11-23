"use strict";

require("dotenv").config({ quiet: true });

const app = require("./app");
const { pool, seedProducts } = require("./db");
const { migrate, pendingMigrations } = require("./lib/migrate");
const log = require("./lib/logger");

const PORT = Number(process.env.PORT || 5000);

const HOST = process.env.HOST || "0.0.0.0";

let server;
let shuttingDown = false;

// Validate server configuration
function validateConfig() {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error("Invalid PORT configuration");
  }
}

// Database initialization
async function initializeDatabase() {
  log.info("database.initializing");

  await pool.query("SELECT 1");

  log.info("database.connected");

  if (process.env.AUTO_MIGRATE === "true") {
    log.info("migrations.starting");

    const applied = await migrate(pool, {
      log: (message) => {
        log.info("migrate", { message });
      },
    });

    if (applied.length > 0) {
      log.info("migrations.applied", {
        applied,
      });
    }

    await seedProducts();

    log.info("database.seed.completed");
  } else {
    const pending = await pendingMigrations(pool);

    if (pending.length > 0) {
      log.warn("migrations.pending", {
        pending,
        hint: "Review backend/migrations, then run: npm run migrate",
      });
    }
  }
}

// Graceful shutdown
async function shutdown(signal) {
  if (shuttingDown) return;

  shuttingDown = true;

  log.info("server.shutting_down", {
    signal,
  });

  const forceExit = setTimeout(() => {
    log.error("server.shutdown_timeout");
    process.exit(1);
  }, 10000);

  forceExit.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await pool.end();

    clearTimeout(forceExit);

    log.info("server.stopped");

    process.exit(0);
  } catch (error) {
    log.error("server.shutdown_failed", {
      error,
    });

    process.exit(1);
  }
}

// Server startup
async function start() {
  validateConfig();

  log.info("server.starting", {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
  });

  await initializeDatabase();

  server = app.listen(PORT, HOST, () => {
    log.info("server.listening", {
      url: `http://localhost:${PORT}/api`,
      host: HOST,
      port: PORT,
    });
  });

  server.on("error", (error) => {
    log.error("server.error", {
      error,
    });

    process.exitCode = 1;

    shutdown("SERVER_ERROR").catch(() => {
      process.exit(1);
    });
  });
}

// Process events
process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

// Start application
start().catch(async (error) => {
  log.error("server.start_failed", {
    error,
  });

  try {
    await pool.end();
  } catch (closeError) {
    log.error("database.close_failed", {
      error: closeError,
    });
  }

  process.exit(1);
});
