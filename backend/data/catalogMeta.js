"use strict";

const EU_FULL = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];
const US_FULL = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const UK_FULL = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const { publicImagePath } = require("./productPhotos");

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
  imageSeed: _imageSeed,
  rating,
  stock,
  customizable = false,
  /** Keep WebP basename when product name/slug changes */
  imageSlug,
  slug: slugOverride,
}) {
  const slug = slugOverride || slugify(name, brand);
  const palette = colors || [color];
  const image = publicImagePath(imageSlug || slug);
  return {
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
    description: `${description} Demo listing for the SHOES store — not an official retailer product page.`,
    image,
    images: [image],
    sizeEu: EU_FULL,
    sizeUs: US_FULL,
    sizeUk: UK_FULL,
    rating,
    stock,
    customizable,
  };
}

module.exports = { demoProduct, EU_FULL, US_FULL, UK_FULL, slugify, publicImagePath };