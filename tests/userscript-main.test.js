import { beforeEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { CONFIG, runArchive, setConfig } from '../src/userscript-main.js';

// The synthetic conversation, generated for portable regression tests, so this exercises the
// observed envelope shape and the real turn shapes end to end.
const SYNTHETIC = JSON.parse(
  readFileSync(
    new URL('../fixtures/rpc/conversation.json', import.meta.url),
    'utf8'
  )
)[0];

const AT = 'a'.repeat(42);
const SID = 'b'.repeat(19);
const NOTEBOOK = '00000000-0000-4000-8000-000000000004';
const CONVERSATION = '00000000-0000-4000-8000-000000000002';

const HTML = `<!doctype html><html><body><script>window.WIZ_global_data = {
  "SNlM0e": "${AT}", "FdrFJe": "${SID}"
};</script></body></html>`;

function envelope(turns, nextToken = null) {
  const payload = JSON.stringify(nextToken === null ? [turns] : [turns, nextToken]);
  const frame = JSON.stringify([['wrb.fr', 'khqZz', payload, null, null, null, 'generic']]);
  return `)]}'\n\n${frame.length}\n${frame}\n`;
}

function stubFetch(body, calls) {
  return async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, text: async () => body };
  };
}

/** Collect the console lines the run emits, so assertions can read the log. */
function captureLog() {
  const lines = [];
  const original = console.log;
  console.log = (text) => lines.push(String(text).replace('[nbm-archive] ', ''));
  return {
    lines,
    entries: () => lines.map((line) => JSON.parse(line)),
    restore: () => { console.log = original; },
  };
}

function baseConfig() {
  return {
    notebookId: NOTEBOOK,
    conversationId: CONVERSATION,
    course: 'solar',
    lecture: 1,
    limit: 200,
    dryRun: true,
  };
}

beforeEach(() => {
  setConfig(baseConfig());
});

async function run(overrides = {}) {
  const capture = captureLog();
  const calls = [];
  const result = await runArchive({
    mode: 'first',
    html: HTML,
    href: `https://notebook.google.com/notebook/${NOTEBOOK}`,
    fetchImpl: stubFetch(overrides.body ?? envelope(SYNTHETIC), calls),
    confirm: overrides.confirm ?? (() => true),
    promptForApiKey: overrides.promptForApiKey ?? (() => 'key'),
  });
  capture.restore();
  return { result, calls, entries: capture.entries() };
}

describe('runArchive', () => {
  test('refuses to run with any setting left empty', async () => {
    for (const key of ['notebookId', 'conversationId', 'course']) {
      setConfig({ ...baseConfig(), [key]: '' });
      const { result, entries } = await run();
      expect(result).toContain('CONFIG_INCOMPLETE');
      expect(entries[0].missing).toContain(key);
    }
  });

  test('refuses to guess the lecture number', async () => {
    setConfig({ ...baseConfig(), lecture: null });
    const { result, entries } = await run();
    expect(result).toContain('CONFIG_INCOMPLETE');
    expect(entries[0].missing).toContain('lecture');
  });

  test('refuses a limit below the contract minimum', async () => {
    setConfig({ ...baseConfig(), limit: 100 });
    const { entries } = await run();
    expect(entries[0].missing).toContain('limit(>=200)');
  });

  test('walks the whole conversation and reports exhaustion', async () => {
    const { calls, entries } = await run();
    expect(calls).toHaveLength(1);
    const collected = entries.find((e) => e.step === 'COLLECT');
    expect(collected.turnCount).toBe(174);
    expect(collected.exhausted).toBe(true);
  });

  test('shows the validation block before anything is written', async () => {
    const seen = [];
    const { entries } = await run({ confirm: (text) => { seen.push(text); return true; } });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain('174');
    const validation = entries.find((e) => e.step === 'VALIDATION');
    // Validation is reported before approval and before the write callback.
    expect(validation.writeAttempted).toBe(false);
  });

  test('writes nothing when the block is dismissed', async () => {
    const { result, entries } = await run({ confirm: () => false });
    expect(result).toContain('CANCELLED');
    expect(entries.some((e) => e.step === 'DONE')).toBe(false);
  });

  test('stops on a next-page token instead of claiming full coverage', async () => {
    const { result, calls, entries } = await run({
      body: envelope(SYNTHETIC.slice(0, 100), 'NEXT-TOKEN'),
    });
    expect(calls).toHaveLength(1);
    expect(result).toContain('PAGINATION_UNPROVEN');
    expect(entries.some((e) => e.step === 'VALIDATION')).toBe(false);
  });

  test('reports a token failure without leaking the page tokens', async () => {
    const calls = [];
    const capture = captureLog();
    await runArchive({
      mode: 'first',
      html: HTML.replace('SNlM0e', 'Xk9Qzz'),
      href: `https://notebook.google.com/notebook/${NOTEBOOK}`,
      fetchImpl: stubFetch('', calls),
      confirm: () => true,
      promptForApiKey: () => 'key',
    });
    capture.restore();
    const joined = capture.lines.join('\n');
    expect(joined).toContain('TOKEN_EXTRACTION_FAILED');
    expect(joined).not.toContain(SID);
    expect(calls).toHaveLength(0);
  });
});
