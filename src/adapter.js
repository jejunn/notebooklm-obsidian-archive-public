// Adapter — the only layer that knows the NotebookLM wire format.
//
// Contract reference: implementation-contract.md section 1.1 (the boundary is
// drawn here), 1.2 (the normalized turn, five-field table), 1.3 (order),
// 1.4 (hard errors, never a silent null), 1.5 (the body is already Markdown),
// 1.6 (citations are dropped at this boundary), 4 (pagination exhaustion),
// 6.1 and 6.2 (what the adapter hands to the core and its six duties);
// design spec section 16 ("content script 제약" and "RPC wire 구조").
//
// Everything above this file is pure and offline. Everything below it is
// dependent: this module performs the batchexecute POST and the Vault PUT. The
// separation is the whole point of contract 1.1 — when the unofficial RPC
// changes, this file is rewritten and the core is not touched.
//
// Two deliberate choices:
//
//  1. `fetchImpl` is injected everywhere. Nothing here reaches for a global.
//     That is what lets the acceptance tests run on the host with bun, with no
//     network and no browser (contract consistency note 7).
//  2. Every broken wire path raises. The alternative is `null`, and a null that
//     reaches a four-year-old archive leaves no trace of why content vanished
//     (contract 1.4, design spec section 16).

import { CoreHardError, extractAnswerBody } from './ingest-core.js';

/**
 * A hard error raised by the adapter.
 *
 * It extends the core's `CoreHardError` on purpose: a caller that already
 * guards against broken structure catches one class, and the adapter is the
 * most likely place for the shape to be wrong.
 */
export class AdapterHardError extends CoreHardError {
  constructor(message) {
    super(message);
    this.name = 'AdapterHardError';
  }
}

// ---------------------------------------------------------------------------
// Wire constants (design spec section 16, "RPC wire 구조")
// ---------------------------------------------------------------------------

/** The batchexecute RPC id that returns conversation turns. */
export const RPC_ID = 'khqZz';
/** The batchexecute path on the NotebookLM origin. */
export const RPC_PATH = '/_/LabsTailwindUi/data/batchexecute';
/** NotebookLM web app origin; the adapter runs inside this page. */
export const RPC_ORIGIN = 'https://notebook.google.com';

/**
 * The first page size.
 *
 * Contract 4: "첫 limit 200 이상. 100 미만 금지". The measured run shows
 * limit=200 and limit=400 both succeeding after an earlier limit=200 RPC code
 * 3 error, and the contract forbids reading that as a server cap of 100.
 */
export const DEFAULT_LIMIT = 200;

/**
 * Pagination safety valve.
 *
 * Contract 4: after this many requests a still-present token is reported as
 * "not the whole conversation" instead of looping forever. An infinite loop and
 * a silent truncation are the same grade of danger, so both are defended.
 */
export const MAX_PAGE_REQUESTS = 50;

/** Wire role code to normalized kind (contract 1.2). */
const WIRE_KIND = Object.freeze({ 1: 'question', 2: 'answer' });

/** The kind the newest-first wire array starts with (contract 1.3). */
const NEWEST_FIRST_HEAD = 'answer';

/**
 * Where citations live on the wire.
 *
 * Contract 1.6. This constant is documentation, not a read path. The
 * normalization below never dereferences it, and no function in this file
 * copies a citation out and then throws it away — a code path that reads
 * citations and discards them is exactly the path that becomes a bug source
 * when citations are revived. Restoring them later means deleting this
 * constant, not editing a discard branch.
 */
export const CITATION_PATH = 'turn[4][0][4][3]';

// ---------------------------------------------------------------------------
// Response envelope
// ---------------------------------------------------------------------------

/** The XSSI guard every batchexecute response starts with. */
const XSSI_PREFIX = ")]}'";

/**
 * The fixed difference between a frame's declared count and its payload length
 * in UTF-16 code units, measured across all 18 frames of the 8 checked-in
 * response bodies. See `parseBatchExecuteFrames`.
 */
const FRAME_COUNT_OFFSET = 2;

/**
 * Remove the XSSI guard prefix.
 *
 * @param {string} text a raw HTTP response body
 * @returns {string}
 */
