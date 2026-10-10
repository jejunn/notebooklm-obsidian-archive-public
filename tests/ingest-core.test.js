// T2 acceptance checks for the pure ingest core.
//
// These assertions are taken straight from implementation-contract.md section
// 2.7 (page state machine P-01..P-13, ordering T-ORD-1, T-ORD-2), section 2.4
// (multi-page reference), section 2.5 (other lecture), section 3.1 (empty
// answer, duplicate preservation) and section 3.3 (three grades).
//
// Every fixture is already oldest-first, exactly as the adapter obligation
// section 6.2 item 1 requires. No test here performs the reversal.

import { describe, expect, test } from 'bun:test';

import fixture1 from '../fixtures/01-question-with-page-number.js';
import fixture2 from '../fixtures/02-follow-up-page-inheritance.js';
import fixture3 from '../fixtures/03-empty-answer.js';
import fixture4 from '../fixtures/04-duplicate-question-text.js';
import fixture5 from '../fixtures/05-odd-trailing-turn.js';
import fixture6 from '../fixtures/06-answer-with-code-block.js';
import fixture7 from '../fixtures/07-page-revisit.js';
import { readFile } from 'node:fs/promises';

import {
  CoreHardError,
  extractAnswerBody,
  extractPageReference,
  detectOtherLecture,
  runPageStateMachine,
  groupConversation,
  validate,
  validateStructure,
  ingest,
} from '../src/ingest-core.js';

describe('1.5 body extractor', () => {
  test('returns turn[4][0][0] verbatim (measured length 4, no rich array)', () => {
    const markdown = '## 침투 깊이 계산\n\n- `alpha`는 흡수 계수입니다.';
    const wire = [markdown, 'conv', 'conv', 42];
    expect(extractAnswerBody(wire)).toBe(markdown);
  });

  test('an empty body is a normal state, not a hard error', () => {
    expect(extractAnswerBody(['', 'conv', 'conv', 42])).toBe('');
  });

  test('a missing answer array is a hard error, never null', () => {
    expect(() => extractAnswerBody(undefined)).toThrow(CoreHardError);
    expect(() => extractAnswerBody([123, 'conv', 'conv', 42])).toThrow(CoreHardError);
  });
});

describe('2.3 page number extraction', () => {
  test('P-01: 23페이지 설명해줘. -> 23', () => {
    expect(extractPageReference('23페이지 설명해줘.').page).toBe(23);
  });

  test('P-13: 23 페이지 with a space -> 23', () => {
    expect(extractPageReference('23 페이지').page).toBe(23);
  });

  test('P-08: 다음 페이지 설명해줘. -> no match', () => {
    expect(extractPageReference('다음 페이지 설명해줘.').page).toBeNull();
  });

  test('P-10: 2개 설명해줘 -> no match', () => {
    expect(extractPageReference('2개 설명해줘').page).toBeNull();
  });

  test('p.9 and 5 page are unsupported forms -> no match', () => {
    expect(extractPageReference('p.9').page).toBeNull();
    expect(extractPageReference('5 page').page).toBeNull();
  });

  test('P-06: 2강 9페이지 -> page 9, never the lecture number 2', () => {
    const reference = extractPageReference('2강 9페이지 설명해줘.');
    expect(reference.page).toBe(9);
    expect(reference.lecture).toBe(2);
  });

  test('P-07: 1강 10페이지 -> page 10, lecture 1', () => {
    const reference = extractPageReference('1강 10페이지 설명해줘.');
    expect(reference.page).toBe(10);
    expect(reference.lecture).toBe(1);
  });

  test('the lecture number never becomes the page for a lecture-only question', () => {
    expect(extractPageReference('2강 설명해줘').page).toBeNull();
  });
});

