import { expect, test } from 'bun:test';
import { saveArchive } from '../src/archive-save.js';
import { assembleFirstArchive } from '../src/markdown-assembler.js';
import { parseFrontmatter } from '../src/delta-rules.js';

const turns = Array.from({ length: 6 }, (_, i) => ({
  id: `turn-${i}`, ts: 1791000000 + i, kind: i % 2 ? 'answer' : 'question',
  text: i % 2 ? '답변 [1].' : '2강 5페이지 설명',
}));
const base = assembleFirstArchive(turns.slice(0, 4), {
  course: '예제 과목', lecture: 2, conversationId: 'conversation', archivedDate: '2026-10-10',
}).replace('답변', '사용자 수정 답변') + '\n사용자가 남긴 메모\n\n';

function harness(existing = base, overrides = {}) {
  let current = existing;
  const requests = [];
  const approvals = [];
  const transport = overrides.fetchImpl ?? (async (url, request) => {
    if (request.method === 'GET') return current === null
      ? { status: 404 } : { status: 200, text: async () => current };
    current = request.body;
    return { status: 204 };
  });
  const options = {
    path: '예제 과목/2강.md', course: '예제 과목', lecture: 2,
    mode: 'review', conversationId: 'conversation', turns, date: '2026-10-10', apiKey: 'test-key',
    confirm: (message) => { approvals.push(message); return true; },
    ...overrides,
    fetchImpl: async (url, request) => { requests.push(request); return transport(url, request); },
  };
  return { options, requests, approvals, content: () => current,
    run: (changes = {}) => saveArchive({ ...options, ...changes }) };
}

