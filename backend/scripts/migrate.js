#!/usr/bin/env node
"use strict";
// Usage:
//   npm run migrate:status      list applied / pending migrations
//   npm run migrate:dry-run     show what would be applied, change nothing
//   npm run migrate             apply pending migrations (additive only)
//   npm run seed                insert the demo catalog (ON CONFLICT DO NOTHING)
require("dotenv").config({ quiet: true });

const { pool, seedProducts } = require("../db");
const { migrate, status } = require("../lib/migrate");

async function main() {
  const arg = process.argv[2] || "up";
  if (arg === "status") {
    for (const m of await status(pool)) {
      console.log(`${m.applied ? "applied" : "PENDING"}  ${m.name}${m.checksumMismatch ? "  (CHECKSUM MISMATCH)" : ""}`);
    }
  } else if (arg === "dry-run") {
    const names = await migrate(pool, { dryRun: true, log: console.log });
    console.log(names.length ? `${names.length} migration(s) pending` : "Nothing to apply");
  } else if (arg === "seed") {
    await seedProducts();
    console.log("Demo catalog seeded (existing rows untouched)");
  } else if (arg === "up") {
    const names = await migrate(pool, { log: console.log });
    console.log(names.length ? `Applied: ${names.join(", ")}` : "Database is up to date");
  } else {
    throw new Error(`Unknown command: ${arg}`);
  }
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err.message);
    await pool.end().catch(() => {});
    process.exit(1);
  });