describe('2.4 multi-page reference', () => {
  test('P-09: 1, 2, 3, 5, 8페이지 -> page 8 and a warning, grade warning', () => {
    const question = '1, 2, 3, 5, 8페이지';
    const reference = extractPageReference(question);
    expect(reference.page).toBe(8);

    const result = validate([{ id: 'q1', ts: 1, kind: 'question', text: question }, {
      id: 'a1', ts: 2, kind: 'answer', text: 'body',
    }]);
    const warning = result.warnings.find((w) => w.category === 'multi-page reference');
    expect(warning).toBeDefined();
    expect(warning.grade).toBe('warning');
    expect(warning.questions[0].pages).toEqual([1, 2, 3, 5, 8]);
  });

  test('a two-page comparison also warns and uses the last match', () => {
    const result = validate([{
      id: 'q1', ts: 1, kind: 'question', text: '9페이지랑 10페이지 비교해줘',
    }, { id: 'a1', ts: 2, kind: 'answer', text: 'body' }]);
    const warning = result.warnings.find((w) => w.category === 'multi-page reference');
    expect(warning).toBeDefined();
    expect(runPageStateMachine([
      { id: 'q1', ts: 1, kind: 'question', text: '9페이지랑 10페이지 비교해줘' },
      { id: 'a1', ts: 2, kind: 'answer', text: 'body' },
    ]).groups[0].page).toBe(10);
  });

  test('the skipped pages themselves are never reported', () => {
    const result = validate([{
      id: 'q1', ts: 1, kind: 'question', text: '1, 2, 3, 5, 8페이지',
    }, { id: 'a1', ts: 2, kind: 'answer', text: 'body' }]);
    const categories = result.entries.map((e) => e.category);
    expect(categories).not.toContain('skipped page');
    expect(categories).not.toContain('unclassified');
  });
});

describe('2.5 other-lecture detection', () => {
  test('T-ALT-1: 2강 question while lecture 1 is selected -> warning, save proceeds', () => {
    expect(detectOtherLecture('2강 9페이지 설명해줘.', 1)).toBe(2);

    const result = validate(fixture3, { selectedLecture: 1 });
    const warning = result.warnings.find((w) => w.category === 'other-lecture');
    expect(warning).toBeDefined();
    expect(warning.lecture).toBe(2);
    expect(warning.grade).toBe('warning');
    expect(result.saveBlocked).toBe(false);
  });

  test('T-ALT-2: one such question still warns, count does not matter', () => {
    const single = [{ id: 'q1', ts: 1, kind: 'question', text: '2강 9페이지 설명해줘.' }];
    const result = validate(single, { selectedLecture: 1 });
    const warning = result.warnings.find((w) => w.category === 'other-lecture');
    expect(warning).toBeDefined();
    expect(warning.questions).toHaveLength(1);
  });

  test('no warning when the prefix equals the selected lecture', () => {
    expect(detectOtherLecture('1강 10페이지 설명해줘.', 1)).toBeNull();
    const result = validate(fixture4, { selectedLecture: 1 });
    expect(result.warnings.find((w) => w.category === 'other-lecture')).toBeUndefined();
  });

  test('no warning when no lecture was selected at all', () => {
    expect(detectOtherLecture('2강 9페이지 설명해줘.', null)).toBeNull();
  });
});