export function stripXssiPrefix(text) {
  if (typeof text !== 'string') {
    throw new AdapterHardError(`batchexecute response body is not a string: ${typeof text}`);
  }
  if (!text.startsWith(XSSI_PREFIX)) {
    throw new AdapterHardError(
      `batchexecute response does not start with the ${XSSI_PREFIX} guard prefix`
    );
  }
  return text.slice(XSSI_PREFIX.length);
}

/**
 * Parse a batchexecute response body into its frames.
 *
 * The framing is a decimal count on its own line, then one JSON frame, then a
 * newline, then the next frame.
 *
 * The declared count is NOT a byte count, so it cannot be used to slice. On
 * every frame of the 2026-10-05 measurement it equals the payload's UTF-16 code
 * unit length plus exactly 2 — the 2.17 MB frame declares 1954935 against
 * 1954857 characters, 1954933 UTF-16 units and 2173000 bytes, and the 55-byte
 * frames declare 57. All 18 frames across all 8 checked-in response bodies show
 * the same offset, so this is the wire's own convention and not a corrupted
 * capture. Slicing by the declared number cuts a frame in half; slicing by bytes
 * cuts nothing at all. The newline is therefore the boundary, and the declared
 * count is used only as a consistency bound: a count outside the UTF-16 length
 * plus 2 means the framing changed and the body is not trusted.
 *
 * The body is handled as bytes throughout, because the frames hold Korean text
 * and a character count and a byte count differ by more than 18,000 on the
 * largest one.
 *
 * @param {string} text a raw HTTP response body
 * @returns {Array<unknown>} the parsed frames, in order
 */
export function parseBatchExecuteFrames(text) {
  const body = stripXssiPrefix(text);
  const bytes = new TextEncoder().encode(body);
  const decoder = new TextDecoder('utf-8');
  const frames = [];

  let offset = 0;
  while (offset < bytes.length) {
    // Skip the blank lines the guard prefix leaves behind.
    if (bytes[offset] === 0x0a) {
      offset += 1;
      continue;
    }
    const headerEnd = bytes.indexOf(0x0a, offset);
    if (headerEnd === -1) {
      throw new AdapterHardError(
        'batchexecute frame is missing its length line; the envelope changed'
      );
    }
    const header = decoder.decode(bytes.subarray(offset, headerEnd)).trim();
    if (!/^\d+$/.test(header)) {
      throw new AdapterHardError(
        `batchexecute frame header is not a length: ${JSON.stringify(header)}`
      );
    }

    const start = headerEnd + 1;
    const end = bytes.indexOf(0x0a, start);
    const stop = end === -1 ? bytes.length : end;
    const payloadBytes = bytes.subarray(start, stop);
    const payload = decoder.decode(payloadBytes);

    const declared = Number.parseInt(header, 10);
    const utf16Units = payload.length;
    if (declared < utf16Units || declared > utf16Units + FRAME_COUNT_OFFSET) {
      throw new AdapterHardError(
        `batchexecute frame declares ${declared} but the payload has ` +
          `${utf16Units} UTF-16 units; the framing changed`
      );
    }

    try {
      frames.push(JSON.parse(payload));
    } catch (error) {
      throw new AdapterHardError(`batchexecute frame is not valid JSON: ${error.message}`);
    }

    offset = end === -1 ? bytes.length : end + 1;
  }

  return frames;
}

/**
 * Pull the RPC payload string for one rpcid out of the parsed frames.
 *
 * A frame carrying results is `["wrb.fr", <rpcid>, <payload>, ...]`. The
 * payload is itself a JSON string that must be parsed a second time.
 *
 * @param {string} text a raw HTTP response body
 * @param {string} [rpcId]
 * @returns {string} the inner payload, still a JSON string
 */
export function extractRpcPayload(text, rpcId = RPC_ID) {
  for (const frame of parseBatchExecuteFrames(text)) {
    if (!Array.isArray(frame)) continue;
    for (const entry of frame) {
      if (!Array.isArray(entry) || entry.length < 3) continue;
      if (entry[0] !== 'wrb.fr' || entry[1] !== rpcId) continue;
      if (typeof entry[2] !== 'string') {
        throw new AdapterHardError(
          `wrb.fr frame for ${rpcId} does not carry a string payload`
        );
      }
      return entry[2];
    }
  }
  throw new AdapterHardError(`no wrb.fr frame for rpcid ${rpcId} in the response`);
}

