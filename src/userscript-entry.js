// The browser half: DOM tokens -> batchexecute -> normalized turns.
//
// The fetch is injected rather than reached for directly. That is what lets the
// whole path run offline against the recorded responses, and it keeps the only
// impure call behind one seam the Mac run actually exercises.
//
// Nothing here decides anything about page numbers, headings, or validation.
// That stays in the ingest core, which this module feeds and never reinterprets.

import {
  AdapterHardError,
  RPC_ID,
  DEFAULT_LIMIT,
  buildPageRequest,
  extractRpcPayload,
  parseRpcPayload,
  normalizeTurns,
  formatPaginationLine,
} from './adapter.js';
import { readAuthTokens, readAuthUser, redactSecrets } from './browser-tokens.js';

export const CONTENT_TYPE = 'application/x-www-form-urlencoded;charset=UTF-8';
export const REQUEST_TIMEOUT_MS = 30000;

/**
 * Read the page HTML and pull the auth tokens out of it.
 *
 * `secrets` is the list that must be handed to redactSecrets before anything
 * from this call reaches a log or an error message.
 */
export function readPageAuth(html, href) {
  const tokens = readAuthTokens(html);
  const authuser = readAuthUser(href);
  return {
    at: tokens.at,
    sid: tokens.sid,
    candidates: tokens.candidates,
    authuser,
    secrets: [tokens.at, tokens.sid].filter(Boolean),
  };
}

/**
 * Classify a failed response using the verified script's verdict vocabulary, so
 * a Mac run reports something comparable to the 2026-10-07 recording.
 */
export function classifyStatus(status) {
  if (status === 401 || status === 403) return 'AUTH_FAILURE';
  if (status === 400) return 'REQUEST_FORMAT_ERROR';
  return 'HTTP_FAILURE';
}

/**
 * One POST round trip.
 *
 * Returns the {turns, nextToken} pair. Throws on every failure path: this never
 * returns null or a default, because a silently empty page is how a notebook
 * ends up archived with a hole in it.
 */
export async function postOnce(fetchImpl, { request, rpcId = RPC_ID, signal }) {
  let response;
  try {
    response = await fetchImpl(request.url, {
      method: request.method,
      // Cookies are the whole auth story; the browser attaches them.
      credentials: 'include',
      headers: request.headers,
      body: request.body,
      signal: signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new AdapterHardError(`fetch failed: ${error?.message || error}`);
  }
  if (!response.ok) {
    throw new AdapterHardError(
      `${classifyStatus(response.status)}: batchexecute returned HTTP ${response.status}`
    );
  }
  const payload = extractRpcPayload(await response.text(), rpcId);
  return parseRpcPayload(payload);
}

/**
 * Collect a conversation from one page's own HTML to normalized turns.
 *
 * fetchImpl is the only injected dependency. The offline tests drive this with
 * a stub over the recorded responses; the Mac userscript passes `fetch`.
 *
 * This issues exactly one request and reports the next-page token rather than
 * following it. See CONTINUATION_UNPROVEN for why.
 */
export async function collectConversation({
  html,
  href,
  notebookId,
  conversationId,
  rpcId = RPC_ID,
  limit = DEFAULT_LIMIT,
  fetchImpl,
  signal,
}) {
  const page = readPageAuth(html, href);
  if (!page.at || !page.sid) {
    const missing = [!page.at && 'at', !page.sid && 'f.sid'].filter(Boolean).join(' and ');
    throw new AdapterHardError(
      `TOKEN_EXTRACTION_FAILED: no ${missing} token found in the page` +
      (page.candidates.length
        ? `; discovery candidates were ${page.candidates.map((c) => c.key).join(', ')}`
        : '')
    );
  }

  const request = buildPageRequest({
    conversationId,
    notebookId,
    sid: page.sid,
    at: page.at,
    limit,
    authuser: page.authuser,
  });

  const { turns: wireTurns, nextToken } = await postOnce(fetchImpl, { request, rpcId, signal });
  const turns = normalizeTurns(wireTurns);

  return {
    turns,
    exhausted: nextToken === null,
    nextPageTokenPresent: nextToken !== null,
    limit,
    paginationLine: formatPaginationLine({
      turnCount: turns.length,
      pageCount: 1,
      limit,
      exhausted: nextToken === null,
    }),
    secrets: page.secrets,
  };
}

/**
 * Page 2 onward is unproven, and this module deliberately does not fake it.
 *
 * The 2026-10-05 recording contains exactly one continuation attempt: at limit
 * 100, `summary.json` records page 2 with `token_param_index: 1` and
 * `overlap: 100`, meaning every row of page 2 duplicated page 1 and the run
 * did not advance. `buildFReq` still emits the first-page shape only, so
 * collectConversation stops at one page and reports the token's presence.
 *
 * This matters for how the result must be read. A run that reports
 * exhausted: false has NOT proven it saw the whole conversation, and the
 * pagination line says so in words rather than claiming full coverage.
 *
 * Guessing the continuation shape would ship unverified request construction.
 * `token_param_index: 1` is the lead to follow on the Mac, not a shape to
 * trust. The target conversation returns all 174 turns in a single page at
 * limit 200 or more with exhaustion confirmed, so Phase D never reaches it.
 */
export const CONTINUATION_UNPROVEN = {
  recordedAttempt: { page: 2, token_param_index: 1, rows: 100, overlap: 100, has_next_token: true },
  conclusion: 'continuation request shape is unknown and must be captured on the Mac',
};

/**
 * Turn any failure into the verdict vocabulary, with secrets stripped. Nothing
 * carrying a raw token may leave this module.
 */
export function describeFailure(error, secrets = []) {
  const message = String(error?.message || error);
  const verdict = ['TOKEN_EXTRACTION_FAILED', 'AUTH_FAILURE', 'REQUEST_FORMAT_ERROR', 'HTTP_FAILURE']
    .find((code) => message.includes(code)) ?? 'FETCH_OR_PARSE_FAILED';
  return { verdict, detail: redactSecrets(message, secrets) };
}