describe('2.2 / 2.6 page state machine', () => {
  test('P-01: fixture 1 assigns page 23 to the question', () => {
    const { questions, groups } = runPageStateMachine(fixture1);
    expect(questions).toHaveLength(1);
    expect(questions[0].page).toBe(23);
    expect(questions[0].inherited).toBe(false);
    expect(groups).toHaveLength(1);
    expect(groups[0].page).toBe(23);
    expect(groups[0].unclassified).toBe(false);
  });

  test('P-02 and P-03: fixture 2 inherits page 23 for the follow-up questions', () => {
    const { questions, groups } = runPageStateMachine(fixture2);
    expect(questions.map((q) => q.page)).toEqual([23, 23, 23]);
    expect(questions.map((q) => q.inherited)).toEqual([false, true, true]);
    expect(groups).toHaveLength(1);
  });

  test('P-04 and P-05: a new page opens a new group, then is inherited', () => {
    const turns = [
      { id: 'q1', ts: 1, kind: 'question', text: '23페이지 설명해줘.' },
      { id: 'a1', ts: 2, kind: 'answer', text: 'b1' },
      { id: 'q2', ts: 3, kind: 'question', text: '24페이지 설명해줘.' },
      { id: 'a2', ts: 4, kind: 'answer', text: 'b2' },
      { id: 'q3', ts: 5, kind: 'question', text: '이 표는 왜 이렇게 돼?' },
      { id: 'a3', ts: 6, kind: 'answer', text: 'b3' },
    ];
    const { questions, groups } = runPageStateMachine(turns);
    expect(questions.map((q) => q.page)).toEqual([23, 24, 24]);
    expect(groups.map((g) => g.page)).toEqual([23, 24]);
  });

  test('P-11 and P-12: with no page ever seen, questions stay unclassified', () => {
    const turns = [
      { id: 'q1', ts: 1, kind: 'question', text: '독점시장의 가격차별 조건이 뭐였지?' },
      { id: 'a1', ts: 2, kind: 'answer', text: 'b1' },
      { id: 'q2', ts: 3, kind: 'question', text: '이 문제에서 왜 이 공식을 적용하는 거야?' },
      { id: 'a2', ts: 4, kind: 'answer', text: 'b2' },
    ];
    const { questions, groups } = runPageStateMachine(turns);
    expect(questions.map((q) => q.page)).toEqual([null, null]);
    expect(groups).toHaveLength(1);
    expect(groups[0].unclassified).toBe(true);

    // Unclassified questions are reported, but no page number is invented.
    const result = validate(turns);
    const warning = result.warnings.find((w) => w.category === 'unclassified');
    expect(warning).toBeDefined();
    expect(warning.questions).toHaveLength(2);
    expect(warning.questions[0].text).toBe('독점시장의 가격차별 조건이 뭐였지?');
  });

  test('a group reopens when the page returns (fixture 7: 23, 24, 23)', () => {
    const { groups } = runPageStateMachine(fixture7);
    expect(groups.map((g) => g.page)).toEqual([23, 24, 23]);
    expect(groups.map((g) => g.items.length)).toEqual([1, 1, 1]);
  });

  test('an answer turn never changes the page state', () => {
    const turns = [
      { id: 'q1', ts: 1, kind: 'question', text: '23페이지 설명해줘.' },
      { id: 'a1', ts: 2, kind: 'answer', text: '24페이지 설명해줘.' },
      { id: 'q2', ts: 3, kind: 'question', text: '계속' },
      { id: 'a2', ts: 4, kind: 'answer', text: 'body' },
    ];
    const { questions, groups } = runPageStateMachine(turns);
    expect(questions.map((q) => q.page)).toEqual([23, 23]);
    expect(groups).toHaveLength(1);
  });
});

describe('grouping', () => {
  test('each question binds to the answer that follows it', () => {
    const pairs = groupConversation(fixture2);
    expect(pairs).toHaveLength(3);
    expect(pairs.map((p) => p.question.id)).toEqual(fixture2.filter((t) => t.kind === 'question').map((t) => t.id));
    expect(pairs.map((p) => p.answer.id)).toEqual(fixture2.filter((t) => t.kind === 'answer').map((t) => t.id));
  });

  test('T-ORD-2: question text stays in conversation order, no reordering', () => {
    const pairs = groupConversation(fixture7);
    expect(pairs.map((p) => p.question.text)).toEqual([
      '23페이지 설명해줘.',
      '24페이지 설명해줘.',
      '23페이지로 돌아가서 그 표를 다시 설명해줘.',
    ]);
  });

  test('3.1: identical question text with different turn IDs is never merged', () => {
    const pairs = groupConversation(fixture4);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].question.id).not.toBe(pairs[1].question.id);
    expect(pairs[0].question.text).toBe(pairs[1].question.text);
    expect(pairs[0].page).toBe(55);
    expect(pairs[1].page).toBe(55);
  });

  test('a trailing question without an answer is kept with a null answer', () => {
    const pairs = groupConversation(fixture5);
    expect(pairs).toHaveLength(2);
    expect(pairs[1].answer).toBeNull();
  });
});

