"use strict";
const path = require("path");

/** User-provided studio photos (copied into repo under product-sources/). */
const SOURCES_DIR = path.resolve(__dirname, "../../frontend/public/images/product-sources");

const LOCAL_SLUG_TO_FILE = {
  "nike-nike-air-max-270": "nike-air-max-270.png",
  "nike-nike-air-force-1": "nike-air-force-1.png",
  "nike-nike-air-max-90": "nike-air-max-90.png",
  "nike-nike-dunk-low": "nike-dunk-low-panda.png",
  "nike-nike-blazer-mid": "nike-blazer-mid.png",
  "nike-nike-lebron-witness": "nike-lebron.png",
  "nike-nike-street-edition": "nike-air-force-1.png",
  "jordan-air-jordan-1": "jordan-1-chicago.png",
  "jordan-air-jordan-4": "jordan-4-military-blue.png",
  "jordan-air-jordan-11": "jordan-11-bred-low.png",
};

function localPathForSlug(slug) {
  const file = LOCAL_SLUG_TO_FILE[slug];
  if (!file) return null;
  return path.join(SOURCES_DIR, file);
}

function localSourceForSlug(slug) {
  const file = LOCAL_SLUG_TO_FILE[slug];
  if (!file) return null;
  return { provider: "local", file, path: path.join(SOURCES_DIR, file) };
}

module.exports = { SOURCES_DIR, LOCAL_SLUG_TO_FILE, localPathForSlug, localSourceForSlug };