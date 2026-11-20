"use strict";
require("dotenv").config({ quiet: true });

const app = require("./app");
const { pool, seedProducts } = require("./db");
const { migrate, pendingMigrations } = require("./lib/migrate");
const log = require("./lib/logger");

const PORT = Number(process.env.PORT) || 5000;

// Migrations are NOT applied automatically against your database unless you
// opt in with AUTO_MIGRATE=true (recommended only for a local/dev database).
// Otherwise run `npm run migrate` deliberately after reviewing the SQL.
async function start() {
  if (process.env.AUTO_MIGRATE === "true") {
    const applied = await migrate(pool, { log: (m) => log.info("migrate", { m }) });
    if (applied.length) log.info("migrations.applied", { applied });
    await seedProducts();
  } else {
    const pending = await pendingMigrations(pool);
    if (pending.length) {
      log.warn("migrations.pending", { pending, hint: "Review backend/migrations, then run: npm run migrate" });
    }
  }
  app.listen(PORT, () => log.info("server.listening", { url: `http://localhost:${PORT}/api` }));
}

start().catch((err) => {
  log.error("server.start_failed", { error: err });
  process.exit(1);
});
