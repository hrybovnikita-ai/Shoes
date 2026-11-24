#!/usr/bin/env node
"use strict";
/**
 * Resolve missing catalog photos via Wikimedia Commons API + Openverse (CC licenses).
 * Writes WebP only — does NOT update PostgreSQL.
 */
require("dotenv").config({ quiet: true });
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");
const { products } = require("../data/catalog");
const { CANDIDATES_BY_SLUG } = require("../data/sneakerPhotoCandidates");
const { exists: commonsFileExists, commonsDirect } = require("./verify-wikimedia-files");
const { loadResolved } = require("../data/productPhotos");
const { localPathForSlug } = require("../data/localProductPhotos");
const { SLUG_CURATED } = require("../data/curatedPhotoSources");
const { scoreFile } = require("../data/wikimediaFileIndex");

const OUT_DIR = path.resolve(__dirname, "../../frontend/public/images/products");
const MANIFEST = path.join(OUT_DIR, "image-sources.json");
const RESOLVED_PATH = path.join(__dirname, "../data/sneakerPhotoResolved.json");
const BG = { r: 245, g: 245, b: 247, alpha: 1 };
const UA = "ShoesCatalog/1.0 (portfolio demo; CC image sync)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PLACEHOLDER_BYTES = 8030;
const MIN_COMMONS_SCORE = 6;

