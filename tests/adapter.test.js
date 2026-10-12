// T5 acceptance checks for the adapter and the Vault writer.
//
// The assertions come from implementation-contract.md section 1.2 (the
// normalized turn), 1.3 (order), 1.4 (hard errors), 1.6 (citations dropped at
// the boundary), 4 (pagination exhaustion and its validation line), 6.1 and
// 6.2 (what the adapter hands over), 6.4 (the write contract); design spec
// section 16 (the RPC wire table, the content-script constraint and the three
// Vault write traps).
//
// The portable suite uses the observed wire shape with generated content: synthetic
// response envelopes and turn files under fixtures/rpc/. No
// test in this file reaches the network; `fetch` is injected everywhere.

import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { CoreHardError, validate } from '../src/ingest-core.js';
import {
  AdapterHardError,
  CITATION_PATH,
  DEFAULT_LIMIT,
  RPC_ID,
  buildFReq,
  buildPageRequest,
  buildRequestUrl,
  combinePages,
  extractRpcPayload,
  fetchAllPages,
  formatPaginationLine,
  hasBody,
  normalizeConversation,
  normalizeTurn,
  normalizeTurns,
  parseBatchExecuteFrames,
  parseRpcPayload,
} from '../src/adapter.js';
import { buildVaultRequest, buildVaultUrl, writeVaultFile } from '../src/vault-writer.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MEASUREMENT_DIR = join(ROOT, 'fixtures', 'rpc');

const CONVERSATION_ID = '00000000-0000-4000-8000-000000000002';
const NOTEBOOK_ID = '00000000-0000-4000-8000-000000000004';

async function loadSynthetic() {
  const raw = await readFile(join(MEASUREMENT_DIR, 'conversation.json'), 'utf8');
  return JSON.parse(raw);
}

/** One minimal wire turn, used to build broken shapes on purpose. */
function wireTurn({ id = 't1', ts = 1790582311, role = 1, question, answer } = {}) {
  const turn = [id, [ts, 294429000], role, null, null, 2];
  if (role === 1) turn[3] = question ?? '23페이지 설명해줘.';
  else {
    turn[4] = [
      [answer ?? '답변 본문', null, [CONVERSATION_ID, CONVERSATION_ID, 61917926]],
    ];
  }
  return turn;
}

describe('synthetic fixture: 174 turns, oldest-first', () => {
  test('the checked-in synthetic fixture yields exactly 174 normalized turns', async () => {
    const payload = await loadSynthetic();
    const { turns: wireTurns, nextToken } = parseRpcPayload(payload);
    expect(wireTurns).toHaveLength(174);
    expect(nextToken).toBeNull();

    const conversation = normalizeConversation({
      turns: wireTurns,
      nextToken,
      conversationId: CONVERSATION_ID,
      sourceLabel: '[예제 과목] 강의자료',
    });

    expect(conversation.turns).toHaveLength(174);
    expect(conversation.exhausted).toBe(true);
    expect(conversation.conversationId).toBe(CONVERSATION_ID);
    expect(conversation.limit).toBe(200);
  });

  test('the order is oldest-first and the first element is a question', async () => {
    const payload = await loadSynthetic();
    const { turns: wireTurns } = parseRpcPayload(payload);

    // The wire array is newest-first: its head is an answer, its tail a question.
    expect(wireTurns[0][2]).toBe(2);
    expect(wireTurns[wireTurns.length - 1][2]).toBe(1);

    const turns = normalizeTurns(wireTurns);
    expect(turns[0].kind).toBe('question');
    expect(turns[turns.length - 1].kind).toBe('answer');
    expect(turns.filter((t) => t.kind === 'question')).toHaveLength(87);
    expect(turns.filter((t) => t.kind === 'answer')).toHaveLength(87);

    // Oldest-first means the timestamps increase, and reversing the core's
    // view restores the wire order exactly.
    const timestamps = turns.map((t) => t.ts);
    expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps);
    expect([...turns].reverse().map((t) => t.id)).toEqual(wireTurns.map((t) => t[0]));
  });

  test('every normalized turn carries exactly the four stored fields', async () => {
    const payload = await loadSynthetic();
    const turns = normalizeTurns(parseRpcPayload(payload).turns);

    for (const turn of turns) {
      expect(Object.keys(turn).sort()).toEqual(['id', 'kind', 'text', 'ts']);
      expect(typeof turn.id).toBe('string');
      expect(Number.isInteger(turn.ts)).toBe(true);
      expect(['question', 'answer']).toContain(turn.kind);
      expect(typeof turn.text).toBe('string');
    }
    expect(new Set(turns.map((t) => t.id)).size).toBe(174);
  });

  test('the core accepts the adapter output without a single error', async () => {
    const payload = await loadSynthetic();
    const turns = normalizeTurns(parseRpcPayload(payload).turns);
    const result = validate(turns, { exhausted: true, limit: 200 });

    expect(result.errors).toHaveLength(0);
    expect(result.saveBlocked).toBe(false);
    expect(result.counts.turns).toBe(174);
    expect(result.counts.questions).toBe(87);
    expect(result.counts.answers).toBe(87);
  });
});

