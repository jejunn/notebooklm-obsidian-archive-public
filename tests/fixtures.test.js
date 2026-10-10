// T1 acceptance checks for the seven Phase B fixture modules.
//
// These assertions only cover what the fixtures themselves promise: the turn
// shape from contract §1.2 and the five per-case conditions named in the task
// acceptance. Core behaviour (page state machine, assembly) is T2 and later.

import { describe, expect, test } from 'bun:test';
import { readdir, readFile } from 'node:fs/promises';

import fixture1 from '../fixtures/01-question-with-page-number.js';
import fixture2 from '../fixtures/02-follow-up-page-inheritance.js';
import fixture3 from '../fixtures/03-empty-answer.js';
import fixture4 from '../fixtures/04-duplicate-question-text.js';
import fixture5 from '../fixtures/05-odd-trailing-turn.js';
import fixture6 from '../fixtures/06-answer-with-code-block.js';
import fixture7 from '../fixtures/07-page-revisit.js';

const ALL = [
  ['01', fixture1],
  ['02', fixture2],
  ['03', fixture3],
  ['04', fixture4],
  ['05', fixture5],
  ['06', fixture6],
  ['07', fixture7],
];

const STORED_FIELDS = ['id', 'ts', 'kind', 'text'];

describe('fixture modules', () => {
  test('all seven modules export an array', () => {
    expect(ALL).toHaveLength(7);
    for (const [name, turns] of ALL) {
      expect(Array.isArray(turns), name).toBe(true);
      expect(turns.length, name).toBeGreaterThan(0);
    }
  });

  test('every turn carries only id, ts, kind, text (§1.2)', () => {
    for (const [name, turns] of ALL) {
      for (const turn of turns) {
        expect(Object.keys(turn).sort(), `${name} ${turn.id}`).toEqual([...STORED_FIELDS].sort());
        expect(typeof turn.id, name).toBe('string');
        expect(turn.id.length, name).toBeGreaterThan(0);
        expect(Number.isInteger(turn.ts), name).toBe(true);
        expect(turn.ts, name).toBeGreaterThan(0);
        expect(['question', 'answer'], name).toContain(turn.kind);
        expect(typeof turn.text, name).toBe('string');
      }
    }
  });

  test('turn ids are unique inside every fixture', () => {
    for (const [name, turns] of ALL) {
      const ids = turns.map((t) => t.id);
      expect(new Set(ids).size, name).toBe(ids.length);
    }
  });

  test('no fixture source references a network or filesystem API', async () => {
    const banned = ['fetch(', 'XMLHttpRequest', 'node:http', 'node:https', 'node:fs', 'require('];
    const dir = new URL('../fixtures/', import.meta.url);
    const names = (await readdir(dir)).filter((n) => n.endsWith('.js')).sort();
    expect(names.length).toBe(7);
    for (const name of names) {
      const source = await readFile(new URL(name, dir), 'utf8');
      for (const token of banned) {
        expect(source.includes(token), `${name}: ${token}`).toBe(false);
      }
    }
  });
});

describe('case 1 — question with a page number plus answer', () => {
  test('is one question followed by one answer, first turn is a question', () => {
    expect(fixture1).toHaveLength(2);
    expect(fixture1[0].kind).toBe('question');
    expect(fixture1[1].kind).toBe('answer');
  });

  test('the question carries the page number 23 (P-01)', () => {
    expect(fixture1[0].text).toBe('23페이지 설명해줘.');
  });
});

describe('case 2 — follow-up question without a page number', () => {
  test('the second question has no page number so the page is inherited', () => {
    expect(fixture2).toHaveLength(6);
    const followUps = fixture2.filter((t) => t.kind === 'question').slice(1);
    expect(followUps).toHaveLength(2);
    for (const turn of followUps) {
      expect(turn.text).not.toContain('페이지 설명해줘');
    }
  });

  test('the first question opens page 23 (P-01, P-02, P-03)', () => {
    expect(fixture2[0].text).toBe('23페이지 설명해줘.');
    expect(fixture2[2].text).toBe('여기서 x는 왜 증가해?');
    expect(fixture2[4].text).toBe('그러면 앞 공식과는 모순 아닌가?');
  });
});