function isPlaceholder(slug) {
  try {
    const p = path.join(OUT_DIR, `${slug}.webp`);
    return fs.statSync(p).size <= PLACEHOLDER_BYTES;
  } catch {
    return true;
  }
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

async function commonsSearch(query) {
  await sleep(2200);
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=8&format=json&gsrsearch=" +
    encodeURIComponent(query);
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  let data;
  try {
    data = await res.json();
  } catch {
    return [];
  }
  const pages = data.query?.pages ? Object.values(data.query.pages) : [];
  return pages.map((p) => p.title?.replace(/^File:/, "")).filter(Boolean);
}

async function tryCandidates(slug) {
  const list = CANDIDATES_BY_SLUG[slug] || [];
  for (const file of list) {
    await sleep(900);
    const url = await commonsFileExists(file);
    if (!url) continue;
    const buf = await fetchBuf(url);
    if (buf) return { provider: "wikimedia", file, url: url.split("?")[0], license: "Wikimedia Commons — verify file page" };
  }
  return null;
}

async function tryCommonsSearch(product) {
  const queries = [
    `${product.brand} ${product.name} shoe`,
    `${product.name} sneaker`,
    product.name,
  ];
  for (const q of queries) {
    const titles = await commonsSearch(q);
    for (const file of titles) {
      if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
      const score = scoreFile(file, product);
      if (score < MIN_COMMONS_SCORE) continue;
      await sleep(800);
      const url = await commonsFileExists(file);
      if (!url) continue;
      const buf = await fetchBuf(url);
      if (buf) return { provider: "wikimedia-search", file, url: url.split("?")[0], license: "Wikimedia Commons — verify file page", query: q };
    }
  }
  return null;
}

async function tryOpenverse(product) {
  await sleep(1500);
  const q = encodeURIComponent(`${product.brand} ${product.name} sneaker`);
  const api = `https://api.openverse.org/v1/images/?q=${q}&license=cc0,pdm,by,by-sa&page_size=8`;
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const data = await res.json();
  for (const hit of data.results || []) {
    const lic = hit.license || "";
    if (!/cc0|pdm|by|by-sa/i.test(lic)) continue;
    const imgUrl = hit.url;
    if (!imgUrl) continue;
    await sleep(600);
    const buf = await fetchBuf(imgUrl);
    if (buf) {
      return {
        provider: "openverse",
        file: hit.title || hit.id,
        url: imgUrl,
        license: `${lic} — ${hit.creator || "unknown"}; attribution may be required`,
        foreign_landing_url: hit.foreign_landing_url,
      };
    }
  }
  return null;
}

async function processLocalSlug(slug) {
  const lp = localPathForSlug(slug);
  if (!lp || !fs.existsSync(lp)) return null;
  const buf = await fsp.readFile(lp);
  return { provider: "local", file: path.basename(lp), url: lp, license: "user-provided local source" };
}

/** Manual overrides: image-only fixes (no DB). */
const FORCE_LOCAL_FROM = {
  "nike-nike-street-edition": "nike-nike-air-force-1",
};

const PRIORITY_FIXES = [
  { slug: "nike-nike-street-edition", reason: "replace Boty Nike with AF1 studio" },
  { slug: "vans-vans-old-skool", reason: "black Old Skool" },
  { slug: "puma-puma-suede-classic", reason: "red suede" },
  { slug: "new-balance-new-balance-2002r", reason: "protection pack" },
  { slug: "jordan-nike-air-jordan", reason: "dedupe from AJ1 Chicago" },
];

async function tryCurated(slug) {
  const meta = SLUG_CURATED[slug];
  if (!meta) return null;
  if (meta.url) {
    const buf = await fetchBuf(meta.url);
    if (!buf) return null;
    return { ...meta, provider: meta.provider || "curated" };
  }
  if (meta.file) {
    await sleep(600);
    const url = await commonsFileExists(meta.file);
    if (!url) return null;
    const buf = await fetchBuf(url);
    if (!buf) return null;
    return { ...meta, url: url.split("?")[0], provider: meta.provider || "wikimedia" };
  }
  return null;
}

async function resolveProduct(product, manifest) {
  const curated = await tryCurated(product.slug);
  if (curated) {
    const srcUrl = curated.url;
    const buf = srcUrl.startsWith("http")
      ? await fetchBuf(srcUrl)
      : await fetchBuf(await commonsFileExists(curated.file));
    if (buf) {
      await writeVariants(buf, product.slug);
      const sha = crypto.createHash("sha256").update(fs.readFileSync(path.join(OUT_DIR, `${product.slug}.webp`))).digest("hex").slice(0, 12);
      manifest[product.slug] = { slug: product.slug, sha256_12: sha, ...curated };
      console.log("✓", product.slug, "curated", curated.file || "url");
      return manifest[product.slug];
    }
  }

  if (FORCE_LOCAL_FROM[product.slug]) {
    const srcSlug = FORCE_LOCAL_FROM[product.slug];
    const srcPath = path.join(OUT_DIR, `${srcSlug}.webp`);
    if (fs.existsSync(srcPath)) {
      const buf = await fsp.readFile(srcPath);
      await writeVariants(buf, product.slug);
      const entry = { slug: product.slug, ...manifest[srcSlug], note: `copied from ${srcSlug} (image only)` };
      manifest[product.slug] = entry;
      console.log("✓", product.slug, "from", srcSlug);
      return entry;
    }
  }

  const local = await processLocalSlug(product.slug);
  if (local) {
    const buf = await fsp.readFile(local.url);
    await writeVariants(buf, product.slug);
    manifest[product.slug] = { slug: product.slug, ...local };
    console.log("✓", product.slug, "local");
    return manifest[product.slug];
  }

  let hit = await tryCandidates(product.slug);
  if (!hit) hit = await tryCommonsSearch(product);
  if (!hit) hit = await tryOpenverse(product);
  if (!hit) {
    console.log("—", product.slug, "no source");
    return null;
  }
  const buf = await fetchBuf(hit.url.includes("Special:FilePath") ? hit.url : hit.url);
  if (!buf) {
    console.log("—", product.slug, "fetch failed");
    return null;
  }
  await writeVariants(buf, product.slug);
  const sha = crypto.createHash("sha256").update(fs.readFileSync(path.join(OUT_DIR, `${product.slug}.webp`))).digest("hex").slice(0, 12);
  manifest[product.slug] = { slug: product.slug, sha256_12: sha, ...hit };
  console.log("✓", product.slug, hit.provider, hit.file || "");
  return manifest[product.slug];
}

async function main() {
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
  const bySlug = Array.isArray(manifest) ? Object.fromEntries(manifest.map((e) => [e.slug, e])) : manifest;

  const targets = new Set();
  for (const p of products) {
    if (isPlaceholder(p.slug)) targets.add(p.slug);
  }
  for (const { slug } of PRIORITY_FIXES) targets.add(slug);

  /** Re-apply curated fixes even when a bad non-placeholder image was saved earlier. */
  for (const slug of Object.keys(SLUG_CURATED)) targets.add(slug);

  for (const p of products) {
    if (!targets.has(p.slug)) continue;
    await resolveProduct(p, bySlug).catch((e) => console.error(p.slug, e.message));
  }

  // Jordan dedupe: Nike Air Jordan (id3) -> wikimedia black AJ if still same hash as AJ1
  const j1 = path.join(OUT_DIR, "jordan-air-jordan-1.webp");
  const j3 = path.join(OUT_DIR, "jordan-nike-air-jordan.webp");
  if (fs.existsSync(j1) && fs.existsSync(j3)) {
    const h1 = crypto.createHash("sha256").update(fs.readFileSync(j1)).digest("hex");
    const h3 = crypto.createHash("sha256").update(fs.readFileSync(j3)).digest("hex");
    if (h1 === h3) {
      const alt = await commonsFileExists("Air Jordan Shoe.jpg");
      if (alt) {
        const buf = await fetchBuf(alt);
        if (buf) {
          await writeVariants(buf, "jordan-nike-air-jordan");
          bySlug["jordan-nike-air-jordan"] = { slug: "jordan-nike-air-jordan", provider: "wikimedia", file: "Air Jordan Shoe.jpg", url: alt, license: "Wikimedia Commons" };
          console.log("✓ jordan-nike-air-jordan deduped");
        }
      }
    }
  }

  await fsp.writeFile(MANIFEST, JSON.stringify(Object.values(bySlug), null, 2));

  const { resolved } = loadResolved();
  const merged = { ...resolved };
  for (const [slug, meta] of Object.entries(bySlug)) {
    if (!isPlaceholder(slug)) {
      merged[slug] = { slug, provider: meta.provider, file: meta.file, url: meta.url, license: meta.license, validated: true };
    }
  }
  const unresolved = products
    .filter((p) => isPlaceholder(p.slug))
    .map((p) => ({ id: p.id, slug: p.slug, name: p.name, brand: p.brand }));
  await fsp.writeFile(RESOLVED_PATH, JSON.stringify({ resolved: merged, unresolved, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`\nPlaceholders left: ${unresolved.length}`);
}

main();