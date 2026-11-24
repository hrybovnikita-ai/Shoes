"use strict";
const { pool, productRow } = require("../db");
const { number, text, CommerceError } = require("./common");

const index = () => encodeURIComponent(process.env.MEILI_INDEX || "shoes_products");

async function meili(path, method = "GET", body) {
  if (!process.env.MEILI_HOST) throw new Error("Search not configured");
  const res = await fetch(`${process.env.MEILI_HOST.replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MEILI_API_KEY || ""}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok) throw new Error(`Search HTTP ${res.status}`);
  return res.json();
}

async function waitTask(task) {
  for (let i = 0; i < 80; i++) {
    const t = await meili(`/tasks/${task.taskUid}`);
    if (t.status === "succeeded") return;
    if (t.status === "failed" || t.status === "canceled") throw new Error(`Search indexing ${t.status}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Search indexing timed out");
}

const SALES_JOIN = `LEFT JOIN (
 SELECT (i->>'id')::int AS id,SUM((i->>'quantity')::int) units FROM shoes_orders o,jsonb_array_elements(o.items) i
 WHERE o.status IN ('PAID','DEMO_CONFIRMED') GROUP BY 1) s ON s.id=p.id`;

let schemaCaps = null;
async function capabilities() {
  if (schemaCaps) return schemaCaps;
  try {
    const [variants, trgm, desc] = await Promise.all([
      pool.query("SELECT to_regclass('public.shoes_variants') AS t"),
      pool.query("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_trgm') AS ok"),
      pool.query(
        `SELECT EXISTS(
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name='shoes_products' AND column_name='description'
         ) AS ok`
      ),
    ]);
    schemaCaps = {
      variants: Boolean(variants.rows[0]?.t),
      trgm: Boolean(trgm.rows[0]?.ok),
      description: Boolean(desc.rows[0]?.ok),
    };
  } catch {
    schemaCaps = { variants: false, trgm: false, description: false };
  }
  return schemaCaps;
}

function selectSql(caps) {
  const variantCol = caps.variants
    ? `COALESCE((SELECT jsonb_agg(jsonb_build_object('size',v.size,'color',v.color,'stock',v.stock)) FROM shoes_variants v WHERE v.product_id=p.id),'[]')`
    : `'[]'::jsonb`;
  return `SELECT p.*, COALESCE(s.units,0)::int AS units_sold, ${variantCol} AS variants
 FROM shoes_products p ${SALES_JOIN}`;
}

function normalizeFilter(value) {
  if (value == null || value === "") return "";
  const v = String(value).trim();
  if (!v || v.toLowerCase() === "all") return "";
  return v;
}

function doc(p) {
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const base = {
    ...productRow(p),
    inventoryManaged: p.inventory_managed,
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
    variants,
  };
  const colors = [
    ...new Set([p.color, ...variants.map((v) => v?.color)].filter(Boolean)),
  ];
  const inStockVariants = variants.filter((v) => v && Number(v.stock) > 0);
  const sizes = inStockVariants.map((v) => Number(v.size)).filter((n) => Number.isFinite(n));
  const variantKeys = inStockVariants
    .map((v) => `${Number(v.size)}|${String(v.color || p.color || "").toLowerCase()}`)
    .filter((k) => !k.endsWith("|"));
  return {
    ...base,
    sizes: sizes.length ? sizes : base.sizes?.eu?.length ? base.sizes.eu : [],
    colors,
    variantKeys,
    inStock: Number(p.stock) > 0 || inStockVariants.length > 0,
  };
}

function params(q) {
  const result = { q: "", limit: 48, offset: 0, sort: "featured" };
  for (const key of ["q", "brand", "category", "color", "gender"]) {
    if (q[key] != null && q[key] !== "") result[key] = text(q[key], key === "q" ? 100 : 80, key);
  }
  for (const [key, min, max, int] of [
    ["size", 20, 55, false],
    ["minPrice", 0, 1000000, false],
    ["maxPrice", 0, 1000000, false],
    ["limit", 1, 100, true],
    ["offset", 0, 10000, true],
  ]) {
    if (q[key] != null) result[key] = number(q[key], min, max, key, int);
  }
  if (result.minPrice != null && result.maxPrice != null && result.minPrice > result.maxPrice) {
    throw new CommerceError("Invalid price range");
  }
  if (q.inStock != null && !["true", "false"].includes(q.inStock)) throw new CommerceError("Invalid availability");
  result.inStock = q.inStock === "true";
  if (q.sort != null) {
    if (!["featured", "price-asc", "price-desc", "newest", "best-selling", "rating"].includes(q.sort)) {
      throw new CommerceError("Invalid sort");
    }
    result.sort = q.sort;
  }
  result.brand = normalizeFilter(result.brand);
  result.category = normalizeFilter(result.category);
  result.gender = normalizeFilter(result.gender);
  return result;
}

async function search(input) {
  const p = params(input);
  try {
    const filters = [];
    for (const k of ["brand", "category"]) {
      if (p[k]) filters.push(`${k} = ${JSON.stringify(p[k])}`);
    }
    if (p.gender) filters.push(`gender = ${JSON.stringify(p.gender)}`);
    if (p.size && p.color) filters.push(`variantKeys = ${JSON.stringify(`${p.size}|${p.color.toLowerCase()}`)}`);
    else {
      if (p.size) filters.push(`sizes = ${p.size}`);
      if (p.color) filters.push(`colors = ${JSON.stringify(p.color)}`);
    }
    if (p.inStock) filters.push("inStock = true");
    if (p.minPrice != null) filters.push(`price >= ${p.minPrice}`);
    if (p.maxPrice != null) filters.push(`price <= ${p.maxPrice}`);
    const sort = {
      "price-asc": ["price:asc"],
      "price-desc": ["price:desc"],
      newest: ["createdAt:desc"],
      rating: ["rating:desc"],
      "best-selling": ["unitsSold:desc"],
    }[p.sort];
    const result = await meili(`/indexes/${index()}/search`, "POST", {
      q: p.q,
      filter: filters,
      limit: p.limit,
      offset: p.offset,
      ...(sort ? { sort } : {}),
      showMatchesPosition: true,
    });
    if (p.q && result.estimatedTotalHits === 0) return fallback(p);
    return {
      products: result.hits,
      count: result.estimatedTotalHits,
      engine: "meilisearch",
      limit: p.limit,
      offset: p.offset,
    };
  } catch {
    return fallback(p);
  }
}

function textSearchClause(termRef, caps) {
  const fields = "coalesce(p.name,'')||' '||coalesce(p.brand,'')||' '||coalesce(p.category,'')";
  const withDesc = caps.description ? `${fields}||' '||coalesce(p.description,'')` : fields;
  const like = `lower(${withDesc}) LIKE '%'||${termRef}||'%'`;
  const fts = `(to_tsvector('simple',${withDesc}) @@ plainto_tsquery('simple',${termRef}))`;
  if (caps.trgm) {
    const typoBrand = `(position(' ' in coalesce(p.brand,''))=0 AND abs(length(coalesce(p.brand,''))-length(${termRef}))<=1 AND word_similarity(${termRef},lower(coalesce(p.brand,'')))>0.2)`;
    return `(${fts} OR ${like} OR word_similarity(${termRef},lower(coalesce(p.name,'')||' '||coalesce(p.brand,'')))>0.35 OR similarity(lower(coalesce(p.name,'')),${termRef})>0.25 OR ${typoBrand})`;
  }
  return `(${fts} OR ${like})`;
}

async function fallback(p) {
  const caps = await capabilities();
  const values = [];
  const add = (v) => {
    values.push(v);
    return `$${values.length}`;
  };
  const where = [];
  if (p.q) {
    const term = add(p.q.toLowerCase());
    where.push(textSearchClause(term, caps));
  }
  for (const k of ["brand", "category"]) {
    if (p[k]) where.push(`lower(p.${k})=lower(${add(p[k])})`);
  }
  if (p.gender) where.push(`lower(coalesce(p.gender,''))=lower(${add(p.gender)})`);
  if (p.minPrice != null) where.push(`p.price>=${add(p.minPrice)}`);
  if (p.maxPrice != null) where.push(`p.price<=${add(p.maxPrice)}`);
  if (p.inStock) where.push("p.stock>0");

  if (p.size || p.color) {
    if (caps.variants) {
      const conditions = ["v.product_id=p.id"];
      if (p.size) {
        conditions.push(`v.size=${add(p.size)}`);
        conditions.push("v.stock>0");
      }
      if (p.color) conditions.push(`lower(v.color)=lower(${add(p.color)})`);
      const exists = `EXISTS(SELECT 1 FROM shoes_variants v WHERE ${conditions.join(" AND ")})`;
      where.push(!p.size && p.color ? `(${exists} OR lower(p.color)=lower(${add(p.color)}))` : exists);
    } else {
      if (p.color) where.push(`lower(p.color)=lower(${add(p.color)})`);
      if (p.size) {
        where.push(
          `(p.size_eu IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(p.size_eu::jsonb) e WHERE e::numeric=${add(p.size)}))`
        );
      }
    }
  }

  const clause = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const order = {
    "price-asc": "p.price ASC",
    "price-desc": "p.price DESC",
    newest: "p.created_at DESC NULLS LAST",
    "best-selling": "units_sold DESC",
    rating: "p.rating DESC NULLS LAST",
    featured: "p.id ASC",
  }[p.sort];
  try {
    const select = selectSql(caps);
    const count = await pool.query(`SELECT COUNT(*)::int n FROM shoes_products p${clause}`, values);
    const rows = await pool.query(
      `${select}${clause} ORDER BY ${order},p.id LIMIT ${add(p.limit)} OFFSET ${add(p.offset)}`,
      values
    );
    return {
      products: rows.rows.map(doc),
      count: count.rows[0].n,
      engine: "postgresql",
      limit: p.limit,
      offset: p.offset,
    };
  } catch (e) {
    if (["42P01", "42883"].includes(e.code) && schemaCaps) {
      schemaCaps = null;
      return fallback(p);
    }
    throw e;
  }
}

async function configure() {
  await waitTask(
    await meili(`/indexes/${index()}/settings`, "PATCH", {
      searchableAttributes: ["name", "brand", "category", "color", "description"],
      filterableAttributes: [
        "brand",
        "category",
        "gender",
        "sizes",
        "colors",
        "variantKeys",
        "price",
        "inStock",
      ],
      sortableAttributes: ["price", "unitsSold", "createdAt", "rating"],
      typoTolerance: { enabled: true },
      pagination: { maxTotalHits: 10000 },
    })
  );
}

async function sync() {
  const caps = await capabilities();
  if (!caps.variants) return;
  const db = await pool.connect();
  let locked = false;
  try {
    locked = (await db.query("SELECT pg_try_advisory_lock(7405214) AS ok")).rows[0].ok;
    if (!locked) return;
    const events = (await db.query("SELECT * FROM shoes_commerce_outbox ORDER BY id LIMIT 200")).rows;
    if (!events.length) return;
    const ids = [...new Set(events.map((e) => e.product_id))];
    const rows = (await db.query(`${selectSql(caps)} WHERE p.id=ANY($1::int[])`, [ids])).rows;
    if (rows.length) await waitTask(await meili(`/indexes/${index()}/documents`, "POST", rows.map(doc)));
    const existing = new Set(rows.map((r) => r.id));
    const removed = ids.filter((id) => !existing.has(id));
    if (removed.length) await waitTask(await meili(`/indexes/${index()}/documents/delete-batch`, "POST", removed));
    await db.query("DELETE FROM shoes_commerce_outbox WHERE id=ANY($1::bigint[])", [events.map((e) => e.id)]);
  } finally {
    if (locked) await db.query("SELECT pg_advisory_unlock(7405214)");
    db.release();
  }
}

module.exports = { search, fallback, params, configure, sync, meili, waitTask, capabilities, doc };