/**
 * Parse one RPC payload into the wire turns and the next-page token.
 *
 * The payload is `[turns, nextToken]`. `nextToken` is absent when the
 * conversation is exhausted, which is the only thing that means "the whole
 * conversation" (contract 4).
 *
 * This is also the entry point for the checked-in measurement files, which
 * hold the parsed payload directly rather than the HTTP envelope.
 *
 * @param {string|unknown} payload the inner payload, as text or already parsed
 * @returns {{turns: Array<unknown>, nextToken: string|null}}
 */
export function parseRpcPayload(payload) {
  let parsed = payload;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (error) {
      throw new AdapterHardError(`rpc payload is not valid JSON: ${error.message}`);
    }
  }
  if (!Array.isArray(parsed)) {
    throw new AdapterHardError('rpc payload is not an array');
  }
  if (parsed.length === 0) {
    throw new AdapterHardError('rpc payload is empty');
  }
  const turns = parsed[0];
  if (!Array.isArray(turns)) {
    throw new AdapterHardError('rpc payload[0] is not a turn array');
  }
  if (parsed.length === 1) return { turns, nextToken: null };

  const nextToken = parsed[1];
  if (typeof nextToken !== 'string' || nextToken.length === 0) {
    throw new AdapterHardError(
      `rpc payload[1] is a next-page token but is not a non-empty string: ${typeof nextToken}`
    );
  }
  return { turns, nextToken };
}

// ---------------------------------------------------------------------------
// Normalization (contract 1.2, 1.3, 1.4, 1.6)
// ---------------------------------------------------------------------------

/**
 * Normalize one wire turn into the five-field turn of contract 1.2.
 *
 * The stored fields are `id`, `ts`, `kind` and `text`. `hasBody` is the fifth
 * row of the contract table and is derived, not stored (contract 1.2), which
 * is why it is a separate function and not a property here.
 *
 * `kind` comes from `turn[2]` alone. It is never inferred from position: the
 * wire has no role field name, and a positional guess inverts silently when
 * the order changes (contract 1.2).
 *
 * Citations are not read and not copied (contract 1.6).
 *
 * @param {unknown} wireTurn
 * @param {number} index position in the wire array, for the error message
 * @returns {{id: string, ts: number, kind: 'question'|'answer', text: string}}
 */
export function normalizeTurn(wireTurn, index = 0) {
  if (!Array.isArray(wireTurn)) {
    throw new AdapterHardError(`wire turn ${index} is not an array`);
  }

  const id = wireTurn[0];
  if (typeof id !== 'string' || id.length === 0) {
    throw new AdapterHardError(
      `wire turn ${index} has no string id at turn[0]: ${JSON.stringify(id)}`
    );
  }

  const timestamp = wireTurn[1];
  if (!Array.isArray(timestamp) || !Number.isInteger(timestamp[0])) {
    throw new AdapterHardError(
      `turn ${index} id ${id}: turn[1] is not [unix_seconds, nanoseconds]`
    );
  }

  const roleCode = wireTurn[2];
  const kind = WIRE_KIND[roleCode];
  if (kind === undefined) {
    throw new AdapterHardError(
      `turn ${index} id ${id}: turn[2] is ${JSON.stringify(roleCode)}, not 1 (question) or 2 (answer)`
    );
  }

  let text;
  if (kind === 'question') {
    text = wireTurn[3];
    if (typeof text !== 'string') {
      throw new AdapterHardError(
        `turn ${index} id ${id}: a question has a non-string turn[3]: ${typeof text}`
      );
    }
  } else {
    // An empty answer body is a normal wire state, not an error (contract 1.4).
    // The extractor takes `turn[4][0]`; `turn[4]` is the wrapper array and a
    // missing wrapper reaches the extractor as undefined, which raises.
    text = extractAnswerBody(wireTurn[4]?.[0]);
  }

  return { id, ts: timestamp[0], kind, text };
}