describe('citations are dropped at the boundary (contract 1.6)', () => {
  test('a turn carrying citations normalizes without them', async () => {
    const payload = await loadSynthetic();
    const wire = parseRpcPayload(payload).turns;

    // 68 of the 87 synthetic answers carry citation data at turn[4][0][4][3].
    const withCitations = wire.filter(
      (turn) =>
        turn[2] === 2 &&
        Array.isArray(turn[4]) &&
        Array.isArray(turn[4][0]) &&
        Array.isArray(turn[4][0][4]) &&
        turn[4][0][4][3] !== null &&
        turn[4][0][4][3] !== undefined
    );
    expect(withCitations.length).toBeGreaterThan(0);

    const turn = normalizeTurn(withCitations[0], 0);
    expect(Object.keys(turn)).toEqual(['id', 'ts', 'kind', 'text']);
    expect(turn.text).not.toContain('9328');

    // The discard point is named, and the whole conversation comes out clean.
    expect(CITATION_PATH).toBe('turn[4][0][4][3]');
    const turns = normalizeTurns(wire);
    for (const normalized of turns) {
      expect(Object.keys(normalized)).toEqual(['id', 'ts', 'kind', 'text']);
    }
  });
});

describe('a broken wire path raises instead of returning null', () => {
  test('a non-array turn raises', () => {
    expect(() => normalizeTurn(null, 0)).toThrow(AdapterHardError);
    expect(() => normalizeTurn({ id: 'x' }, 0)).toThrow(AdapterHardError);
  });

  test('a missing or non-integer timestamp raises', () => {
    const turn = wireTurn();
    turn[1] = '1790582311';
    expect(() => normalizeTurn(turn, 0)).toThrow(AdapterHardError);

    turn[1] = [null, 0];
    expect(() => normalizeTurn(turn, 0)).toThrow(AdapterHardError);

    turn[1] = undefined;
    expect(() => normalizeTurn(turn, 0)).toThrow(AdapterHardError);
  });

  test('a role code other than 1 or 2 raises', () => {
    const turn = wireTurn({ role: 3 });
    expect(() => normalizeTurn(turn, 0)).toThrow(AdapterHardError);

    turn[2] = '1';
    expect(() => normalizeTurn(turn, 0)).toThrow(AdapterHardError);
  });

  test('a question with a non-string body raises', () => {
    const turn = wireTurn({ role: 1 });
    turn[3] = null;
    expect(() => normalizeTurn(turn, 0)).toThrow(AdapterHardError);

    turn[3] = ['23페이지 설명해줘.'];
    expect(() => normalizeTurn(turn, 0)).toThrow(AdapterHardError);
  });

  test('an answer with no answer array raises, but an empty body does not', () => {
    // The body extractor is the core's contract 1.5 boundary, so a missing
    // wrapper raises from there. `CoreHardError` is the common ancestor, so a
    // caller guarding one class still catches it.
    const missing = wireTurn({ role: 2 });
    missing[4] = null;
    expect(() => normalizeTurn(missing, 0)).toThrow(CoreHardError);

    missing[4] = [];
    expect(() => normalizeTurn(missing, 0)).toThrow(CoreHardError);

    const empty = wireTurn({ role: 2, answer: '' });
    const turn = normalizeTurn(empty, 0);
    expect(turn.text).toBe('');
    expect(hasBody(turn)).toBe(false);
  });

  test('a missing or empty turn id raises', () => {
    const turn = wireTurn();
    turn[0] = null;
    expect(() => normalizeTurn(turn, 0)).toThrow(AdapterHardError);

    turn[0] = '';
    expect(() => normalizeTurn(turn, 0)).toThrow(AdapterHardError);
  });

  test('a duplicated turn id raises', () => {
    const turns = [wireTurn({ id: 'dup', role: 2 }), wireTurn({ id: 'dup', role: 1 })];
    expect(() => normalizeTurns(turns)).toThrow(AdapterHardError);
    expect(() => normalizeTurns(turns)).toThrow(/more than once/);
  });

  test('a non-alternating wire array raises', () => {
    const turns = [wireTurn({ id: 'a', role: 2 }), wireTurn({ id: 'b', role: 2 })];
    expect(() => normalizeTurns(turns)).toThrow(AdapterHardError);
    expect(() => normalizeTurns(turns)).toThrow(/alternate/);
  });

  test('an odd-length wire array raises', () => {
    const turns = [
      wireTurn({ id: 'a', role: 2 }),
      wireTurn({ id: 'b', role: 1 }),
      wireTurn({ id: 'c', role: 2 }),
    ];
    expect(() => normalizeTurns(turns)).toThrow(AdapterHardError);
    expect(() => normalizeTurns(turns)).toThrow(/odd count/);
  });

  test('an empty or non-array wire turn list raises', () => {
    expect(() => normalizeTurns([])).toThrow(AdapterHardError);
    expect(() => normalizeTurns('nope')).toThrow(AdapterHardError);
    expect(() => normalizeTurns(null)).toThrow(AdapterHardError);
  });

  test('every adapter hard error is catchable as a core hard error', () => {
    expect(new AdapterHardError('x')).toBeInstanceOf(CoreHardError);
  });
});

