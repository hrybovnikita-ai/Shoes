"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { pool } = require("./helpers");
const {
  migrate,
  status,
  sqlChecksum,
  checksumMatchesStored,
  listMigrationFiles,
} = require("../lib/migrate");

test("sqlChecksum: LF and CRLF payloads differ; content matches across EOL forms", () => {
  const sql = "SELECT 1;\n-- tail\n";
  const lf = sqlChecksum(sql, { eol: "lf" });
  const crlf = sqlChecksum(sql, { eol: "crlf" });
  assert.notEqual(lf, crlf);
  assert.equal(checksumMatchesStored(lf, sql), true);
  assert.equal(checksumMatchesStored(crlf, sql), true);
  assert.equal(checksumMatchesStored(crlf, sql.replace(/\n/g, "\r\n")), true);
});

test("checksumMatchesStored rejects modified SQL", () => {
  const sql = "CREATE TABLE t (id INT);\n";
  const stored = sqlChecksum(sql, { eol: "lf" });
  const tampered = `${sql}-- altered\n`;
  assert.equal(checksumMatchesStored(stored, tampered), false);
});

test("migrate rejects modified file after apply (checksum guard)", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shoes-mig-"));
  const name = "099_checksum_guard.sql";
  const original = "CREATE TABLE mig_checksum_demo (id INT PRIMARY KEY);\n";
  fs.writeFileSync(path.join(dir, name), original, "utf8");

  await migrate(pool, { dir });
  const stored = (
    await pool.query("SELECT checksum FROM shoes_schema_migrations WHERE name = $1", [name])
  ).rows[0].checksum;
  assert.equal(checksumMatchesStored(stored, original), true);

  fs.writeFileSync(path.join(dir, name), `${original}-- changed\n`, "utf8");
  await assert.rejects(() => migrate(pool, { dir }), /checksum mismatch/);

  await pool.query("DELETE FROM shoes_schema_migrations WHERE name = $1", [name]);
  await pool.query("DROP TABLE IF EXISTS mig_checksum_demo");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("listMigrationFiles: nine migrations; status clean after full apply", async () => {
  const files = listMigrationFiles();
  assert.equal(files.length, 9);
  await migrate(pool);
  const st = await status(pool);
  assert.equal(st.length, 9);
  assert.ok(st.every((m) => m.applied && !m.checksumMismatch));
});