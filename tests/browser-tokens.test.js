import { describe, expect, test } from 'bun:test';
import {
  KNOWN_AT_KEYS,
  KNOWN_SID_KEYS,
  extractWizField,
  listWizCandidates,
  readAuthTokens,
  readAuthUser,
  redactSecrets,
} from '../src/browser-tokens.js';

// A synthetic page carrying the same WIZ_global_data shape the macOS run saw.
// The verified run reported atLength 42 and sidLength 19, so the fixtures below
// use those lengths; the values themselves are invented.
const AT = 'a'.repeat(42);
const SID = 'b'.repeat(19);

function page(extra = '') {
  return `<!doctype html><html><body><script>window.WIZ_global_data = {
    "SNlM0e": "${AT}",
    "FdrFJe": "${SID}",
    "c-wiz": {"data": "RoAdGhUvmxKdxbLlWGlB"},
    "cfb2h": "sunset",
    "QlZUie": "https://ssl.gstatic.com/docs/doclist/images/icon.png",
    ${extra}
  };</script></body></html>`;
}

describe('extractWizField', () => {
  test('reads a double-quoted field from a double-quoted pair', () => {
    expect(extractWizField(page(), 'SNlM0e')).toBe(AT);
    expect(extractWizField(page(), 'FdrFJe')).toBe(SID);
  });

  test('returns null for an absent key rather than throwing', () => {
    expect(extractWizField(page(), 'NopeNotHere')).toBeNull();
  });

  test('unwraps escaped characters inside a JSON string value', () => {
    const html = '<script>{"K":"a\\"b\\\\c"}</script>';
    expect(extractWizField(html, 'K')).toBe('a"b\\c');
  });

  test('decodes HTML-entity encoded pair when raw quotes are absent', () => {
    const html = '<div data-wiz="{&quot;Ent&quot;:&quot;plain-value&quot;}"></div>';
    expect(extractWizField(html, 'Ent')).toBe('plain-value');
  });
});

describe('readAuthTokens', () => {
  test('prefers the known keys and reports where each came from', () => {
    const result = readAuthTokens(page());
    expect(result.at).toBe(AT);
    expect(result.sid).toBe(SID);
    expect(result.source.at).toBe('known:' + KNOWN_AT_KEYS[0]);
    expect(result.source.sid).toBe('known:' + KNOWN_SID_KEYS[0]);
  });

  test('does not run discovery when the known keys resolve', () => {
    expect(readAuthTokens(page()).candidates).toEqual([]);
  });

  test('reports the tokens missing and offers candidates when a key rotates', () => {
    const rotated = page().replace('SNlM0e', 'Xk9Qzz').replace('FdrFJe', 'Yy3Wpp');
    const result = readAuthTokens(rotated);
    expect(result.at).toBeNull();
    expect(result.source.at).toBe('missing');
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  test('knownOnly suppresses the discovery sweep', () => {
    const rotated = page().replace('SNlM0e', 'Xk9Qzz');
    expect(readAuthTokens(rotated, { knownOnly: true }).candidates).toEqual([]);
  });
});

describe('listWizCandidates', () => {
  test('finds opaque string fields and skips structured ones', () => {
    const candidates = listWizCandidates(page());
    const keys = candidates.map((c) => c.key);
    expect(keys).toContain('SNlM0e');
    expect(keys).toContain('FdrFJe');
    // Nested objects and URLs are not opaque tokens.
    expect(keys).not.toContain('c-wiz');
    expect(keys).not.toContain('QlZUie');
  });

  test('finds a token hidden behind an unknown rotated key', () => {
    const rotated = page().replace('SNlM0e', 'Xk9Qzz');
    const candidates = listWizCandidates(rotated);
    expect(candidates.find((c) => c.key === 'Xk9Qzz')?.value).toBe(AT);
    expect(candidates.find((c) => c.key === 'SNlM0e')).toBeUndefined();
  });

  test('skips trivially unusable values', () => {
    const candidates = listWizCandidates(page('"Empty": "", "Flag": "true", "None": "null",'));
    const values = candidates.map((c) => c.value);
    expect(values).not.toContain('');
    expect(values).not.toContain('true');
    expect(values).not.toContain('null');
  });

  test('honours the length window', () => {
    const html = `<script>{"Short":"tiny","Long":"${'x'.repeat(400)}"}</script>`;
    const keys = listWizCandidates(html, { minLength: 8, maxLength: 128 }).map((c) => c.key);
    expect(keys).not.toContain('Short');
    expect(keys).not.toContain('Long');
  });

  test('deduplicates a key seen more than once', () => {
    const html = `<script>{"Dup":"${'x'.repeat(20)}","Dup":"${'y'.repeat(20)}"}</script>`;
    expect(listWizCandidates(html).filter((c) => c.key === 'Dup')).toHaveLength(1);
  });
});

describe('readAuthUser', () => {
  test('echoes authuser back when the URL carries one', () => {
    expect(readAuthUser('https://notebook.google.com/notebook/abc?authuser=0')).toBe('0');
  });

  test('returns null when absent', () => {
    expect(readAuthUser('https://notebook.google.com/notebook/abc')).toBeNull();
  });

  test('returns null on an unparseable href rather than throwing', () => {
    expect(readAuthUser('not a url')).toBeNull();
  });
});

describe('redactSecrets', () => {
  test('removes a known secret in raw and URL-encoded form', () => {
    const secret = 'sup3r/s3cret+value';
    const text = `raw=${secret} encoded=${encodeURIComponent(secret)}`;
    const redacted = redactSecrets(text, [secret]);
    expect(redacted).not.toContain(secret);
    expect(redacted).not.toContain(encodeURIComponent(secret));
    expect(redacted).toBe('raw=[REDACTED] encoded=[REDACTED]');
  });

  test('masks token query parameters even when the value is unknown', () => {
    const redacted = redactSecrets(
      'https://x/?rpcids=khqZz&f.sid=UNKNOWN-SID&at=UNKNOWN-AT&rt=c',
      [],
    );
    expect(redacted).toContain('f.sid=[REDACTED]');
    expect(redacted).toContain('at=[REDACTED]');
    expect(redacted).toContain('rpcids=khqZz');
  });

  test('ignores empty entries in the secret list', () => {
    expect(redactSecrets('unchanged', ['', null, undefined])).toBe('unchanged');
  });
});