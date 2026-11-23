"use strict";
// Inserts the verified Nike colorway catalog (backend/data/nikeColorways.js).
// Safety: INSERT ... ON CONFLICT DO NOTHING only. It never UPDATEs or DELETEs
// anything, so the original products and any edited rows are untouched.
// Duplicates are prevented by the primary key and by the unique index on
// upper(style_code) from migration 007; conflicting rows are reported.

const NIKE = require("../data/nikeColorways");

function validateCatalog(list = NIKE) {
  const errors = [];
  const ids = new Set();
  const codes = new Set();
  for (const p of list) {
    if (!Number.isInteger(p.id) || p.id < 1) errors.push(`bad id ${p.id}`);
    if (ids.has(p.id)) errors.push(`duplicate id ${p.id}`);
    ids.add(p.id);
    const code = String(p.styleCode || "").toUpperCase();
    if (!/^[A-Z0-9]{6}-[0-9]{3}$/.test(code)) errors.push(`bad style code ${p.styleCode}`);
    if (codes.has(code)) errors.push(`duplicate style code ${code}`);
    codes.add(code);
    if (!(p.price > 0)) errors.push(`bad price for ${code}`);
    if (!Number.isInteger(p.stock) || p.stock < 0) errors.push(`bad stock for ${code}`);
    if (!/^https:\/\//.test(p.image || "")) errors.push(`bad image for ${code}`);
    if (!Array.isArray(p.sizes) || !p.sizes.length || p.sizes.some((n) => !Number.isInteger(n) || n < 36 || n > 46)) {
      errors.push(`bad sizes for ${code}`);
    }
    if (String(p.color || "").length > 40) errors.push(`color too long for ${code}`);
  }
  return errors;
}

async function seedNikeColorways(pool, { list = NIKE, dryRun = false } = {}) {
  const errors = validateCatalog(list);
  if (errors.length) throw new Error(`Nike catalog is invalid: ${errors.join("; ")}`);

  const client = await pool.connect();
  try {
    const col = await client.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'shoes_products' AND column_name = 'style_code'`
    );
    if (!col.rowCount) throw new Error("shoes_products.style_code is missing: apply migration 007 first (npm run migrate)");

    await client.query("BEGIN");
    const inserted = [];
    const skipped = [];
    for (const p of list) {
      const r = await client.query(
        `INSERT INTO shoes_products
           (id, name, brand, category, price, old_price, color, rating, stock, image, style_code, colorway, description, sizes)
         VALUES ($1,$2,$3,$4,$5,NULL,$6,NULL,$7,$8,$9,$10,$11,$12::int[])
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [p.id, p.name, p.brand, p.category, p.price, p.color, p.stock, p.image, p.styleCode, p.colorway, p.description, p.sizes]
      );
      if (r.rowCount) {
        inserted.push(p.id);
      } else {
        const existing = await client.query(
          "SELECT id, style_code FROM shoes_products WHERE id = $1 OR upper(style_code) = upper($2)",
          [p.id, p.styleCode]
        );
        const same = existing.rows.find((e) => e.id === p.id && String(e.style_code || "").toUpperCase() === p.styleCode.toUpperCase());
        skipped.push({
          id: p.id,
          styleCode: p.styleCode,
          reason: same ? "already present" : `conflicts with existing row(s): ${existing.rows.map((e) => `id ${e.id}${e.style_code ? ` (${e.style_code})` : ""}`).join(", ")}`,
        });
      }
    }
    await client.query(dryRun ? "ROLLBACK" : "COMMIT");
    return { inserted, skipped, dryRun };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seedNikeColorways, validateCatalog, NIKE };