/**
 * Whether a normalized turn carries an answer body.
 *
 * The derived fifth field of contract 1.2. It is not stored on the turn.
 *
 * @param {{kind: string, text: string}} turn
 * @returns {boolean}
 */
export function hasBody(turn) {
  return turn.text !== '';
}

/**
 * Normalize a whole wire turn array into the oldest-first array the core wants.
 *
 * Order: the wire array is newest-first and its last element is the oldest
 * question (contract 1.3). The array is reversed here, once, at the boundary.
 * The core trusts the order it is given and never reorders anything, because a
 * reversed order makes the grouping quietly inverted (contract 1.3, T-ORD-1).
 *
 * Structure: contract 1.4 makes a non-alternating array an adapter hard error,
 * and an odd-length array leaves a question with no answer (design spec
 * section 15a).
 *
 * @param {Array<unknown>} wireTurns
 * @returns {Array<{id: string, ts: number, kind: 'question'|'answer', text: string}>}
 */
export function normalizeTurns(wireTurns) {
  if (!Array.isArray(wireTurns)) {
    throw new AdapterHardError('wire turn array is not an array');
  }
  if (wireTurns.length === 0) {
    throw new AdapterHardError('wire turn array is empty');
  }

  // Newest-first first, so a broken order is reported against the wire.
  const newestFirst = wireTurns.map((turn, index) => normalizeTurn(turn, index));

  const seen = new Set();
  for (const turn of newestFirst) {
    if (seen.has(turn.id)) {
      throw new AdapterHardError(`turn id ${turn.id} appears more than once in the list`);
    }
    seen.add(turn.id);
  }

  let expected = NEWEST_FIRST_HEAD;
  for (let i = 0; i < newestFirst.length; i += 1) {
    if (newestFirst[i].kind !== expected) {
      throw new AdapterHardError(
        `newest-first turn ${i} id ${newestFirst[i].id} is ${newestFirst[i].kind} ` +
          `where ${expected} was required; the wire array must alternate`
      );
    }
    expected = expected === 'question' ? 'answer' : 'question';
  }
  if (newestFirst.length % 2 !== 0) {
    throw new AdapterHardError(
      `wire turn array has ${newestFirst.length} turns, an odd count that leaves a question with no answer`
    );
  }

  return newestFirst.reverse();
}

/**
 * The adapter's whole hand-over to the core (contract 6.1).
 *
 * @param {{turns: Array<unknown>, nextToken: string|null, pageCount?: number, limit?: number, conversationId?: string, sourceLabel?: string}} page
 * @returns {{turns: Array<object>, exhausted: boolean, conversationId: string, sourceLabel: string, pageCount: number, limit: number, nextToken: string|null}}
 */
export function normalizeConversation(page) {
  const { turns, nextToken, pageCount = 1, limit = DEFAULT_LIMIT } = page;
  const conversationId = conversationIdOf(page);
  if (nextToken !== null && (typeof nextToken !== 'string' || nextToken.length === 0)) {
    throw new AdapterHardError(
      `nextToken must be null (exhausted) or a non-empty string, got ${typeof nextToken}`
    );
  }
  return {
    turns: normalizeTurns(turns),
    exhausted: nextToken === null,
    conversationId,
    sourceLabel: page.sourceLabel ?? '',
    pageCount,
    limit,
    nextToken,
  };
}

function conversationIdOf(page) {
  const value = page.conversationId;
  if (typeof value !== 'string' || value.length === 0) {
    throw new AdapterHardError('conversationId must be a non-empty string (contract 6.1)');
  }
  return value;
}

// ---------------------------------------------------------------------------
// Request construction (design spec section 16, mac-verification-4-results.md)
// ---------------------------------------------------------------------------

/**
 * Build the `f.req` form field value.
 *
 * The captured request of verification 4 is the reference shape:
 * `[[["khqZz","[[],null,null,\"<conversation>\",<limit>]",null,"generic"]]]`.
 *
 * @param {{conversationId: string, limit?: number}} options
 * @returns {string}
 */
