"use strict";
/**
 * Verified multi-angle gallery metadata per product slug.
 * Only include distinct photographs — never duplicate the same asset with fake angle labels.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const GALLERIES_ROOT = path.resolve(__dirname, "../../frontend/public/images/galleries");
const PUBLIC_MANIFEST = path.resolve(__dirname, "../../frontend/public/product-galleries.json");

const ANGLE_ORDER = ["side", "three-quarter", "front", "back", "top", "outsole", "detail", "primary"];
const ANGLE_LABELS = {
  side: "Side view",
  "three-quarter": "3/4 front",
  front: "Front view",
  back: "Back view",
  top: "Top view",
  outsole: "Outsole",
  detail: "Detail",
  primary: "Primary",
};

let cachedManifest = null;

function readBuiltManifest() {
  if (cachedManifest) return cachedManifest;
  if (fs.existsSync(PUBLIC_MANIFEST)) {
    try {
      cachedManifest = JSON.parse(fs.readFileSync(PUBLIC_MANIFEST, "utf8"));
      return cachedManifest;
    } catch {
      cachedManifest = { bySlug: {} };
    }
  } else {
    cachedManifest = { bySlug: {} };
  }
  return cachedManifest;
}

function fileHash(filePath) {
  try {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").slice(0, 16);
  } catch {
    return null;
  }
}

function discoverGalleryFromDisk(slug) {
  const dir = path.join(GALLERIES_ROOT, slug);
  if (!fs.existsSync(dir)) return [];
  const items = [];
  const seenHash = new Set();
  for (const angle of ANGLE_ORDER) {
    for (const ext of [".webp", ".jpg", ".jpeg", ".png"]) {
      const abs = path.join(dir, `${angle}${ext}`);
      if (!fs.existsSync(abs)) continue;
      const hash = fileHash(abs);
      if (!hash || seenHash.has(hash)) continue;
      seenHash.add(hash);
      items.push({
        url: `/images/galleries/${slug}/${path.basename(abs)}`,
        angle,
        label: ANGLE_LABELS[angle] || angle,
        verified: true,
      });
      break;
    }
  }
  return items;
}

function primaryOnly(slug, primaryUrl) {
  return [
    {
      url: primaryUrl,
      angle: "primary",
      label: ANGLE_LABELS.primary,
      verified: true,
    },
  ];
}

function mergePrimary(items, primaryUrl) {
  if (!primaryUrl) return items;
  if (items.some((g) => g.url === primaryUrl)) return items;
  return [{ url: primaryUrl, angle: "primary", label: ANGLE_LABELS.primary, verified: true }, ...items];
}

function galleryForSlug(slug, primaryUrl) {
  const disk = discoverGalleryFromDisk(slug);
  if (disk.length > 1) return mergePrimary(disk, primaryUrl);
  const built = readBuiltManifest().bySlug?.[slug];
  if (Array.isArray(built?.items) && built.items.length > 1) return mergePrimary(built.items, primaryUrl);
  if (disk.length === 1) return disk;
  if (built?.items?.length) return built.items;
  return primaryOnly(slug, primaryUrl);
}

function galleryUrlsForSlug(slug, primaryUrl) {
  return galleryForSlug(slug, primaryUrl).map((g) => g.url);
}

function enrichProductGallery(product) {
  const items = galleryForSlug(product.slug, product.image);
  const images = items.map((g) => g.url);
  const limitation =
    items.length < 4
      ? {
          count: items.length,
          message:
            items.length < 2
              ? "Only one verified product photograph is available for this model. Additional angles were not found under CC/PDM sources."
              : `Only ${items.length} verified photograph(s) are available (target 4–6 distinct angles).`,
        }
      : null;
  return { images, gallery: items, galleryLimitation: limitation };
}

function buildPublicManifest() {
  const { products } = require("./catalog");
  const bySlug = {};
  for (const p of products) {
    const disk = discoverGalleryFromDisk(p.slug);
    const items = disk.length ? disk : primaryOnly(p.slug, p.image);
    bySlug[p.slug] = { id: p.id, name: p.name, items, verifiedCount: items.filter((i) => i.verified).length };
  }
  const payload = { generatedAt: new Date().toISOString(), bySlug };
  fs.mkdirSync(path.dirname(PUBLIC_MANIFEST), { recursive: true });
  fs.writeFileSync(PUBLIC_MANIFEST, JSON.stringify(payload, null, 2));
  cachedManifest = payload;
  return payload;
}

module.exports = {
  galleryForSlug,
  galleryUrlsForSlug,
  enrichProductGallery,
  buildPublicManifest,
  GALLERIES_ROOT,
  ANGLE_LABELS,
  discoverGalleryFromDisk,
};