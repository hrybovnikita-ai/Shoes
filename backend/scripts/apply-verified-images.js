#!/usr/bin/env node
"use strict";
/**
 * Force-refresh curated product WebPs and rebuild image-sources.json.
 * Uses SLUG_CURATED + explicit slug list (includes imageSlug targets).
 */
require("dotenv").config({ quiet: true });
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");
const { products } = require("../data/catalog");
const { SLUG_CURATED } = require("../data/curatedPhotoSources");
const { exists: commonsFileExists } = require("./verify-wikimedia-files");
const { slugify } = require("../data/catalogMeta");

const OUT_DIR = path.resolve(__dirname, "../../frontend/public/images/products");
const MANIFEST = path.join(OUT_DIR, "image-sources.json");
const BG = { r: 245, g: 245, b: 247, alpha: 1 };
const UA = "ShoesCatalog/1.0 (portfolio demo; CC image sync)";

function imageSlugForProduct(p) {
  const m = p.image.match(/\/([^/]+)\.webp$/);
  return m ? m[1] : p.slug;
}

function productForSlug(slug) {
  return products.find((p) => p.slug === slug || imageSlugForProduct(p) === slug);
}

async function writeVariants(buf, slug) {
  const base = path.join(OUT_DIR, slug);
  const pipe = (w) => sharp(buf).rotate().resize(w, w, { fit: "contain", background: BG }).webp({ quality: 82 });
  await pipe(1200).toFile(`${base}.webp`);
  await pipe(800).toFile(`${base}-800.webp`);
  await pipe(400).toFile(`${base}-400.webp`);
}

async function fetchBuf(url) {
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") || "";
  if (!type.startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) return null;
  try {
    const meta = await sharp(buf).metadata();
    if (!meta.width || meta.width < 200) return null;
  } catch {
    return null;
  }
  return buf;
}

async function resolveSource(meta) {
  if (meta.url) {
    const buf = await fetchBuf(meta.url);
    return buf ? { buf, ...meta } : null;
  }
  if (meta.file) {
    const url = await commonsFileExists(meta.file);
    if (!url) return null;
    const buf = await fetchBuf(url);
    return buf ? { buf, ...meta, url: url.split("?")[0] } : null;
  }
  return null;
}

async function applySlug(slug, meta, manifestBySlug) {
  const hit = await resolveSource(meta);
  if (!hit) {
    console.error("✗", slug, "source failed");
    return false;
  }
  await writeVariants(hit.buf, slug);
  const sha = crypto.createHash("sha256").update(fs.readFileSync(path.join(OUT_DIR, `${slug}.webp`))).digest("hex").slice(0, 12);
  const product = productForSlug(slug);
  manifestBySlug[slug] = {
    id: product?.id,
    slug,
    imageSlug: slug,
    name: product?.name,
    brand: product?.brand,
    bytes: fs.statSync(path.join(OUT_DIR, `${slug}.webp`)).size,
    placeholder: false,
    sha256_12: sha,
    source: hit.provider || meta.provider,
    file: hit.file,
    license: hit.license,
    match: meta.match,
    note: meta.note,
    attribution: meta.attribution,
  };
  console.log("✓", slug);
  return true;
}

async function main() {
  const slugs = new Set(Object.keys(SLUG_CURATED));
  for (const p of products) slugs.add(imageSlugForProduct(p));

  const manifestBySlug = {};
  if (fs.existsSync(MANIFEST)) {
    const raw = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    for (const row of raw) manifestBySlug[row.slug] = row;
  }

  for (const slug of slugs) {
    const meta = SLUG_CURATED[slug];
    if (!meta || meta.match === "proxy" || meta.match === "substitute") continue;
    await applySlug(slug, meta, manifestBySlug);
  }

  const manifest = products.map((p) => {
    const imgSlug = imageSlugForProduct(p);
    const row = manifestBySlug[imgSlug] || manifestBySlug[p.slug];
    if (row) return { ...row, id: p.id, name: p.name, slug: p.slug, imageSlug: imgSlug };
    return {
      id: p.id,
      slug: p.slug,
      imageSlug: imgSlug,
      name: p.name,
      brand: p.brand,
      bytes: fs.existsSync(path.join(OUT_DIR, `${imgSlug}.webp`))
        ? fs.statSync(path.join(OUT_DIR, `${imgSlug}.webp`)).size
        : 0,
      placeholder: !fs.existsSync(path.join(OUT_DIR, `${imgSlug}.webp`)),
    };
  });

  await fsp.writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log("Manifest rows:", manifest.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});