describe('3.3 three validation grades', () => {
  test('3.1: an empty answer is grade warning, not error', () => {
    const result = validate(fixture3);
    const warning = result.warnings.find((w) => w.category === 'empty answer');
    expect(warning).toBeDefined();
    expect(warning.grade).toBe('warning');
    expect(result.errors).toHaveLength(0);
    expect(result.saveBlocked).toBe(false);
  });

  test('the empty answer keeps the ANSWER turn timestamp, not the question one', () => {
    const result = validate(fixture3);
    const warning = result.warnings.find((w) => w.category === 'empty answer');
    const empty = fixture3.find((t) => t.kind === 'answer' && t.text === '');
    expect(warning.answers[0].answerTs).toBe(empty.ts);
    expect(warning.answers[0].answerTs).not.toBe(warning.answers[0].questionTs);
    expect(warning.answers[0].questionText).toBe('2강 9페이지 설명해줘.');
  });

  test('3.1: a duplicated turn ID raises grade error and blocks the save', () => {
    const turns = [
      { id: 'dup', ts: 1, kind: 'question', text: '23페이지 설명해줘.' },
      { id: 'dup', ts: 2, kind: 'answer', text: 'body' },
    ];
    const result = validate(turns);
    const error = result.errors.find((e) => e.category === 'duplicate turn id');
    expect(error).toBeDefined();
    expect(error.grade).toBe('error');
    expect(result.saveBlocked).toBe(true);
  });

  test('15a: a trailing question with no answer breaks the pair count (fixture 5)', () => {
    const result = validate(fixture5);
    const error = result.errors.find((e) => e.category === 'unpaired question');
    expect(error).toBeDefined();
    expect(error.grade).toBe('error');
    expect(error.index).toBe(2);
    expect(result.saveBlocked).toBe(true);
  });

  test('a genuine order break is also grade error', () => {
    const result = validate([
      { id: 'a1', ts: 1, kind: 'answer', text: 'body' },
      { id: 'q1', ts: 2, kind: 'question', text: '23페이지 설명해줘.' },
      { id: 'a2', ts: 3, kind: 'answer', text: 'body' },
    ]);
    const error = result.errors.find((e) => e.category === 'alternation');
    expect(error).toBeDefined();
    expect(error.index).toBe(0);
    expect(result.saveBlocked).toBe(true);
  });

  test('only grade error blocks the save', () => {
    const warningsOnly = validate(fixture3, { selectedLecture: 1 });
    expect(warningsOnly.warnings.length).toBeGreaterThan(0);
    expect(warningsOnly.saveBlocked).toBe(false);

    const errorsOnly = validate([
      { id: 'a', ts: 1, kind: 'question', text: '23페이지' },
      { id: 'a', ts: 2, kind: 'answer', text: '' },
    ]);
    expect(errorsOnly.saveBlocked).toBe(true);
  });

  test('counts are reported as info grade aggregates', () => {
    const result = validate(fixture2);
    expect(result.counts).toMatchObject({
      turns: 6,
      questions: 3,
      answers: 3,
      emptyAnswers: 0,
      pages: 1,
      unclassified: 0,
    });
  });

  test('pagination is reported when the adapter says the scan is incomplete', () => {
    const incomplete = validate(fixture1, { exhausted: false, limit: 200 });
    const warning = incomplete.warnings.find((w) => w.category === 'pagination');
    expect(warning).toBeDefined();
    expect(warning.grade).toBe('warning');

    const complete = validate(fixture1, { exhausted: true, limit: 200 });
    expect(complete.warnings.find((w) => w.category === 'pagination')).toBeUndefined();
    expect(complete.infos.find((i) => i.category === 'pagination')).toBeDefined();
  });

  test('a repeated question text is reported as info, never as a merge', () => {
    const entries = validateStructure(fixture4);
    const info = entries.find((e) => e.category === 'duplicate preserved');
    expect(info.grade).toBe('info');
    expect(info.questions[0].count).toBe(2);
  });
});