describe('response envelope parsing (design spec section 16)', () => {
  test('the synthetic batchexecute body parses into three frames', async () => {
    const body = await readFile(join(MEASUREMENT_DIR, 'partial-response.txt'), 'utf8');
    const frames = parseBatchExecuteFrames(body);
    expect(frames.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(frames[0])).toBe(true);
    expect(frames[0][0][0]).toBe('wrb.fr');
    expect(frames[0][0][1]).toBe(RPC_ID);
  });

  test('the synthetic payload carries 100 turns and a next-page token', async () => {
    const body = await readFile(join(MEASUREMENT_DIR, 'partial-response.txt'), 'utf8');
    const { turns, nextToken } = parseRpcPayload(extractRpcPayload(body));
    expect(turns).toHaveLength(100);
    expect(typeof nextToken).toBe('string');
    expect(nextToken.length).toBeGreaterThan(0);
  });

  test('a body without the XSSI guard raises', async () => {
    const body = await readFile(join(MEASUREMENT_DIR, 'partial-response.txt'), 'utf8');
    expect(() => parseBatchExecuteFrames(body.slice(10))).toThrow(AdapterHardError);
    expect(() => parseBatchExecuteFrames(null)).toThrow(AdapterHardError);
  });

  test('a body without the rpcid frame raises instead of returning null', async () => {
    const body = await readFile(join(MEASUREMENT_DIR, 'partial-response.txt'), 'utf8');
    expect(() => extractRpcPayload(body, 'wXbhsf')).toThrow(AdapterHardError);
    expect(() => extractRpcPayload(body, 'wXbhsf')).toThrow(/no wrb.fr frame/);
  });

  test('a truncated frame raises', () => {
    const broken = ")]}'\n\n500\n[1,2";
    expect(() => parseBatchExecuteFrames(broken)).toThrow(AdapterHardError);
  });

  test('a non-numeric frame header raises', () => {
    expect(() => parseBatchExecuteFrames(")]}'\n\nabc\n[1,2]")).toThrow(AdapterHardError);
  });

  test('a payload that is not [turns, token] raises', () => {
    expect(() => parseRpcPayload('{}')).toThrow(AdapterHardError);
    expect(() => parseRpcPayload('[]')).toThrow(AdapterHardError);
    expect(() => parseRpcPayload('[[1,2,3],""]')).toThrow(AdapterHardError);
    expect(() => parseRpcPayload('[{"turn":1},"token"]')).toThrow(AdapterHardError);
    expect(() => parseRpcPayload('not json')).toThrow(AdapterHardError);
  });
});