export function buildFReq({ conversationId, limit = DEFAULT_LIMIT }) {
  if (typeof conversationId !== 'string' || conversationId.length === 0) {
    throw new AdapterHardError('f.req needs a conversation id');
  }
  if (!Number.isInteger(limit) || limit < DEFAULT_LIMIT) {
    throw new AdapterHardError(
      `first limit must be ${DEFAULT_LIMIT} or more (contract 4); got ${limit}`
    );
  }
  const inner = JSON.stringify([[], null, null, conversationId, limit]);
  return JSON.stringify([[['khqZz', inner, null, 'generic']]]);
}

/**
 * Build the batchexecute URL.
 *
 * The query keys are the ones captured in verification 4: `rpcids`,
 * `source-path`, `f.sid`, `hl`, `rt`, `authuser`.
 *
 * @param {{notebookId: string, sid: string, authuser?: number|string, hl?: string, rt?: string, rpcId?: string}} options
 * @returns {string}
 */
export function buildRequestUrl({
  notebookId,
  sid,
  authuser = 1,
  hl = 'en',
  rt = 'c',
  rpcId = RPC_ID,
}) {
  if (typeof notebookId !== 'string' || notebookId.length === 0) {
    throw new AdapterHardError('the request needs a notebook id for source-path');
  }
  if (typeof sid !== 'string' || sid.length === 0) {
    throw new AdapterHardError('the request needs f.sid, extracted from the page DOM');
  }
  const query = new URLSearchParams({
    rpcids: rpcId,
    'source-path': `/notebook/${notebookId}`,
    'f.sid': sid,
    hl,
    rt,
    authuser: String(authuser),
  });
  return `${RPC_ORIGIN}${RPC_PATH}?${query.toString()}`;
}

/**
 * Build the POST request for one page.
 *
 * The form body carries `f.req` and `at`, exactly as captured. The token
 * values are passed in by the caller, which extracts them from the page DOM;
 * this module never reads the DOM and never stores a token.
 *
 * @param {{conversationId: string, notebookId: string, sid: string, at: string, limit?: number, authuser?: number|string}} options
 * @returns {{url: string, method: string, headers: object, body: string}}
 */
export function buildPageRequest(options) {
  const { limit = DEFAULT_LIMIT, conversationId, at } = options;
  if (typeof at !== 'string' || at.length === 0) {
    throw new AdapterHardError('the request needs the at token from the page DOM');
  }
  const fReq = buildFReq({ conversationId, limit });
  return {
    url: buildRequestUrl(options),
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ 'f.req': fReq, at }).toString(),
  };
}

// ---------------------------------------------------------------------------
// Pagination (contract 4)
// ---------------------------------------------------------------------------

/**
 * Concatenate fetched pages and report whether the conversation is exhausted.
 *
 * Pages arrive newest-first, so page 1 holds the newest turns and the last
 * page holds the oldest. Appending in request order therefore yields the
 * newest-first array the normalizer expects, and one reversal at the boundary
 * is enough.
 *
 * Contract 4 defends two failure modes that the design spec does not name: an
 * overlap between pages, and an empty page that still carries a token. Both
 * raise, because a silently duplicated or silently missing block of turns is
 * the same grade of danger as an infinite loop.
 *
 * @param {Array<Array<unknown>>} pages the raw wire turn arrays, in request order
 * @param {{tokenPerPage: Array<string|null>, limit?: number, maxRequests?: number}} options
 * @returns {{turns: Array<unknown>, exhausted: boolean, pageCount: number, limit: number, nextToken: string|null, truncated: boolean}}
 */
