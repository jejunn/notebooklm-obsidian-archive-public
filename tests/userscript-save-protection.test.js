import { afterEach, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
// A separate module instance avoids the legacy suite's shared setConfig state.
import { CONFIG, runArchive, setConfig } from '../src/userscript-main.js?save-protection';
const defaults = { ...CONFIG };
afterEach(() => setConfig(defaults));
const synthetic = JSON.parse(readFileSync(new URL('../fixtures/rpc/conversation.json', import.meta.url), 'utf8'))[0];
const existing = readFileSync(new URL('../fixtures/rpc/first-archive.md', import.meta.url), 'utf8');

test('installed default is 400', () => {
  expect(defaults.limit).toBe(400);
});

test('main sends 400 then leaves synthetic archived content untouched', async () => {
  setConfig({ ...defaults, course: '예제 과목', lecture: 2, dryRun: false, limit: 400 });
  const payload = JSON.stringify([synthetic]);
  const frame = JSON.stringify([['wrb.fr', 'khqZz', payload, null, null, null, 'generic']]);
  const calls = [];
  const result = JSON.parse(await runArchive({
    mode: 'review',
    html: `<script>window.WIZ_global_data={"SNlM0e":"${'a'.repeat(42)}","FdrFJe":"${'b'.repeat(19)}"};</script>`,
    href: `https://notebook.google.com/notebook/${defaults.notebookId}`,
    confirm: () => true, promptForApiKey: () => 'test-key',
    fetchImpl: async (_, request) => {
      calls.push(request.method);
      if (request.method === 'GET') return { status: 200, text: async () => existing };
      expect(request.method).toBe('POST');
      const form = new URLSearchParams(request.body);
      const args = JSON.parse(JSON.parse(form.get('f.req'))[0][0][1]);
      expect(args[4]).toBe(400);
      return { status: 200, ok: true, text: async () => `)]}'\n\n${frame.length}\n${frame}\n` };
    },
  }));
  expect(calls).toEqual(['POST', 'GET']);
  expect(result.step).toBe('NOOP');
  expect(result.writeResult.action).toBe('noop');
});