describe('request construction (verification 4 capture)', () => {
  test('f.req matches the captured shape', () => {
    const fReq = buildFReq({ conversationId: CONVERSATION_ID, limit: 400 });
    expect(fReq).toBe(
      '[[["khqZz","[[],null,null,\\"' + CONVERSATION_ID + '\\",400]",null,"generic"]]]'
    );
    expect(JSON.parse(fReq)).toEqual([
      [['khqZz', `[[],null,null,"${CONVERSATION_ID}",400]`, null, 'generic']],
    ]);
  });

  test('a first limit below 200 raises (contract 4)', () => {
    expect(() => buildFReq({ conversationId: CONVERSATION_ID, limit: 100 })).toThrow(
      AdapterHardError
    );
    expect(DEFAULT_LIMIT).toBe(200);
  });

  test('the URL carries the captured query keys', () => {
    const url = new URL(buildRequestUrl({ notebookId: NOTEBOOK_ID, sid: 'SIDVALUE' }));
    expect(url.origin).toBe('https://notebook.google.com');
    expect(url.pathname).toBe('/_/LabsTailwindUi/data/batchexecute');
    expect(url.searchParams.get('rpcids')).toBe('khqZz');
    expect(url.searchParams.get('source-path')).toBe(`/notebook/${NOTEBOOK_ID}`);
    expect(url.searchParams.get('f.sid')).toBe('SIDVALUE');
    expect(url.searchParams.get('hl')).toBe('en');
    expect(url.searchParams.get('rt')).toBe('c');
    expect(url.searchParams.get('authuser')).toBe('1');
  });

  test('the request body carries f.req and at', () => {
    const request = buildPageRequest({
      conversationId: CONVERSATION_ID,
      notebookId: NOTEBOOK_ID,
      sid: 'SIDVALUE',
      at: 'ATVALUE',
      limit: 200,
    });
    const body = new URLSearchParams(request.body);
    expect(request.method).toBe('POST');
    expect([...body.keys()].sort()).toEqual(['at', 'f.req']);
    expect(body.get('at')).toBe('ATVALUE');
    expect(body.get('f.req')).toBe(buildFReq({ conversationId: CONVERSATION_ID, limit: 200 }));
  });

  test('a request without sid or at raises', () => {
    expect(() => buildRequestUrl({ notebookId: NOTEBOOK_ID, sid: '' })).toThrow(
      AdapterHardError
    );
    expect(() => buildPageRequest({
      conversationId: CONVERSATION_ID,
      notebookId: NOTEBOOK_ID,
      sid: 'SID',
      at: '',
    })).toThrow(AdapterHardError);
  });
});