export function combinePages(pages, options) {
  const { tokenPerPage, limit = DEFAULT_LIMIT, maxRequests = MAX_PAGE_REQUESTS } = options;
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new AdapterHardError('combinePages needs at least one page');
  }
  if (!Array.isArray(tokenPerPage) || tokenPerPage.length !== pages.length) {
    throw new AdapterHardError('one next-page token per page is required');
  }

  const combined = [];
  const seen = new Set();

  for (let p = 0; p < pages.length; p += 1) {
    const page = pages[p];
    if (!Array.isArray(page)) {
      throw new AdapterHardError(`page ${p} is not a turn array`);
    }
    if (page.length === 0 && tokenPerPage[p] !== null) {
      throw new AdapterHardError(
        `page ${p} returned no turns but still carries a next-page token; the page is broken`
      );
    }
    for (const wireTurn of page) {
      const id = Array.isArray(wireTurn) ? wireTurn[0] : undefined;
      if (seen.has(id)) {
        throw new AdapterHardError(
          `turn id ${String(id)} appears on more than one page; pagination overlapped`
        );
      }
      seen.add(id);
      combined.push(wireTurn);
    }
  }

  const truncated = pages.length >= maxRequests && tokenPerPage[pages.length - 1] !== null;
  const exhausted = !truncated && tokenPerPage[pages.length - 1] === null;

  return {
    turns: combined,
    exhausted,
    pageCount: pages.length,
    limit,
    nextToken: truncated ? tokenPerPage[pages.length - 1] : null,
    truncated,
  };
}

/**
 * Fetch every page of a conversation.
 *
 * `fetchPage` is injected so the acceptance tests drive the pagination loop
 * from fixtures with no network (contract consistency note 7). It receives the
 * `limit` and the `token` — null on the first request — and returns the parsed
 * payload of `{turns, nextToken}`.
 *
 * @param {(request: {limit: number, token: string|null, pageIndex: number}) => Promise<{turns: Array<unknown>, nextToken: string|null}>} fetchPage
 * @param {{limit?: number, maxRequests?: number}} [options]
 * @returns {Promise<{turns: Array<unknown>, exhausted: boolean, pageCount: number, limit: number, nextToken: string|null, truncated: boolean}>}
 */
export async function fetchAllPages(fetchPage, options = {}) {
  const { limit = DEFAULT_LIMIT, maxRequests = MAX_PAGE_REQUESTS } = options;
  if (typeof fetchPage !== 'function') {
    throw new AdapterHardError('fetchAllPages needs a fetchPage function');
  }

  const pages = [];
  const tokenPerPage = [];
  let token = null;

  for (let pageIndex = 0; pageIndex < maxRequests; pageIndex += 1) {
    const page = await fetchPage({ limit, token, pageIndex });
    if (page === null || page === undefined) {
      throw new AdapterHardError(`page ${pageIndex} came back with no payload`);
    }
    const { turns, nextToken } = page;
    pages.push(turns);
    tokenPerPage.push(nextToken);

    if (nextToken === null) {
      return combinePages(pages, { tokenPerPage, limit, maxRequests });
    }
    if (nextToken === token) {
      throw new AdapterHardError(
        `page ${pageIndex} returned the same next-page token as the previous page; the loop cannot advance`
      );
    }
    token = nextToken;
  }

  // The valve fired with a token still in hand (contract 4).
  return combinePages(pages, { tokenPerPage, limit, maxRequests });
}

// ---------------------------------------------------------------------------
// Pagination report line (contract 4)
// ---------------------------------------------------------------------------

/**
 * Render the pagination line of the validation output.
 *
 * Contract 4 fixes the literal for an exhausted conversation:
 *
 *     조회: 174 turn (3페이지, limit=200, 토큰 소진 확인됨)
 *
 * The count in parentheses is the number of RPC pages fetched, not the number
 * of lecture pages; the lecture page count is a separate validation line.
 *
 * `전체 조회` may only be printed when `exhausted` is true (contract 4), so a
 * truncated run prints the opposite sentence instead.
 *
 * @param {{turnCount: number, pageCount: number, limit: number, exhausted: boolean}} report
 * @returns {string}
 */
export function formatPaginationLine({ turnCount, pageCount, limit, exhausted }) {
  if (!Number.isInteger(turnCount) || turnCount < 0) {
    throw new AdapterHardError(`turnCount must be a non-negative integer: ${turnCount}`);
  }
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new AdapterHardError(`pageCount must be at least 1: ${pageCount}`);
  }
  const tail = exhausted ? '토큰 소진 확인됨' : '토큰 소진 확인 안 됨 — 전체 조회 아님';
  return `조회: ${turnCount} turn (${pageCount}페이지, limit=${limit}, ${tail})`;
}