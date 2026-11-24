"use strict";

const router = require("express").Router();
const { pool, productRow } = require("../db");
const { requireAuth, optionalAuth } = require("../firebaseAdmin");
const { rateLimit } = require("../lib/rateLimit");
const customizer = require("../lib/customizer");

const read = rateLimit({ name: "customizer-read", windowMs: 60_000, max: 180 });
const write = rateLimit({ name: "customizer-write", windowMs: 60_000, max: 40 });

class CustomizerError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (e instanceof CustomizerError) return res.status(e.status).json({ success: false, message: e.message });
    next(e);
  }
};

const productId = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new CustomizerError("Invalid product");
  return n;
};

async function loadCustomProduct(id) {
  const row = (await pool.query("SELECT * FROM shoes_products WHERE id = $1", [id])).rows[0];
  if (!row) throw new CustomizerError("Product not found", 404);
  if (!row.customizable) throw new CustomizerError("This product does not support customization", 404);
  return row;
}

router.get("/customizer/options", read, wrap(async (_req, res) => {
  res.json({ success: true, ...customizer.optionsPayload() });
}));

router.get("/products/:id/customizer", read, wrap(async (req, res) => {
  const row = await loadCustomProduct(productId(req.params.id));
  res.json({ success: true, product: productRow(row), ...customizer.optionsPayload() });
}));

router.post("/customizer/quote", read, optionalAuth, wrap(async (req, res) => {
  const pid = productId(req.body?.productId);
  await loadCustomProduct(pid);
  const design = customizer.normalizeDesign(req.body?.design);
  const cents = customizer.surchargeCents(design);
  const base = Number((await pool.query("SELECT price FROM shoes_products WHERE id = $1", [pid])).rows[0].price);
  res.json({
    success: true,
    surchargeCents: cents,
    unitPriceCents: Math.round(base * 100) + cents,
    design,
  });
}));

router.get("/me/designs", read, requireAuth, wrap(async (req, res) => {
  const rows = (
    await pool.query(
      `SELECT d.*, p.name AS product_name, p.brand, p.image
       FROM shoes_custom_designs d
       JOIN shoes_products p ON p.id = d.product_id
       WHERE d.user_id = $1
       ORDER BY d.updated_at DESC
       LIMIT 200`,
      [req.user.id]
    )
  ).rows;
  res.json({
    success: true,
    designs: rows.map((d) => ({
      id: d.id,
      productId: d.product_id,
      productName: d.product_name,
      brand: d.brand,
      image: d.image,
      name: d.name,
      design: d.design,
      surchargeCents: d.surcharge_cents,
      updatedAt: d.updated_at,
    })),
  });
}));

router.get("/me/designs/:id", read, requireAuth, wrap(async (req, res) => {
  const id = customizer.parseDesignId(req.params.id);
  const row = (
    await pool.query("SELECT * FROM shoes_custom_designs WHERE id = $1 AND user_id = $2", [id, req.user.id])
  ).rows[0];
  if (!row) throw new CustomizerError("Design not found", 404);
  res.json({ success: true, design: row });
}));

router.post("/me/designs", write, requireAuth, wrap(async (req, res) => {
  const pid = productId(req.body?.productId);
  await loadCustomProduct(pid);
  const name = String(req.body?.name || "My design").trim();
  if (name.length < 1 || name.length > 80) throw new CustomizerError("Name must be 1–80 characters");
  const design = customizer.normalizeDesign(req.body?.design);
  const cents = customizer.surchargeCents(design);
  const { rows } = await pool.query(
    `INSERT INTO shoes_custom_designs(user_id, product_id, name, design, surcharge_cents, preview)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.user.id, pid, name, JSON.stringify(design), cents, JSON.stringify(req.body?.preview || null)]
  );
  res.status(201).json({ success: true, design: rows[0] });
}));

router.put("/me/designs/:id", write, requireAuth, wrap(async (req, res) => {
  const id = customizer.parseDesignId(req.params.id);
  const name = req.body?.name == null ? null : String(req.body.name).trim();
  if (name != null && (name.length < 1 || name.length > 80)) throw new CustomizerError("Name must be 1–80 characters");
  const design = req.body?.design ? customizer.normalizeDesign(req.body.design) : null;
  const cents = design ? customizer.surchargeCents(design) : null;
  const { rows } = await pool.query(
    `UPDATE shoes_custom_designs SET
       name = COALESCE($3, name),
       design = COALESCE($4, design),
       surcharge_cents = COALESCE($5, surcharge_cents),
       preview = COALESCE($6, preview),
       updated_at = NOW()
     WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, req.user.id, name, design ? JSON.stringify(design) : null, cents, req.body?.preview ? JSON.stringify(req.body.preview) : null]
  );
  if (!rows[0]) throw new CustomizerError("Design not found", 404);
  res.json({ success: true, design: rows[0] });
}));

router.delete("/me/designs/:id", write, requireAuth, wrap(async (req, res) => {
  const id = customizer.parseDesignId(req.params.id);
  const result = await pool.query("DELETE FROM shoes_custom_designs WHERE id = $1 AND user_id = $2", [id, req.user.id]);
  if (!result.rowCount) throw new CustomizerError("Design not found", 404);
  res.json({ success: true });
}));

module.exports = router;