describe('1.3 / T-ORD-1 ordering contract', () => {
  test('an array supplied newest-first becomes oldest-first with a question first', () => {
    // The raw wire array is newest-first (contract 1.3, design spec section 15:
    // the FIRST element is an answer and the LAST is a question). Adapter
    // obligation 6.2 item 1 is to hand the core the reverse. This test fixes
    // the core's half of that contract: it consumes what the adapter owes and
    // starts from a question.
    const rawNewestFirst = [...fixture2].reverse();
    expect(rawNewestFirst[0].kind).toBe('answer');
    expect(rawNewestFirst[rawNewestFirst.length - 1].kind).toBe('question');

    const adapterOutput = [...rawNewestFirst].reverse();
    expect(adapterOutput[0].kind).toBe('question');
    expect(adapterOutput[adapterOutput.length - 1].kind).toBe('answer');

    // The core trusts that order and assigns pages in it.
    const { questions, groups } = runPageStateMachine(adapterOutput);
    expect(questions).toHaveLength(3);
    expect(questions[0].page).toBe(23);
    expect(questions[0].inherited).toBe(false);
    expect(groups[0].page).toBe(23);
    expect(groups).toHaveLength(1);
  });

  test('the core never reorders: reversing the input reverses the question order', () => {
    const newestFirst = [...fixture7].reverse();
    expect(newestFirst[0].kind).toBe('answer');
    const pairs = groupConversation(newestFirst);
    expect(pairs[0].question.text).toBe('23페이지로 돌아가서 그 표를 다시 설명해줘.');
    expect(pairs[0].page).toBe(23);
  });
});

describe('purity', () => {
  test('no core module reaches the network or the filesystem', async () => {
    const source = await readFile(new URL('../src/ingest-core.js', import.meta.url), 'utf8');
    for (const token of ['fetch(', 'XMLHttpRequest', 'node:http', 'node:https', 'node:fs', 'require(', 'import ']) {
      expect(source.includes(token), token).toBe(false);
    }
  });

  test('the core does not mutate its input array or its turns', () => {
    const turns = fixture2.map((t) => ({ ...t }));
    const snapshot = JSON.stringify(turns);
    runPageStateMachine(turns);
    validate(turns);
    expect(JSON.stringify(turns)).toBe(snapshot);
  });

  test('repeated calls give equal results', () => {
    expect(validate(fixture7, { selectedLecture: 1 })).toEqual(
      validate(fixture7, { selectedLecture: 1 })
    );
  });

  test('a malformed turn is a hard error rather than a default', () => {
    expect(() => runPageStateMachine([{ id: '', ts: 1, kind: 'question', text: '' }])).toThrow(
      CoreHardError
    );
    expect(() => runPageStateMachine([{ id: 'a', ts: 1, kind: 'other', text: '' }])).toThrow(
      CoreHardError
    );
    expect(() => runPageStateMachine([{ id: 'a', ts: 1, kind: 'question', text: null }])).toThrow(
      CoreHardError
    );
  });
});

describe('1.2 turn shape of the core input', () => {
  test('the core accepts every fixture without a hard error', () => {
    for (const [name, turns] of [
      ['01', fixture1],
      ['02', fixture2],
      ['03', fixture3],
      ['04', fixture4],
      ['06', fixture6],
      ['07', fixture7],
    ]) {
      expect(() => ingest(turns), name).not.toThrow();
    }
  });

  test('hasBody is derived, never stored', () => {
    const result = ingest(fixture3);
    const empty = fixture3.find((t) => t.kind === 'answer' && t.text === '');
    expect(empty.hasBody).toBeUndefined();
    expect(result.counts.emptyAnswers).toBe(1);
  });
});
// ---------------------------------------------------------------------------
// 2.2 unconditional group reopen
// ---------------------------------------------------------------------------

