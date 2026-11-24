#!/usr/bin/env node
"use strict";
/**
 * Download catalog product photos, write WebP to frontend/public/images/products,
 * and update shoes_products.image / images in PostgreSQL (prices untouched).
 */
require("dotenv").config({ quiet: true });
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const { pool } = require("../db");
const { products } = require("../data/catalog");
const { buildSourceBySlug, downloadUrl } = require("../data/productPhotos");
const { syncProductImages } = require("../db");

const OUT_DIR = path.resolve(__dirname, "../../frontend/public/images/products");
const SOURCE_BY_SLUG = buildSourceBySlug(products);

async function writeWebpVariants(buffer, slug) {
  const base = path.join(OUT_DIR, slug);
  const bg = { r: 24, g: 24, b: 26, alpha: 1 };
  const pipeline = (w) =>
    sharp(buffer)
      .rotate()
      .resize(w, w, { fit: "contain", background: bg })
      .webp({ quality: 82, effort: 4 });

  await pipeline(1200).toFile(`${base}.webp`);
  await pipeline(800).toFile(`${base}-800.webp`);
  await pipeline(400).toFile(`${base}-400.webp`);
}

async function downloadSource(source) {
  const res = await fetch(downloadUrl(source), { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${downloadUrl(source)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error("Response too small");
  return buf;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const report = { ok: 0, failed: [] };

  for (const product of products) {
    const source = SOURCE_BY_SLUG.get(product.slug);
    try {
      const buffer = await downloadSource(source);
      await writeWebpVariants(buffer, product.slug);
      report.ok++;
      console.log(`✓ ${product.slug}`);
    } catch (err) {
      report.failed.push({ slug: product.slug, error: err.message });
      console.error(`✗ ${product.slug}: ${err.message}`);
    }
  }

  const primary = products.find((p) => p.slug === "nike-nike-air-max-270");
  if (primary) {
    try {
      const buf = await fs.readFile(path.join(OUT_DIR, `${primary.slug}.webp`));
      await fs.writeFile(path.join(OUT_DIR, "fallback.webp"), buf);
      await fs.writeFile(path.join(OUT_DIR, "fallback-400.webp"), await fs.readFile(path.join(OUT_DIR, `${primary.slug}-400.webp`)));
      await fs.writeFile(path.join(OUT_DIR, "fallback-800.webp"), await fs.readFile(path.join(OUT_DIR, `${primary.slug}-800.webp`)));
    } catch {
      /* optional */
    }
  }

  const updated = await syncProductImages();
  console.log(`\nDatabase: updated image paths for ${updated} products`);
  console.log(`Downloaded: ${report.ok}/${products.length}, failed: ${report.failed.length}`);
  if (report.failed.length) {
    console.error(report.failed);
    process.exitCode = 1;
  }
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end().catch(() => {});
    process.exit(1);
  });