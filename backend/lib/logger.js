"use strict";
// Minimal structured (JSON-lines) logger. Never pass secrets, tokens or full
// request bodies to it; known sensitive keys are redacted defensively anyway.

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
const SENSITIVE = /(authorization|token|secret|password|cookie|api[_-]?key|database_url|card|cvv|signature)/i;

function currentLevel() {
  const fallback = process.env.NODE_ENV === "test" ? "silent" : "info";
  return LEVELS[(process.env.LOG_LEVEL || fallback).toLowerCase()] ?? LEVELS.info;
}

function redact(value, depth = 0) {
  if (value == null || depth > 4) return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, code: value.code };
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}

function log(level, msg, fields) {
  if (LEVELS[level] < currentLevel()) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...(fields ? redact(fields) : {}),
  });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

module.exports = {
  debug: (m, f) => log("debug", m, f),
  info: (m, f) => log("info", m, f),
  warn: (m, f) => log("warn", m, f),
  error: (m, f) => log("error", m, f),
  redact,
};
