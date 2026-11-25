"use strict";

const EU_FULL = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];
const US_FULL = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const UK_FULL = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const DEMO_STORE_NOTE =
  "SHOES is a portfolio demo storefront. Listings are illustrative; no official brand affiliation and no physical goods ship.";

const { publicImagePath } = require("./productPhotos");
const { enrichProductGallery } = require("./productGalleryManifest");
const { PRODUCT_COPY } = require("./productCopy");

function slugify(name, brand) {
  return `${brand}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function demoProduct({
  id,
  name,
  brand,
  category,
  gender,
  price,
  oldPrice,
  color,
  colors,
  materials,
  description,
  shortIntro,
  featureHighlights,
  imageSeed: _imageSeed,
  rating,
  stock,
  customizable = false,
  imageSlug,
  slug: slugOverride,
}) {
  const slug = slugOverride || slugify(name, brand);
  const palette = colors || [color];
  const image = publicImagePath(imageSlug || slug);
  const copy = PRODUCT_COPY[id] || {};
  const base = {
    id,
    slug,
    name,
    brand,
    category,
    gender,
    price,
    oldPrice,
    color,
    colors: palette,
    materials,
    description: copy.description || description,
    shortIntro: copy.shortIntro || shortIntro || description,
    featureHighlights:
      copy.featureHighlights ||
      featureHighlights || {
        materials: materials || "Quality upper and rubber outsole.",
        comfort: "Cushioned for daily wear.",
        design: `${brand} heritage styling.`,
        use: category === "Running" ? "Training and casual miles." : "Everyday streetwear.",
      },
    demoStoreNote: DEMO_STORE_NOTE,
    image,
    images: [image],
    sizeEu: EU_FULL,
    sizeUs: US_FULL,
    sizeUk: UK_FULL,
    rating,
    stock,
    customizable,
  };
  return { ...base, ...enrichProductGallery(base) };
}

module.exports = { demoProduct, EU_FULL, US_FULL, UK_FULL, slugify, publicImagePath, DEMO_STORE_NOTE };