test('append preserves edited body, updates anchor, and repeating it does no PUT', async () => {
  const h = harness();
  const result = await h.run();
  expect(result.ok).toBe(true);
  expect(result.action).toBe('append');
  expect(result.newTurnCount).toBe(2);
  const body = (text) => text.slice(text.indexOf('\n---', 4) + 4);
  expect(body(h.content()).startsWith(body(base))).toBe(true);
  expect(h.content()).toContain('## 추가 질문');
  expect(JSON.parse(parseFrontmatter(h.content()).fields.archive_review_sessions)[0].lastTurnId).toBe('turn-5');
  expect(h.content()).toContain('archive_last_turn: "turn-3"');
  expect(h.content().match(/^##### Q$/gm)).toHaveLength(1);
  expect(h.approvals[0]).toContain('신규 2 turn');
  expect(h.requests.map((r) => r.method)).toEqual(['GET', 'GET', 'PUT']);
  expect(h.requests[0].headers.Accept).toBe('text/markdown');
  expect(h.requests[0].credentials).toBe('omit');
  const saved = h.content();
  expect((await h.run()).action).toBe('noop');
  expect(h.content()).toBe(saved);
  expect(h.requests.filter((r) => r.method === 'PUT')).toHaveLength(1);
});

test('next pair on same day reuses date and additional-question headings', async () => {
  const h = harness();
  await h.run({ turns: turns.slice(0, 4) }); // no-op
  await h.run({ turns: turns.slice(0, 6) });
  const more = [...turns, ...turns.slice(0, 2).map((t, i) => ({ ...t, id: `later-${i}`, ts: t.ts + 100 }))];
  expect((await h.run({ turns: more })).action).toBe('append');
  expect(h.content().match(/^## 추가 질문$/gm)).toHaveLength(1);
  expect(h.content().match(/^### 2026-10-10$/gm)).toHaveLength(1);
  expect(JSON.parse(parseFrontmatter(h.content()).fields.archive_review_sessions)[0].lastTurnId).toBe('later-1');
  expect((await h.run({ turns: more })).action).toBe('noop');
});

test('404 creates a first archive after approval and a second absence check', async () => {
  const h = harness(null, {mode:'first'});
  expect((await h.run()).action).toBe('first-archive');
  expect(h.requests.map((r) => r.method)).toEqual(['GET', 'GET', 'PUT']);
  expect(h.content()).toContain('# 2강');
  expect(h.content()).toContain('archive_last_turn: "turn-5"');
});

test.each([base, '', '# 사용자가 만든 노트'])('first mode protects every existing file without asking to overwrite', async (content) => {
  const h = harness(content, {mode:'first'});
  expect((await h.run()).action).toBe('blocked');
  expect(h.requests.map(r=>r.method)).toEqual(['GET']);
  expect(h.approvals).toHaveLength(0);
  expect(h.content()).toBe(content);
});

test('new review conversation needs approval before its complete conversation is appended', async () => {
  const h = harness(base, {conversationId:'new-review', confirm:message=>{
    expect(message).toContain('새 복습 대화 전체');
    return false;
  }});
  expect((await h.run()).action).toBe('cancelled');
  expect(h.requests.map(r=>r.method)).toEqual(['GET']);
  expect(h.content()).toBe(base);
});

test('unchanged archived conversation does not ask to write or modify the file', async () => {
  const h = harness();
  expect((await h.run({ turns: turns.slice(0, 4) })).action).toBe('noop');
  expect(h.approvals).toHaveLength(0);
  expect(h.requests.map((r) => r.method)).toEqual(['GET']);
  expect(h.content()).toBe(base);
});

test.each([
  ['unmanaged', '# 사용자가 만든 기존 노트'],
  ['missing anchor', base.replace('"turn-3"', '"deleted-id"')],
  ['malformed YAML', '---\narchive_conversation: conversation\n'],
  ['duplicate anchor', base.replace('archive_last_turn:', 'archive_last_turn: invalid\narchive_last_turn:')],
  ['wrong lecture', base.replace('lecture: 2', 'lecture: 3')],
])('%s file blocks without PUT', async (_, content) => {
  const h = harness(content);
  expect((await h.run()).ok).toBe(false);
  expect(h.requests.map((r) => r.method)).toEqual(['GET']);
  expect(h.content()).toBe(content);
});

test.each([401, 403, 500])('GET status %s blocks instead of treating file as absent', async (status) => {
  const h = harness(base, { fetchImpl: async (_, request) => {
    expect(request.method).toBe('GET'); return { status };
  } });
  expect((await h.run()).ok).toBe(false);
  expect(h.requests.map((r) => r.method)).toEqual(['GET']);
});

test('network or read-body failure blocks without writing', async () => {
  for (const fetchImpl of [async () => { throw new Error('network'); },
    async () => ({ status: 200, text: async () => { throw new Error('body'); } })]) {
    const h = harness(base, { fetchImpl });
    expect((await h.run()).ok).toBe(false);
    expect(h.requests.map((r) => r.method)).toEqual(['GET']);
  }
});

test.each([['existing', base], ['absent', null]])('changed %s target before PUT blocks', async (_, initial) => {
  let reads = 0;
  const h = harness(initial, { mode:initial===null?'first':'review', fetchImpl: async (_, request) => {
    expect(request.method).toBe('GET');
    reads++;
    const text = reads === 1 ? initial : '사용자가 방금 편집함';
    return text === null ? { status: 404 } : { status: 200, text: async () => text };
  } });
  expect((await h.run()).reason).toContain('changed');
  expect(h.requests.map((r) => r.method)).toEqual(['GET', 'GET']);
});

test('second read failure blocks PUT after preview approval', async () => {
  let reads = 0;
  const h = harness(base, { fetchImpl: async () => ++reads === 1
    ? { status: 200, text: async () => base } : { status: 503 } });
  expect((await h.run()).ok).toBe(false);
  expect(h.approvals).toHaveLength(1);
  expect(h.requests.map((r) => r.method)).toEqual(['GET', 'GET']);
});

test('cancel final save preview never reaches second GET or PUT', async () => {
  const h = harness(base, { confirm: () => false });
  expect((await h.run()).action).toBe('cancelled');
  expect(h.requests.map((r) => r.method)).toEqual(['GET']);
});

test('ambiguous repeated turn IDs block append', async () => {
  const h = harness();
  const repeated = [...turns, ...turns.slice(2, 4).map((turn) => ({ ...turn, ts: turn.ts + 100 }))];
  expect((await h.run({ turns: repeated })).ok).toBe(false);
  expect(h.requests.map((r) => r.method)).toEqual(['GET']);
});

test('anchor in the middle of a question/answer pair blocks instead of dropping an answer', async () => {
  const h = harness(base.replace('archive_last_turn: "turn-3"', 'archive_last_turn: "turn-2"'));
  expect((await h.run()).ok).toBe(false);
  expect(h.requests.map((r) => r.method)).toEqual(['GET']);
});