describe('case 3 — one empty answer turn', () => {
  test('contains exactly one answer whose text is the empty string', () => {
    const empty = fixture3.filter((t) => t.kind === 'answer' && t.text === '');
    expect(empty).toHaveLength(1);
    expect(fixture3.filter((t) => t.kind === 'answer')).toHaveLength(2);
  });

  test('the empty answer keeps a timestamp for the placeholder line (§3.2)', () => {
    const empty = fixture3.find((t) => t.kind === 'answer' && t.text === '');
    expect(Number.isInteger(empty.ts)).toBe(true);
    expect(empty.ts).toBeGreaterThan(0);
  });
});

describe('case 4 — identical question text with distinct turn ids', () => {
  test('has two question turns with byte-identical text and different ids', () => {
    const questions = fixture4.filter((t) => t.kind === 'question');
    expect(questions).toHaveLength(2);
    expect(questions[0].text).toBe(questions[1].text);
    expect(questions[0].text).toBe('55페이지 설명해줘');
    expect(questions[0].id).not.toBe(questions[1].id);
  });
});

describe('case 5 — odd trailing turn', () => {
  test('ends with a lone turn whose kind is question', () => {
    expect(fixture5.length % 2).toBe(1);
    const last = fixture5[fixture5.length - 1];
    expect(last.kind).toBe('question');
  });

  test('alternation holds until the trailing question', () => {
    expect(fixture5.slice(0, -1).map((t) => t.kind)).toEqual(['question', 'answer']);
  });
});

describe('case 6 — answer containing a fenced code block', () => {
  test('an answer text contains a triple-backtick fence', () => {
    const answer = fixture6.find((t) => t.kind === 'answer');
    expect(answer.text).toContain('```');
    expect(answer.text).toContain('```python');
  });

  test('the fence opens and closes and the code between is intact', () => {
    const answer = fixture6.find((t) => t.kind === 'answer');
    const lines = answer.text.split('\n');
    const fenceLines = lines.filter((l) => l.startsWith('```'));
    expect(fenceLines).toEqual(['```python', '```']);
    const open = lines.indexOf('```python');
    const close = lines.indexOf('```');
    expect(close).toBeGreaterThan(open);
    expect(lines.slice(open + 1, close)).toContain('def penetration_depth(alpha: float, i0: float, i: float) -> float:');
  });

  test('no CRLF or trailing whitespace sneaks into the fence', () => {
    const answer = fixture6.find((t) => t.kind === 'answer');
    expect(answer.text).not.toContain('\r');
    for (const line of answer.text.split('\n')) {
      expect(line).toBe(line.replace(/\s+$/, ''));
    }
  });
});

describe('case 7 — conversation returning to a previously seen page', () => {
  test('a question names a page number that appeared earlier in the same array', () => {
    const pageOf = (turn) => {
      const m = turn.text.match(/(\d+)\s*페이지/);
      return m ? Number(m[1]) : null;
    };
    const seen = new Set();
    let revisit = null;
    for (const turn of fixture7) {
      if (turn.kind !== 'question') continue;
      const page = pageOf(turn);
      if (page === null) continue;
      if (seen.has(page)) revisit = { page, turn };
      seen.add(page);
    }
    expect(revisit).not.toBeNull();
    expect(revisit.page).toBe(23);
    expect(revisit.turn.text).toBe('23페이지로 돌아가서 그 표를 다시 설명해줘.');
  });

  test('the page sequence is 23, 24, 23', () => {
    const pages = fixture7
      .filter((t) => t.kind === 'question')
      .map((t) => Number(t.text.match(/(\d+)\s*페이지/)[1]));
    expect(pages).toEqual([23, 24, 23]);
  });
});