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
const { buildSourceBySlug, downloadUrl, PLACEHOLDER_PATH } = require("../data/productPhotos");
const { syncProductImages } = require("../db");

const OUT_DIR = path.resolve(__dirname, "../../frontend/public/images/products");
const SOURCE_BY_SLUG = buildSourceBySlug(products);

async function writeWebpVariants(buffer, slug) {
  const base = path.join(OUT_DIR, slug);
  const bg = { r: 245, g: 245, b: 247, alpha: 1 };
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
  const url = downloadUrl(source);
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "ShoesCatalog/1.0 (licensed product photography sync)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error("Response too small");
  return buf;
}

async function copyPlaceholder(slug) {
  const src = path.join(OUT_DIR, "placeholder.webp");
  for (const suffix of ["", "-800", "-400"]) {
    await fs.copyFile(`${src.replace(/\.webp$/, "")}${suffix}.webp`, path.join(OUT_DIR, `${slug}${suffix}.webp`));
  }
  console.warn(`⚠ ${slug}: no source — placeholder used`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const report = { ok: 0, failed: [] };

  await fs.access(path.join(OUT_DIR, "placeholder.webp")).catch(() => {
    require("./generate-placeholder.js");
  });

  const usedFiles = new Set();
  for (const product of products) {
    const source = SOURCE_BY_SLUG.get(product.slug);
    try {
      if (!source) {
        await copyPlaceholder(product.slug);
        report.failed.push({ slug: product.slug, error: "no authorized source" });
        continue;
      }
      await new Promise((r) => setTimeout(r, 400));
      const buffer =
        source.provider === "local"
          ? await fs.readFile(source.path)
          : await downloadSource(source);
      await writeWebpVariants(buffer, product.slug);
      report.ok++;
      if (source.file) usedFiles.add(source.file);
      console.log(`✓ ${product.slug} (${source.provider})`);
    } catch (err) {
      try {
        await copyPlaceholder(product.slug);
      } catch {
        /* */
      }
      report.failed.push({ slug: product.slug, error: err.message });
      console.error(`✗ ${product.slug}: ${err.message}`);
    }
  }

  // Remove stale WebP files for slugs that no longer exist in catalog
  const keep = new Set(products.flatMap((p) => [`${p.slug}.webp`, `${p.slug}-400.webp`, `${p.slug}-800.webp`]));
  keep.add("fallback.webp");
  keep.add("fallback-400.webp");
  keep.add("fallback-800.webp");
  keep.add("placeholder.webp");
  keep.add("placeholder-400.webp");
  keep.add("placeholder-800.webp");
  const entries = await fs.readdir(OUT_DIR);
  for (const name of entries) {
    if (name.endsWith(".webp") && !keep.has(name)) {
      await fs.unlink(path.join(OUT_DIR, name)).catch(() => {});
      console.log(`removed unused ${name}`);
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