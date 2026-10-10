import { afterEach, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { CONFIG, runArchive, setConfig } from '../src/userscript-main.js';

const defaults = { ...CONFIG };
afterEach(() => setConfig(defaults));
const synthetic = JSON.parse(readFileSync(new URL('../fixtures/rpc/conversation.json', import.meta.url), 'utf8'))[0];

function runOptions({ approved = true, dryRun = false, turns = synthetic, nextToken = null } = {}) {
  setConfig({ notebookId: 'notebook', conversationId: 'conversation', course: '검증', lecture: 1, dryRun });
  const events = [];
  const payload = JSON.stringify(nextToken === null ? [turns] : [turns, nextToken]);
  const frame = JSON.stringify([['wrb.fr', 'khqZz', payload, null, null, null, 'generic']]);
  return {
    events,
    options: {
      mode: 'first',
      html: '<script>window.WIZ_global_data={"SNlM0e":"' + 'a'.repeat(42) + '","FdrFJe":"' + 'b'.repeat(19) + '"};</script>',
      href: 'https://notebook.google.com/notebook/notebook',
      fetchImpl: async (url, options) => {
        if (options.method === 'GET') {
          events.push('GET');
          return { status: 404 };
        }
        if (options.method === 'PUT') {
          events.push('PUT');
          expect(options.credentials).toBe('omit');
          expect(options.body).toContain('# 1강');
          return { status: 204, ok: true };
        }
        events.push('COLLECT');
        return { status: 200, ok: true, text: async () => `)]}'\n\n${frame.length}\n${frame}\n` };
      },
      confirm: (block) => {
        events.push('CONFIRM');
        expect(block).toMatch(/저장 전 검증|저장할까요/);
        return approved;
      },
      promptForApiKey: () => { events.push('KEY'); return 'test-only-key'; },
    },
  };
}

test('approval precedes API key prompt and vault PUT', async () => {
  const { options, events } = runOptions();
  await runArchive(options);
  expect(events).toEqual(['COLLECT', 'CONFIRM', 'KEY', 'GET', 'CONFIRM', 'GET', 'PUT']);
});

test('cancelling validation never prompts for a key or writes', async () => {
  const { options, events } = runOptions({ approved: false });
  const result = JSON.parse(await runArchive(options));
  expect(events).toEqual(['COLLECT', 'CONFIRM']);
  expect(result.step).toBe('CANCELLED');
  expect(result.writeResult).toBeNull();
});

test('approved dry run never prompts for a key or writes', async () => {
  const { options, events } = runOptions({ dryRun: true });
  await runArchive(options);
  expect(events).toEqual(['COLLECT', 'CONFIRM']);
});

test('malformed collection stops without approval, key prompt, or vault write', async () => {
  const { options, events } = runOptions({ turns: synthetic.slice(1) });
  const result = await runArchive(options);
  expect(events).toEqual(['COLLECT']);
  expect(result).toBeNull();
});

test('unproven pagination stops before approval and vault access', async () => {
  const { options, events } = runOptions({ nextToken: 'unproven' });
  const result = JSON.parse(await runArchive(options));
  expect(events).toEqual(['COLLECT']);
  expect(result.verdict).toBe('PAGINATION_UNPROVEN');
});

test('selected lecture reaches validation and warns about foreign lecture questions', async () => {
  const { options } = runOptions({ dryRun: true });
  setConfig({ lecture: 2 });
  let block;
  options.confirm = (value) => { block = value; return true; };
  await runArchive(options);
  expect(block).toContain('다른 강의 질문 2건 포함 (1강)');
});

test('archive date uses the same Korean calendar as turn timestamps before UTC midnight', async () => {
  const { options } = runOptions();
  options.now = new Date('2026-10-09T16:05:00Z');
  const fetch = options.fetchImpl;
  let saved;
  options.fetchImpl = async (url, request) => {
    if (request.method === 'PUT') saved = request.body;
    return fetch(url, request);
  };
  await runArchive(options);
  expect(saved.match(/^archived: (.+)$/m)?.[1]).toBe('2026-10-10');
});
