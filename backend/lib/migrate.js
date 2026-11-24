"use strict";
// Plain-SQL migration runner. Files in backend/migrations named NNN_name.sql
// are applied in order, each in its own transaction, and recorded in
// shoes_schema_migrations together with a SHA-256 checksum. Already-applied
// files are never re-run; an edited applied file is reported as an error.
// Nothing here drops or resets anything.

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
const LOCK_KEY = 7_405_213; // arbitrary advisory-lock id for SHOES migrations

function normalizeSqlEol(sql) {
  return sql.replace(/\r\n/g, "\n");
}

/** SHA-256 of migration SQL. New applies record LF; legacy rows may be CRLF (early Windows apply). */
function sqlChecksum(sql, { eol = "lf" } = {}) {
  const base = normalizeSqlEol(sql);
  const payload = eol === "crlf" ? base.replace(/\n/g, "\r\n") : base;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function checksumMatchesStored(stored, sql) {
  return (
    stored === sqlChecksum(sql, { eol: "lf" }) || stored === sqlChecksum(sql, { eol: "crlf" })
  );
}

function listMigrationFiles(dir = MIGRATIONS_DIR) {
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{3}_[a-z0-9_]+\.sql$/.test(f))
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(path.join(dir, name), "utf8");
      return { name, sql, checksum: sqlChecksum(sql, { eol: "lf" }) };
    });
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS shoes_schema_migrations (
      name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
}

async function status(pool, dir) {
  const client = await pool.connect();
  try {
    const exists = await client.query("SELECT to_regclass('shoes_schema_migrations') AS t");
    const applied = new Map();
    if (exists.rows[0].t) {
      const { rows } = await client.query("SELECT name, checksum, applied_at FROM shoes_schema_migrations");
      for (const r of rows) applied.set(r.name, r);
    }
    return listMigrationFiles(dir).map((m) => ({
      name: m.name,
      applied: applied.has(m.name),
      appliedAt: applied.get(m.name)?.applied_at || null,
      checksumMismatch:
        applied.has(m.name) && !checksumMatchesStored(applied.get(m.name).checksum, m.sql),
    }));
  } finally {
    client.release();
  }
}

async function migrate(pool, { dir, dryRun = false, log = () => {} } = {}) {
  const client = await pool.connect();
  const appliedNow = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    // Dry-run is strictly read-only: it does not even create the tracking table.
    if (!dryRun) await ensureTable(client);
    const exists = (await client.query("SELECT to_regclass('shoes_schema_migrations') AS t")).rows[0].t;
    const { rows } = exists ? await client.query("SELECT name, checksum FROM shoes_schema_migrations") : { rows: [] };
    const applied = new Map(rows.map((r) => [r.name, r.checksum]));
    for (const m of listMigrationFiles(dir)) {
      if (applied.has(m.name)) {
        if (!checksumMatchesStored(applied.get(m.name), m.sql)) {
          throw new Error(`Migration ${m.name} was modified after it was applied (checksum mismatch)`);
        }
        continue;
      }
      if (dryRun) {
        log(`[dry-run] would apply ${m.name}`);
        appliedNow.push(m.name);
        continue;
      }
      log(`applying ${m.name}`);
      await client.query("BEGIN");
      try {
        await client.query(m.sql);
        await client.query("INSERT INTO shoes_schema_migrations (name, checksum) VALUES ($1, $2)", [m.name, m.checksum]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw new Error(`Migration ${m.name} failed: ${err.message}`);
      }
      appliedNow.push(m.name);
    }
    return appliedNow;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
    client.release();
  }
}

async function pendingMigrations(pool, dir) {
  return (await status(pool, dir)).filter((m) => !m.applied).map((m) => m.name);
}

module.exports = {
  migrate,
  status,
  pendingMigrations,
  listMigrationFiles,
  MIGRATIONS_DIR,
  sqlChecksum,
  checksumMatchesStored,
};
