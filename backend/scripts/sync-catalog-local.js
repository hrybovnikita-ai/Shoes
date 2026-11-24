#!/usr/bin/env node
"use strict";
/**
 * Apply in-code catalog metadata to LOCAL Postgres only.
 * Does not touch prices or stock. Refuses non-local DATABASE_URL.
 */
require("dotenv").config({ quiet: true });
const { pool, syncCatalogMetadata, syncProductImages } = require("../db");

const url = process.env.DATABASE_URL || "";
function assertLocalDatabase() {
  if (!url) throw new Error("DATABASE_URL missing");
  try {
    const u = new URL(url);
    const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(u.hostname);
    if (!local && u.searchParams.get("sslmode") !== "disable") {
      throw new Error("Refusing sync: DATABASE_URL is not local. Point at Docker/localhost test DB.");
    }
  } catch (e) {
    if (e.message.includes("Refusing")) throw e;
    throw new Error("Invalid DATABASE_URL");
  }
}

async function main() {
  assertLocalDatabase();
  const meta = await syncCatalogMetadata();
  const imgs = await syncProductImages();
  console.log(`syncCatalogMetadata: ${meta} rows`);
  console.log(`syncProductImages: ${imgs} rows`);
  await pool.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});