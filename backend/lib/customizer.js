"use strict";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MATERIALS = Object.freeze({
  mesh: { label: "Performance mesh", surchargeCents: 0 },
  canvas: { label: "Canvas", surchargeCents: 800 },
  suede: { label: "Suede", surchargeCents: 1800 },
  leather: { label: "Full-grain leather", surchargeCents: 2800 },
});

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function normalizeDesign(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Invalid design");
  const material = String(raw.material || "mesh").toLowerCase();
  if (!MATERIALS[material]) throw new Error("Invalid material");
  for (const key of ["upperColor", "soleColor", "laceColor", "heelColor"]) {
    const value = raw[key];
    if (typeof value !== "string" || !COLOR_RE.test(value)) {
      throw new Error(`Invalid ${key}`);
    }
  }
  return {
    upperColor: raw.upperColor,
    soleColor: raw.soleColor,
    laceColor: raw.laceColor,
    heelColor: raw.heelColor,
    material,
  };
}

function surchargeCents(design) {
  return MATERIALS[design.material].surchargeCents;
}

function optionsPayload() {
  return {
    materials: Object.entries(MATERIALS).map(([id, m]) => ({
      id,
      label: m.label,
      surchargeCents: m.surchargeCents,
    })),
    defaultDesign: normalizeDesign({
      upperColor: "#e8e8e8",
      soleColor: "#f5f5f5",
      laceColor: "#111111",
      heelColor: "#b7ff35",
      material: "mesh",
    }),
  };
}

function parseDesignId(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !UUID_RE.test(value)) throw new Error("Invalid design id");
  return value.toLowerCase();
}

module.exports = {
  MATERIALS,
  normalizeDesign,
  surchargeCents,
  optionsPayload,
  parseDesignId,
  UUID_RE,
};