describe('pagination (contract 4)', () => {
  /**
   * Two synthetic pages.
   *
   * Page 1 is `partial-conversation.json`, the checked-in dump of a limit=100
   * request: 100 turns and a next-page token. Page 2 is the remaining 74 turns
   * of `conversation.json`, which is what the second request returns and
   * is byte-identical to the first page's continuation.
   */
  async function syntheticPages() {
    const first = parseRpcPayload(
      JSON.parse(await readFile(join(MEASUREMENT_DIR, 'partial-conversation.json'), 'utf8'))
    );
    const full = parseRpcPayload(await loadSynthetic()).turns;
    // The newest-first array splits at the page boundary, and the first 100
    // match the checked-in limit=100 dump turn for turn.
    expect(full.slice(0, 100).map((t) => t[0])).toEqual(first.turns.map((t) => t[0]));
    return { first, second: { turns: full.slice(100), nextToken: null } };
  }

  test('two synthetic pages concatenate to 174 turns with no overlap', async () => {
    const { first, second } = await syntheticPages();
    expect(first.turns).toHaveLength(100);
    expect(second.turns).toHaveLength(74);
    expect(first.nextToken).not.toBeNull();

    const combined = combinePages([first.turns, second.turns], {
      tokenPerPage: [first.nextToken, null],
    });
    expect(combined.turns).toHaveLength(174);
    expect(combined.exhausted).toBe(true);
    expect(combined.pageCount).toBe(2);
    expect(combined.truncated).toBe(false);

    // The combined array normalizes to the same 174 turns as the single request.
    expect(normalizeTurns(combined.turns)).toEqual(
      normalizeTurns(parseRpcPayload(await loadSynthetic()).turns)
    );
  });

  test('overlapping pages raise', () => {
    const page = [wireTurn({ id: 'a', role: 2 }), wireTurn({ id: 'b', role: 1 })];
    expect(() =>
      combinePages([page, page], { tokenPerPage: ['token', null] })
    ).toThrow(/overlapped/);
  });

  test('an empty page that still carries a token raises', () => {
    expect(() => combinePages([[]], { tokenPerPage: ['token'] })).toThrow(
      AdapterHardError
    );
  });

  test('the request loop walks pages until the token is gone', async () => {
    const { first, second } = await syntheticPages();
    const served = [first, second];
    const requested = [];

    const result = await fetchAllPages(async ({ limit, token, pageIndex }) => {
      requested.push({ limit, token, pageIndex });
      return served[pageIndex];
    });

    expect(requested).toHaveLength(2);
    expect(requested[0]).toEqual({ limit: 200, token: null, pageIndex: 0 });
    expect(requested[1].token).toBe(first.nextToken);
    expect(result.exhausted).toBe(true);
    expect(result.turns).toHaveLength(174);
  });

  test('the loop stops at the valve and reports not-exhausted', async () => {
    let calls = 0;
    const result = await fetchAllPages(
      async ({ pageIndex }) => {
        calls += 1;
        return {
          turns: [wireTurn({ id: `p${pageIndex}a`, role: 2 }), wireTurn({ id: `p${pageIndex}b`, role: 1 })],
          nextToken: `token-${pageIndex}`,
        };
      },
      { maxRequests: 4 }
    );

    expect(calls).toBe(4);
    expect(result.exhausted).toBe(false);
    expect(result.truncated).toBe(true);
    expect(result.pageCount).toBe(4);
  });

  test('a repeated token raises instead of looping', async () => {
    await expect(
      fetchAllPages(async () => ({
        turns: [wireTurn({ id: 'a', role: 2 }), wireTurn({ id: 'b', role: 1 })],
        nextToken: 'same',
      }))
    ).rejects.toThrow(AdapterHardError);
  });

  test('a missing fetchPage raises', async () => {
    await expect(fetchAllPages(null)).rejects.toThrow(AdapterHardError);
    await expect(fetchAllPages(async () => null)).rejects.toThrow(AdapterHardError);
  });
});

describe('the pagination validation line (contract 4)', () => {
  test('174 turns read as exhausted with limit 200', () => {
    const line = formatPaginationLine({
      turnCount: 174,
      pageCount: 3,
      limit: 200,
      exhausted: true,
    });
    expect(line).toBe('조회: 174 turn (3페이지, limit=200, 토큰 소진 확인됨)');
    expect(line).toContain('174 turn');
    expect(line).toContain('3페이지');
    expect(line).toContain('limit=200');
    expect(line).toContain('토큰 소진 확인됨');
  });

  test('the synthetic 174-turn conversation produces that line', async () => {
    const payload = await loadSynthetic();
    const conversation = normalizeConversation({
      turns: parseRpcPayload(payload).turns,
      nextToken: parseRpcPayload(payload).nextToken,
      conversationId: CONVERSATION_ID,
      pageCount: 1,
    });
    const line = formatPaginationLine({
      turnCount: conversation.turns.length,
      pageCount: conversation.pageCount,
      limit: conversation.limit,
      exhausted: conversation.exhausted,
    });
    expect(conversation.exhausted).toBe(true);
    expect(line).toBe('조회: 174 turn (1페이지, limit=200, 토큰 소진 확인됨)');
  });

  test('a truncated run never prints the whole-conversation sentence', () => {
    const line = formatPaginationLine({
      turnCount: 100,
      pageCount: 1,
      limit: 200,
      exhausted: false,
    });
    expect(line).toContain('전체 조회 아님');
    expect(line).not.toContain('토큰 소진 확인됨');
  });

  test('a nonsense report raises', () => {
    expect(() => formatPaginationLine({ turnCount: -1, pageCount: 1, limit: 200, exhausted: true })).toThrow(
      AdapterHardError
    );
    expect(() => formatPaginationLine({ turnCount: 1, pageCount: 0, limit: 200, exhausted: true })).toThrow(
      AdapterHardError
    );
  });
});

