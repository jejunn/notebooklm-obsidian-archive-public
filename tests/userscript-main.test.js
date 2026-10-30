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

test('ambiguous choices can be cancelled before vault access', async () => {
  const wire = structuredClone(SYNTHETIC.slice(-4));
  wire.find(t => t[2] === 1)[3] = '67페이지와 59페이지 비교';
  const calls = [];
  const result = await runArchive({ mode:'first', html:HTML, href:`https://notebook.google.com/notebook/${NOTEBOOK}`,
    fetchImpl:stubFetch(envelope(wire), calls), confirm:()=>true, dryRun:false,
    promptForApiKey:()=>{ throw new Error('must not ask for key'); }, resolvePages:async () => null });
  expect(result).toContain('CANCELLED');
  expect(calls).toHaveLength(1);
});

test('dry run supplies only distinct ambiguities to the resolver and shows no-write mode', async () => {
  const wire = structuredClone(SYNTHETIC.slice(-4));
  wire.find(t => t[2] === 1)[3] = '67페이지와 59페이지 비교';
  let items; const confirmations=[];
  const result = await runArchive({ mode:'first', html:HTML, href:`https://notebook.google.com/notebook/${NOTEBOOK}`,
    fetchImpl:stubFetch(envelope(wire), []), dryRun:true, confirm:text=>{confirmations.push(text); return true;},
    resolvePages:async choices => { items=choices; return { [choices[0].id]:67 }; } });
  expect(items).toHaveLength(1);
  expect(items[0].pages).toEqual([67,59]);
  expect(result).toContain('DONE');
  expect(confirmations[0]).toContain('저장하지 않');
  expect(confirmations[0]).not.toContain('저장: 진행');
});

test('actual save applies the resolved page to output without editing the question', async () => {
  const wire = structuredClone(SYNTHETIC.slice(-4));
  const questions = wire.filter(t=>t[2]===1);
  questions[1][3] = '67페이지와 59페이지 비교';
  questions[0][3] = '이어 설명';
  const requests=[];
  const fetchImpl=async (url, options)=>{
    requests.push({url,options});
    if (options.method==='POST') return {ok:true,status:200,text:async()=>envelope(wire)};
    if (options.method==='GET') return {ok:false,status:404};
    return {ok:true,status:204};
  };
  const result=await runArchive({mode:'first',html:HTML,href:`https://notebook.google.com/notebook/${NOTEBOOK}`,
    dryRun:false,fetchImpl,confirm:()=>true,promptForApiKey:()=> 'key',resolvePages:async items=>({[items[0].id]:67})});
  expect(result).toContain('DONE');
  const body=requests.find(r=>r.options.method==='PUT').options.body;
  expect(body).toContain('## 67페이지\n\n### Q\n67페이지와 59페이지 비교');
  expect(body).not.toContain('## 59페이지');
  expect(body).toContain('이어 설명');
});

test('invalid resolver output is blocked before vault access', async () => {
  const wire=structuredClone(SYNTHETIC.slice(-4)); wire.find(t=>t[2]===1)[3]='67페이지와 59페이지 비교';
  const calls=[];
  const result=await runArchive({mode:'first',html:HTML,href:`https://notebook.google.com/notebook/${NOTEBOOK}`,
    dryRun:false,fetchImpl:stubFetch(envelope(wire),calls),confirm:()=>true,
    resolvePages:async items=>({[items[0].id]:12})});
  expect(result).toContain('INVALID_PAGE_SELECTION'); expect(calls).toHaveLength(1);
});

test('single distinct reference does not open a resolver', async () => {
  const wire=structuredClone(SYNTHETIC.slice(-4)); wire.find(t=>t[2]===1)[3]='67페이지와 67페이지';
  const result=await runArchive({mode:'first',html:HTML,href:`https://notebook.google.com/notebook/${NOTEBOOK}`,
    dryRun:true,fetchImpl:stubFetch(envelope(wire),[]),confirm:()=>true,
    resolvePages:()=>{throw new Error('resolver must not open');}});
  expect(result).toContain('DONE');
});
