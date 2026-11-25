#!/usr/bin/env node
"use strict";
/**
 * Rebuild all product WebPs: exact curated + wikimedia overrides + vetted candidates only.
 * Rejects proxy/substitute curated entries; dedupes sha256 across slugs.
 * Unresolved models get per-slug placeholder WebPs (unique hash) and are listed in image-catalog-gaps.json.
 */
require("dotenv").config({ quiet: true });
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");
const { products } = require("../data/catalog");
const { SLUG_CURATED } = require("../data/curatedPhotoSources");
const { CANDIDATES_BY_SLUG } = require("../data/sneakerPhotoCandidates");
const { wikimediaUrlForSlug } = require("../data/wikimediaOverrides");
const { exists: commonsFileExists } = require("./verify-wikimedia-files");
const { scoreFile } = require("../data/wikimediaFileIndex");
const { localPathForSlug } = require("../data/localProductPhotos");

const OUT_DIR = path.resolve(__dirname, "../../frontend/public/images/products");
const STAGING = path.resolve(__dirname, "../.image-staging");
const MANIFEST = path.join(OUT_DIR, "image-sources.json");
const GAPS_PATH = path.resolve(__dirname, "../../frontend/public/image-catalog-gaps.json");
const PLACEHOLDER = path.join(OUT_DIR, "placeholder.webp");
const PLACEHOLDER_BYTES = 8030;
const BG = { r: 245, g: 245, b: 247, alpha: 1 };
const UA = "ShoesCatalog/1.0 (portfolio demo; CC image sync)";
const MIN_CANDIDATE_SCORE = 7;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function imageSlugForProduct(p) {
  const m = p.image.match(/\/([^/]+)\.webp$/);
  return m ? m[1] : p.slug;
}

async function publishFile(stagingPath, destPath) {
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  const buf = await fsp.readFile(stagingPath);
  await fsp.writeFile(destPath, buf);
  await fsp.unlink(stagingPath).catch(() => {});
}

async function writeVariants(buf, slug) {
  await fsp.mkdir(STAGING, { recursive: true });
  const main = path.join(OUT_DIR, `${slug}.webp`);
  const out = await sharp(buf)
    .rotate()
    .resize(1200, 1200, { fit: "contain", background: BG })
    .webp({ quality: 82 })
    .toBuffer();
  const stagedMain = path.join(STAGING, `${slug}.webp`);
  await fsp.writeFile(stagedMain, out);
  await publishFile(stagedMain, main);
  for (const [w, suffix] of [
    [800, "-800"],
    [400, "-400"],
  ]) {
    try {
      const variant = await sharp(buf)
        .rotate()
        .resize(w, w, { fit: "contain", background: BG })
        .webp({ quality: 82 })
        .toBuffer();
      const staged = path.join(STAGING, `${slug}${suffix}.webp`);
      const dest = path.join(OUT_DIR, `${slug}${suffix}.webp`);
      await fsp.writeFile(staged, variant);
      await publishFile(staged, dest);
    } catch {
      /* non-fatal — storefront uses primary .webp */
    }
  }
}

async function fetchBuf(url) {
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45000) });
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

