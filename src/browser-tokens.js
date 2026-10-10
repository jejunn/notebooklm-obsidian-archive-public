// Browser-side authentication token extraction for the NotebookLM page.
//
// The batchexecute endpoint needs two values that live in the page HTML as
// WIZ_global_data string fields: the `at` token and the `f.sid` token. The keys
// that hold them are minified build artefacts (`SNlM0e`, `FdrFJe` as of
// 2026-10-07) and Google rotates them on deploys, so hardcoding them is the
// most likely thing to break. KNOWN_KEYS is the fast path; the discovery pass
// is the fallback.
//
// This module is DOM-only. It never touches the network, which keeps it
// testable against a synthetic page and keeps the ingest core pure.

export const KNOWN_AT_KEYS = ['SNlM0e'];
export const KNOWN_SID_KEYS = ['FdrFJe'];

// Values that are structurally present on every page and would make a blind
// sweep look like it found something.
const UNUSABLE_VALUES = new Set(['', 'null', 'undefined', 'true', 'false', '{}', '[]']);

/**
 * Pull one WIZ_global_data field out of page HTML.
 *
 * Ported from the macOS-verified nbm-verify-4 user script, which mirrors
 * notebooklm-py 0.8.4's extraction and was confirmed working under Safari's
 * content-script fallback on 2026-10-07. Returns null rather than throwing so a
 * rotated key degrades into the discovery pass instead of a hard failure.
 */
export function extractWizField(html, key) {
  const patterns = [
    new RegExp('"' + key + '"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"'),
    new RegExp("'" + key + "'\\s*:\\s*'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'"),
    new RegExp('&quot;' + key + '&quot;\\s*:\\s*&quot;((?:(?!&quot;).)*)&quot;'),
  ];
  for (let i = 0; i < patterns.length; i++) {
    const match = html.match(patterns[i]);
    if (!match) continue;
    if (i === 0) return decodeJsonString(match[1]);
    if (i === 1) return match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    return decodeHtmlEntities(match[1]);
  }
  return null;
}

function decodeJsonString(raw) {
  try {
    return JSON.parse('"' + raw + '"');
  } catch {
    return null;
  }
}

function decodeHtmlEntities(raw) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
  return raw.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, entity) => {
    const lower = entity.toLowerCase();
    if (lower[0] === '#') {
      const code = lower[1] === 'x'
        ? parseInt(lower.slice(2), 16)
        : parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return named[lower] ?? whole;
  });
}

/**
 * Every plausible string-valued WIZ field on the page, with its key.
 *
 * This is the discovery pass. A rotated build hides the tokens behind unknown
 * minified keys, and the shape of the value is the only stable signal: `at` is a
 * long opaque token and `f.sid` is a shorter opaque one, both distinct from
 * every other field on the page.
 */
export function listWizCandidates(html, { minLength = 8, maxLength = 128 } = {}) {
  const found = new Map();
  const pattern = /"([A-Za-z_$][\w$]{2,40})"\s*:\s*"([^"\\]{1,400})"/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const key = match[1];
    const value = decodeJsonString(match[2]);
    if (value === null) continue;
    if (UNUSABLE_VALUES.has(value)) continue;
    if (value.length < minLength || value.length > maxLength) continue;
    // Opaque tokens have no whitespace and no sentence punctuation.
    if (/[\s<>{}\[\]]/.test(value)) continue;
    // A URL is opaque-looking but is never a token. Skipping them keeps the
    // fallback probe from spending requests on obvious non-candidates.
    if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value)) continue;
    if (value.startsWith('/') && value.includes('/')) continue;
    if (!found.has(key)) found.set(key, value);
  }
  return [...found].map(([key, value]) => ({ key, value }));
}

/**
 * Read the tokens from page HTML, preferring the known keys.
 *
 * Returns { at, sid, source } where source names how each value was found.
 * Either value may be null; the caller decides whether to fall back to the
 * discovery pass or to stop.
 */
export function readAuthTokens(html, { knownOnly = false } = {}) {
  const at = firstPresent(html, KNOWN_AT_KEYS);
  const sid = firstPresent(html, KNOWN_SID_KEYS);
  const result = {
    at: at.value,
    sid: sid.value,
    source: {
      at: at.source,
      sid: sid.source,
    },
    candidates: [],
  };
  if (knownOnly) return result;
  if (!at.value || !sid.value) {
    result.candidates = listWizCandidates(html);
  }
  return result;
}

function firstPresent(html, keys) {
  for (const key of keys) {
    const value = extractWizField(html, key);
    if (value) return { value, source: 'known:' + key };
  }
  return { value: null, source: 'missing' };
}

/**
 * The `authuser` query parameter has to be echoed back when the URL carried
 * one. Verified against artifacts/verification4/request-shape.json, which lists
 * authuser among the query keys of a real captured request.
 */
export function readAuthUser(href) {
  try {
    return new URL(href).searchParams.get('authuser');
  } catch {
    return null;
  }
}

/**
 * Strip known secrets out of any text before it reaches a log, a report, or an
 * error message. Mirrors the verified script's redaction, including the query
 * parameter form so a URL is scrubbed even when the raw value is unknown.
 */
export function redactSecrets(text, secrets = []) {
  let out = String(text);
  for (const secret of secrets) {
    if (!secret) continue;
    out = out.split(secret).join('[REDACTED]');
    out = out.split(encodeURIComponent(secret)).join('[REDACTED]');
  }
  return out.replace(/([?&](?:f\.sid|at)=)[^&\s]*/g, '$1[REDACTED]');
}