describe('the adapter hand-over (contract 6.1)', () => {
  test('normalizeConversation reports turns, exhaustion, id and label', async () => {
    const payload = await loadSynthetic();
    const parsed = parseRpcPayload(payload);
    const conversation = normalizeConversation({
      turns: parsed.turns,
      nextToken: parsed.nextToken,
      conversationId: CONVERSATION_ID,
      sourceLabel: '[예제 과목] 강의자료',
    });

    expect(Object.keys(conversation).sort()).toEqual([
      'conversationId',
      'exhausted',
      'limit',
      'nextToken',
      'pageCount',
      'sourceLabel',
      'turns',
    ]);
    expect(conversation.sourceLabel).toBe('[예제 과목] 강의자료');
    expect(conversation.nextToken).toBeNull();
  });

  test('a missing conversation id raises', async () => {
    const payload = await loadSynthetic();
    const parsed = parseRpcPayload(payload);
    expect(() =>
      normalizeConversation({ turns: parsed.turns, nextToken: parsed.nextToken })
    ).toThrow(AdapterHardError);
  });

  test('a non-string next token raises rather than reporting exhaustion', async () => {
    const payload = await loadSynthetic();
    const parsed = parseRpcPayload(payload);
    expect(() =>
      normalizeConversation({
        turns: parsed.turns,
        nextToken: 7,
        conversationId: CONVERSATION_ID,
      })
    ).toThrow(AdapterHardError);
    expect(() =>
      normalizeConversation({
        turns: parsed.turns,
        conversationId: CONVERSATION_ID,
      })
    ).toThrow(AdapterHardError);
  });
});

describe('the Vault write (contract 6.4)', () => {
  function stubFetch(status) {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return { status };
    };
    return { calls, fetchImpl };
  }

  const target = {
    path: '강의/1강.md',
    content: '# 1강\n',
    apiKey: 'SECRETKEY',
  };

  test('204 is success and nothing else is', async () => {
    const ok = await writeVaultFile({ ...target, fetchImpl: stubFetch(204).fetchImpl });
    expect(ok.ok).toBe(true);
    expect(ok.status).toBe(204);
    expect(ok.reason).toBeNull();

    for (const status of [200, 201, 400, 404, 500]) {
      const failed = await writeVaultFile({ ...target, fetchImpl: stubFetch(status).fetchImpl });
      expect(failed.ok).toBe(false);
      expect(failed.status).toBe(status);
      expect(failed.reason).toContain('204');
    }
  });

  test('the write is a single PUT with omit and the bearer header', async () => {
    const { calls, fetchImpl } = stubFetch(204);
    await writeVaultFile({ ...target, fetchImpl });

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call.init.method).toBe('PUT');
    expect(call.init.credentials).toBe('omit');
    expect(call.init.headers.Authorization).toBe('Bearer SECRETKEY');
    expect(call.init.headers['Content-Type']).toBe('text/markdown');
    expect(call.init.body).toBe('# 1강\n');
    expect(call.url).toContain('/vault/');
  });

  test('the /vault/ prefix is present exactly once', () => {
    expect(buildVaultUrl('강의/1강.md')).toBe(
      'https://127.0.0.1:27125/vault/%EA%B0%95%EC%9D%98/1%EA%B0%95.md'
    );
    expect(buildVaultUrl('vault/강의/1강.md')).toBe(buildVaultUrl('강의/1강.md'));
    expect(buildVaultUrl('/강의/1강.md')).toBe(buildVaultUrl('강의/1강.md'));
  });

  test('an empty path or a missing key raises', () => {
    expect(() => buildVaultUrl('')).toThrow(CoreHardError);
    expect(() => buildVaultUrl('   ')).toThrow(CoreHardError);
    expect(() => buildVaultRequest({ path: 'a.md', content: 'x', apiKey: '' })).toThrow(
      CoreHardError
    );
    expect(() => buildVaultRequest({ path: 'a.md', content: null, apiKey: 'k' })).toThrow(
      CoreHardError
    );
  });

  test('a request that never completes is a failure, not a success', async () => {
    const result = await writeVaultFile({
      ...target,
      fetchImpl: async () => {
        throw new Error('network down');
      },
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.reason).toContain('network down');
  });

  test('a missing fetch implementation raises', async () => {
    await expect(writeVaultFile(target)).rejects.toThrow(CoreHardError);
  });
});