async function uniquePlaceholder(product) {
  const label = `${product.brand} — ${product.name}`.replace(/[<>&"]/g, "");
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
      <rect width="1200" height="1200" fill="#0B0B0B"/>
      <rect x="80" y="80" width="1040" height="1040" rx="48" fill="#141414" stroke="#B4FF24" stroke-width="2" opacity="0.35"/>
      <text x="600" y="520" text-anchor="middle" fill="#B4FF24" font-family="Arial,sans-serif" font-size="42" font-weight="700">SHOES</text>
      <text x="600" y="590" text-anchor="middle" fill="#ffffff" font-family="Arial,sans-serif" font-size="30">${label}</text>
      <text x="600" y="650" text-anchor="middle" fill="#999999" font-family="Arial,sans-serif" font-size="22">Verified product photo pending</text>
      <text x="600" y="700" text-anchor="middle" fill="#666666" font-family="Arial,sans-serif" font-size="18">ID ${product.id}</text>
    </svg>`
  );
  return sharp(svg).webp({ quality: 82 }).toBuffer();
}

function loadPriorManifestBySlug() {
  if (!fs.existsSync(MANIFEST)) return {};
  try {
    const rows = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    const bySlug = {};
    for (const row of rows) {
      const key = row.imageSlug || row.slug;
      if (key) bySlug[key] = row;
    }
    return bySlug;
  } catch {
    return {};
  }
}

async function looksLikeGeneratedPlaceholder(filePath) {
  try {
    const { data, info } = await sharp(filePath)
      .resize(64, 64, { fit: "inside" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let dark = 0;
    const pixels = data.length / info.channels;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i] < 40 && data[i + 1] < 40 && data[i + 2] < 40) dark++;
    }
    return dark / pixels > 0.52 && fs.statSync(filePath).size < 22000;
  } catch {
    return false;
  }
}

async function keepExistingVerified(slug, priorBySlug, existingPath) {
  if (!fs.existsSync(existingPath)) return null;
  if (await looksLikeGeneratedPlaceholder(existingPath)) return null;
  const size = fs.statSync(existingPath).size;
  if (size <= PLACEHOLDER_BYTES) return null;

  const prior = priorBySlug[slug] || {};
  const retainMeta = {
    provider: prior.provider || prior.source || "cache",
    file: prior.file && prior.file !== "placeholder.webp" ? prior.file : path.basename(existingPath),
    license: prior.license || "local-cache",
    match: prior.match && prior.match !== "unresolved" ? prior.match : "cached",
    note: prior.note || "Retained existing WebP on disk",
  };

  if (prior.verified === true || prior.placeholder === false) {
    return {
      buf: await fsp.readFile(existingPath),
      meta: { ...prior, ...retainMeta, placeholder: false },
      unresolved: false,
      fromDisk: true,
    };
  }

  return {
    buf: await fsp.readFile(existingPath),
    meta: retainMeta,
    unresolved: false,
    fromDisk: true,
  };
}

async function sourceBufferForProduct(product) {
  const slug = imageSlugForProduct(product);

  const local = localPathForSlug(slug);
  if (local && fs.existsSync(local)) {
    return { buf: await fsp.readFile(local), meta: { provider: "local", file: path.basename(local), license: "local", match: "exact" } };
  }

  const curated = SLUG_CURATED[slug];
  if (curated && curated.match !== "proxy" && curated.match !== "substitute") {
    if (curated.url) {
      const buf = await fetchBuf(curated.url);
      if (buf) return { buf, meta: { ...curated, provider: curated.provider || "curated" } };
    } else if (curated.file) {
      await sleep(500);
      const url = await commonsFileExists(curated.file);
      if (url) {
        const buf = await fetchBuf(url);
        if (buf) return { buf, meta: { ...curated, url, provider: curated.provider || "wikimedia" } };
      }
    }
  }

  const override = wikimediaUrlForSlug(slug);
  if (override?.url) {
    await sleep(400);
    const buf = await fetchBuf(override.url);
    if (buf) return { buf, meta: { ...override, match: "exact" } };
  }

  const candidates = CANDIDATES_BY_SLUG[slug] || [];
  for (const file of candidates) {
    const score = scoreFile(file, product);
    if (score < MIN_CANDIDATE_SCORE) continue;
    await sleep(600);
    const url = await commonsFileExists(file);
    if (!url) continue;
    const buf = await fetchBuf(url);
    if (buf) return { buf, meta: { provider: "wikimedia", file, url, license: "Wikimedia Commons", match: "candidate", score } };
  }

  return {
    buf: await uniquePlaceholder(product),
    meta: {
      provider: "placeholder",
      file: "placeholder.webp",
      license: "internal",
      match: "unresolved",
      note: `No verified ${product.brand} ${product.name} product photo found`,
    },
    unresolved: true,
  };
}

async function main() {
  const priorBySlug = loadPriorManifestBySlug();
  const usedHash = new Map();
  const manifestBySlug = {};
  const gaps = [];

  for (const product of products) {
    const slug = imageSlugForProduct(product);
    const existingPath = path.join(OUT_DIR, `${slug}.webp`);
    let hit = await keepExistingVerified(slug, priorBySlug, existingPath);
    if (hit) {
      console.log("=", slug, "kept existing WebP (skip rebuild)");
    }
    try {
      if (!hit) hit = await sourceBufferForProduct(product);
    } catch (err) {
      if (fs.existsSync(existingPath) && fs.statSync(existingPath).size > PLACEHOLDER_BYTES) {
        hit = {
          buf: await fsp.readFile(existingPath),
          meta: { provider: "cache", file: path.basename(existingPath), license: "local-cache", match: "cached", note: String(err.message) },
          unresolved: false,
        };
        console.log("~", slug, "kept existing (fetch error)");
      } else {
        throw err;
      }
    }

    if (hit.unresolved) {
      const kept = await keepExistingVerified(slug, priorBySlug, existingPath);
      if (kept) {
        hit = kept;
        console.log("=", slug, "kept existing verified WebP");
      }
    }

    let buf = hit.buf;
    let sha = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);

    if (!hit.unresolved && usedHash.has(sha) && usedHash.get(sha) !== slug) {
      const kept = await keepExistingVerified(slug, priorBySlug, existingPath);
      if (kept) {
        hit = kept;
        buf = hit.buf;
        sha = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);
        console.log("=", slug, "kept existing (dedupe avoided)");
      } else {
        hit = {
          buf: await uniquePlaceholder(product),
          meta: {
            provider: "placeholder",
            match: "unresolved",
            note: `Duplicate image of ${usedHash.get(sha)} — no separate verified photo`,
          },
          unresolved: true,
        };
        buf = hit.buf;
        sha = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);
      }
    }

    if (!hit.unresolved) usedHash.set(sha, slug);
    if (!hit.fromDisk) {
      await writeVariants(buf, slug);
    }
    const fileSha = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(OUT_DIR, `${slug}.webp`)))
      .digest("hex")
      .slice(0, 12);

    manifestBySlug[slug] = {
      id: product.id,
      slug: product.slug,
      imageSlug: slug,
      name: product.name,
      brand: product.brand,
      bytes: fs.statSync(path.join(OUT_DIR, `${slug}.webp`)).size,
      placeholder: Boolean(hit.unresolved),
      sha256_12: fileSha,
      verified: !hit.unresolved,
      ...hit.meta,
    };

    const label = hit.unresolved ? "⚠" : "✓";
    console.log(label, slug, hit.meta.file || hit.meta.note || "");
    if (hit.unresolved) {
      gaps.push({
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        reason: hit.meta.note,
      });
    }
  }

  const manifest = products.map((p) => {
    const imgSlug = imageSlugForProduct(p);
    return manifestBySlug[imgSlug] || { id: p.id, slug: p.slug, imageSlug: imgSlug, name: p.name, placeholder: true };
  });

  await fsp.writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
  await fsp.writeFile(
    GAPS_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), count: gaps.length, gaps }, null, 2)
  );

  const dupes = {};
  for (const row of manifest) {
    if (!row.sha256_12) continue;
  }
  const byHash = {};
  for (const row of manifest) {
    if (!row.sha256_12) continue;
    (byHash[row.sha256_12] ||= []).push(row.slug);
  }
  const duplicatePairs = Object.entries(byHash).filter(([, slugs]) => slugs.length > 1);
  console.log("\nProducts:", manifest.length, "| Gaps:", gaps.length, "| Duplicate hash groups:", duplicatePairs.length);
  duplicatePairs.forEach(([h, slugs]) => console.log("  DUP", h, slugs.join(", ")));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});