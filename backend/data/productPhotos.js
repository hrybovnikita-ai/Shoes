"use strict";

/** Unique, verified stock photo per catalog slug (Unsplash + Pexels — download allowed). */
const UNSPLASH_FIRST = [
  "photo-1542291026-7eec264c27ff",
  "photo-1608231387042-66d1773070a5",
  "photo-1556906781-9a412961c28c",
  "photo-1539185441755-769473a23570",
  "photo-1525966222134-fcfa99b8ae77",
  "photo-1600185365926-3a2ce3cdb9eb",
  "photo-1595950653106-6c9ebd614d3a",
  "photo-1543163521-1bf539c55dd2",
  "photo-1549298916-b41d501d3772",
];

const PEXELS_REST = [
  2529148, 1598505, 1032110, 1464625, 634153, 1287560, 2929995, 336372, 2529170, 267391,
  1102777, 1005638, 1902804, 6778298, 7696908, 1043592, 2082097, 2442889, 2673864, 298863,
  2857427, 3738094, 3807445, 1148820, 1615317, 1866144, 2529149, 2529151, 2529153, 2529156,
  267392, 267393, 267394, 2834912, 336374, 336375, 3468045, 3622663, 3728379, 3731884,
  4348098, 6699123, 7195012, 8032622, 8639298, 9217678, 963147, 964926, 977316, 6475043,
];

function downloadUrl(source) {
  if (source.provider === "unsplash") {
    return `https://images.unsplash.com/${source.id}?w=1400&auto=format&q=85`;
  }
  return `https://images.pexels.com/photos/${source.id}/pexels-photo-${source.id}.jpeg?auto=compress&w=1400`;
}

function publicImagePath(slug) {
  return `/images/products/${slug}.webp`;
}

function buildSourceBySlug(products) {
  const map = new Map();
  let u = 0;
  let p = 0;
  for (const product of products) {
    const source =
      u < UNSPLASH_FIRST.length
        ? { provider: "unsplash", id: UNSPLASH_FIRST[u++] }
        : { provider: "pexels", id: PEXELS_REST[p++] };
    map.set(product.slug, source);
  }
  return map;
}

module.exports = {
  UNSPLASH_FIRST,
  PEXELS_REST,
  downloadUrl,
  publicImagePath,
  buildSourceBySlug,
  FALLBACK_PATH: "/images/products/fallback.webp",
};