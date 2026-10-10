import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  CONTINUATION_UNPROVEN,
  classifyStatus,
  collectConversation,
  describeFailure,
  postOnce,
  readPageAuth,
} from '../src/userscript-entry.js';

const AT = 'a'.repeat(42);
const SID = 'b'.repeat(19);
const NOTEBOOK = '00000000-0000-4000-8000-000000000004';
const CONVERSATION = '00000000-0000-4000-8000-000000000002';

function pageHtml(extra = '') {
  return `<!doctype html><html><body><script>window.WIZ_global_data = {
    "SNlM0e": "${AT}", "FdrFJe": "${SID}"${extra}
  };</script></body></html>`;
}

// The synthetic response for the target conversation, read from the generated
// fixture without private conversation content, so this exercises the observed envelope shape.
const SYNTHETIC = JSON.parse(
  readFileSync(
    new URL('../fixtures/rpc/conversation.json', import.meta.url),
    'utf8'
  )
)[0];

// Framing copied from the checked-in artifact: guard line, blank line, the
// frame length, then the frame. The parser accepts a declared length between
// the frame's UTF-16 length and two more, which is what the real responses do.
// An exhausted conversation omits the next-page token entirely rather than
// sending null, which is how parseRpcPayload tells the two apart.
function envelope(turns, nextToken = null) {
  const payload = JSON.stringify(nextToken === null ? [turns] : [turns, nextToken]);
  const frame = JSON.stringify([['wrb.fr', 'khqZz', payload, null, null, null, 'generic']]);
  return `)]}'\n\n${frame.length}\n${frame}\n`;
}

function stubFetch(body, { status = 200, ok = status < 400 } = {}) {
  const calls = [];
  const impl = async (url, options) => {
    calls.push({ url, options });
    return { ok, status, text: async () => body };
  };
  impl.calls = calls;
  return impl;
}

describe('readPageAuth', () => {
  test('reads both tokens and the authuser passthrough', () => {
    const auth = readPageAuth(pageHtml(), `https://notebook.google.com/notebook/${NOTEBOOK}?authuser=0`);
    expect(auth.at).toBe(AT);
    expect(auth.sid).toBe(SID);
    expect(auth.authuser).toBe('0');
    expect(auth.secrets).toEqual([AT, SID]);
  });

  test('reports missing tokens and names the candidates it found', () => {
    const auth = readPageAuth(pageHtml().replace('SNlM0e', 'Xk9Qzz'), 'https://notebook.google.com/x');
    expect(auth.at).toBeNull();
    expect(auth.candidates.some((c) => c.key === 'Xk9Qzz')).toBe(true);
  });
});

describe('classifyStatus', () => {
  test('maps the statuses the verified script distinguished', () => {
    expect(classifyStatus(403)).toBe('AUTH_FAILURE');
    expect(classifyStatus(401)).toBe('AUTH_FAILURE');
    expect(classifyStatus(400)).toBe('REQUEST_FORMAT_ERROR');
    expect(classifyStatus(500)).toBe('HTTP_FAILURE');
  });
});