describe('page state machine: an explicit page always opens a new group', () => {
  // Contract 2.2 states the transition unconditionally: state n, extracted page
  // m, "새 그룹 시작". Contract 5 restates the same rule for the review path
  // ("같은 세션에서 같은 페이지를 두 번 다뤄도 heading이 두 번 열린다") and design
  // spec 13.1 agrees. The weaker "only when the page changes" reading is the
  // ambiguous design spec 6 wording, which contract 2.2 explicitly resolves
  // against. These tests pin the resolved rule.
  const turn = (id, ts, kind, text) => ({ id, ts, kind, text });

  test('the same page asked twice in a row yields two groups, not one', () => {
    const turns = [
      turn('q1', 1, 'question', '23페이지 설명해줘.'),
      turn('a1', 2, 'answer', '첫 답변.'),
      turn('q2', 3, 'question', '23페이지 표도 설명해줘.'),
      turn('a2', 4, 'answer', '두 번째 답변.'),
    ];
    const { groups } = runPageStateMachine(turns);
    expect(groups.map((g) => g.page)).toEqual([23, 23]);
    expect(groups.map((g) => g.items.length)).toEqual([1, 1]);
  });

  test('three consecutive mentions of one page yield three groups', () => {
    const turns = [
      turn('q1', 1, 'question', '19페이지 설명해줘.'),
      turn('a1', 2, 'answer', '답 1.'),
      turn('q2', 3, 'question', '19페이지 표도 설명해줘.'),
      turn('a2', 4, 'answer', '답 2.'),
      turn('q3', 5, 'question', '19페이지 예도 설명해줘.'),
      turn('a3', 6, 'answer', '답 3.'),
    ];
    expect(runPageStateMachine(turns).groups).toHaveLength(3);
  });

  test('a revisit after an intervening page still opens a group (fixture 7)', () => {
    // 23 -> 24 -> 23 is three groups and two 23 headings; this behaviour was
    // already correct and must not regress while the same-page case is fixed.
    const { groups } = runPageStateMachine(fixture7);
    expect(groups.map((g) => g.page)).toEqual([23, 24, 23]);
  });

  test('a question with no page number still inherits and does NOT open a group', () => {
    // The fix must not disturb the inherit row of the transition table: only a
    // question carrying an extracted page opens a group.
    const turns = [
      turn('q1', 1, 'question', '23페이지 설명해줘.'),
      turn('a1', 2, 'answer', '답 1.'),
      turn('q2', 3, 'question', '여기서 x는 왜 증가해?'),
      turn('a2', 4, 'answer', '답 2.'),
      turn('q3', 5, 'question', '다음 페이지 설명해줘.'),
      turn('a3', 6, 'answer', '답 3.'),
    ];
    const { groups } = runPageStateMachine(turns);
    expect(groups).toHaveLength(1);
    expect(groups[0].page).toBe(23);
    expect(groups[0].items).toHaveLength(3);
  });

  test('distinct page count is unchanged by the always-reopen rule', () => {
    // The 2026-10-05 run yields 50 DISTINCT page NUMBERS (4 to 56), which holds
    // under either reading; only the total group count differs. The recorded
    // group count under the always-reopen rule is 54, not 50, because 4
    // questions re-ask an already-seen page. This pins that the fix moves the
    // group count without moving the distinct-page count.
    const turns = [
      turn('q1', 1, 'question', '23페이지 설명해줘.'),
      turn('a1', 2, 'answer', '답 1.'),
      turn('q2', 3, 'question', '23페이지 표도 설명해줘.'),
      turn('a2', 4, 'answer', '답 2.'),
      turn('q3', 5, 'question', '24페이지 설명해줘.'),
      turn('a3', 6, 'answer', '답 3.'),
    ];
    const { groups } = runPageStateMachine(turns);
    expect(groups).toHaveLength(3);
    expect(new Set(groups.map((g) => g.page)).size).toBe(2);
  });

  test('every question is still assigned exactly one page', () => {
    const { questions } = runPageStateMachine(fixture3);
    expect(questions.map((q) => q.page)).toEqual([9, 9]);
    expect(questions.every((q) => q.page !== null)).toBe(true);
  });
});
