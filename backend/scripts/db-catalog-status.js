#!/usr/bin/env node
"use strict";
/**
 * Read-only: DATABASE_URL host + catalog row counts vs in-code catalog (no credentials).
 */
require("dotenv").config({ quiet: true });
const { products } = require("../data/catalog");
const { pool } = require("../db");

function describeDatabaseUrl(raw) {
  if (!raw) return { configured: false, host: null, local: false, sslMode: null };
  try {
    const u = new URL(raw);
    const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(u.hostname);
    const sslMode = u.searchParams.get("sslmode");
    return {
      configured: true,
      host: u.hostname,
      port: u.port || (u.protocol === "postgresql:" ? "5432" : ""),
      database: u.pathname.replace(/^\//, "") || null,
      local: local || sslMode === "disable",
      sslMode,
    };
  } catch {
    return { configured: true, host: "(invalid URL)", local: false };
  }
}

async function main() {
  const dbInfo = describeDatabaseUrl(process.env.DATABASE_URL || "");
  console.log("DATABASE_URL:", dbInfo.configured ? "set" : "missing");
  if (dbInfo.configured) {
    console.log("  host:", dbInfo.host);
    console.log("  database:", dbInfo.database);
    console.log("  local/sync allowed:", dbInfo.local ? "yes" : "no");
    if (!dbInfo.local) {
      console.log("  note: npm run sync:catalog-local refuses non-local hosts (by design).");
    }
  }

  console.log("\nIn-code catalog:", products.length, "products");
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS n, MAX(id) AS max_id FROM shoes_products"
    );
    const { rows: idRows } = await pool.query("SELECT id FROM shoes_products ORDER BY id");
    const dbIds = new Set(idRows.map((r) => r.id));
    const missingInDb = products.filter((p) => !dbIds.has(p.id)).map((p) => p.id);
    console.log("PostgreSQL shoes_products:", rows[0]?.n ?? 0, "rows (max id", rows[0]?.max_id ?? "—", ")");
    console.log("IDs in catalog.js missing from DB:", missingInDb.length ? missingInDb.join(", ") : "none");
    console.log(
      "Safe local sync: set DATABASE_URL to localhost (or ?sslmode=disable on a dedicated dev DB), then npm run sync:catalog-local"
    );
  } catch (e) {
    console.log("PostgreSQL:", e.message);
  } finally {
    await pool.end();
  }
}

main();