describe('postOnce', () => {
  test('decodes a synthetic-shaped envelope into turns and a token', async () => {
    const fetchImpl = stubFetch(envelope(SYNTHETIC.slice(0, 4)));
    const page = await postOnce(fetchImpl, { request: { url: 'https://x', method: 'POST', headers: {}, body: 'a=1' } });
    expect(page.turns).toHaveLength(4);
    expect(page.nextToken).toBeNull();
  });

  test('sends the request with credentials and the form content type', async () => {
    const fetchImpl = stubFetch(envelope([]));
    await postOnce(fetchImpl, { request: { url: 'https://x', method: 'POST', headers: { 'Content-Type': 'form' }, body: 'f.req=1' } });
    expect(fetchImpl.calls[0].options.credentials).toBe('include');
    expect(fetchImpl.calls[0].options.headers['Content-Type']).toBe('form');
  });

  test('raises rather than returning a default when the fetch throws', async () => {
    const impl = async () => { throw new Error('network down'); };
    await expect(
      postOnce(impl, { request: { url: 'https://x', method: 'POST', headers: {}, body: '' } })
    ).rejects.toThrow(/fetch failed: network down/);
  });

  test('raises on a non-OK response', async () => {
    const impl = stubFetch('', { status: 403, ok: false });
    await expect(
      postOnce(impl, { request: { url: 'https://x', method: 'POST', headers: {}, body: '' } })
    ).rejects.toThrow(/AUTH_FAILURE/);
  });

  test('raises when the envelope carries no frame for the rpcid', async () => {
    const empty = '[[]]';
    const impl = stubFetch(`)]}'\n\n${empty.length}\n${empty}\n`);
    await expect(
      postOnce(impl, { request: { url: 'https://x', method: 'POST', headers: {}, body: '' } })
    ).rejects.toThrow(/no wrb\.fr frame/);
  });

  test('raises rather than guessing when the declared length does not match', async () => {
    const impl = stubFetch(")]}'\n\n2\n[[]]\n");
    await expect(
      postOnce(impl, { request: { url: 'https://x', method: 'POST', headers: {}, body: '' } })
    ).rejects.toThrow(/framing changed/);
  });
});

describe('collectConversation', () => {
  const base = {
    html: pageHtml(),
    href: `https://notebook.google.com/notebook/${NOTEBOOK}`,
    notebookId: NOTEBOOK,
    conversationId: CONVERSATION,
    limit: 200,
  };

  test('normalizes the synthetic conversation and confirms exhaustion', async () => {
    const fetchImpl = stubFetch(envelope(SYNTHETIC));
    const result = await collectConversation({ ...base, fetchImpl });
    expect(result.turns).toHaveLength(174);
    expect(result.turns[0].kind).toBe('question');
    expect(result.exhausted).toBe(true);
    expect(result.paginationLine).toContain('174 turn');
    expect(result.paginationLine).toContain('limit=200');
  });

  test('reports the next-page token instead of following it', async () => {
    const fetchImpl = stubFetch(envelope(SYNTHETIC.slice(0, 100), 'NEXT-TOKEN'));
    const result = await collectConversation({ ...base, fetchImpl });
    expect(result.exhausted).toBe(false);
    expect(result.nextPageTokenPresent).toBe(true);
    expect(result.paginationLine).toContain('200');
    expect(fetchImpl.calls).toHaveLength(1);
  });

  test('a truncated run must not claim full coverage', () => {
    expect(CONTINUATION_UNPROVEN.conclusion).toMatch(/must be captured on the Mac/);
    expect(CONTINUATION_UNPROVEN.recordedAttempt.overlap).toBe(100);
  });

  test('refuses to build a request when a token is missing', async () => {
    const impl = async () => { throw new Error('should not be called'); };
    await expect(
      collectConversation({ ...base, html: pageHtml().replace('FdrFJe', 'Zz1Q'), fetchImpl: impl })
    ).rejects.toThrow(/TOKEN_EXTRACTION_FAILED/);
  });

  test('never puts a token in the returned secrets by accident', async () => {
    const fetchImpl = stubFetch(envelope(SYNTHETIC.slice(0, 2)));
    const result = await collectConversation({ ...base, fetchImpl });
    expect(result.secrets).toEqual([AT, SID]);
    expect(JSON.stringify({ turns: result.turns })).not.toContain(AT);
  });
});

describe('describeFailure', () => {
  test('maps known codes and strips secrets', () => {
    const error = new Error(`AUTH_FAILURE: failed for at=${AT} sid=${SID}`);
    const out = describeFailure(error, [AT, SID]);
    expect(out.verdict).toBe('AUTH_FAILURE');
    expect(out.detail).not.toContain(AT);
    expect(out.detail).not.toContain(SID);
  });

  test('falls back to a generic verdict for an unknown error', () => {
    expect(describeFailure(new Error('something else')).verdict).toBe('FETCH_OR_PARSE_FAILED');
  });
});
