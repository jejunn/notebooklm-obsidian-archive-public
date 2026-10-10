// T3 acceptance checks for the Markdown assembler.
//
// The assertions come from implementation-contract.md section 6.4 (frontmatter
// and body heading depth), section 3.2 (the empty-answer placeholder), section
// 5 (the review session fragment) and section 3.1 (the answer heading is never
// omitted), plus design spec section 13.1 and 13.2 (review heading depth, the
// unclassified heading, and the no-reclassification rule).

import { describe, expect, test } from 'bun:test';

import fixture1 from '../fixtures/01-question-with-page-number.js';
import fixture2 from '../fixtures/02-follow-up-page-inheritance.js';
import fixture3 from '../fixtures/03-empty-answer.js';
import fixture4 from '../fixtures/04-duplicate-question-text.js';
import fixture5 from '../fixtures/05-odd-trailing-turn.js';
import fixture6 from '../fixtures/06-answer-with-code-block.js';
import fixture7 from '../fixtures/07-page-revisit.js';

import { CoreHardError } from '../src/ingest-core.js';
import {
  DEFAULT_UT_OFFSET_MINUTES,
  appendReviewSession,
  assembleFirstArchive,
  assembleReviewSession,
  convertLatexDelimiters,
  formatDate,
  formatTimestamp,
  renderEmptyAnswerPlaceholder,
  renderFrontmatter,
  renderPageHeading,
  yamlScalar,
} from '../src/markdown-assembler.js';

const META = {
  course: '예제 과목',
  lecture: 1,
  conversationId: '00000000-0000-4000-8000-000000000003',
  archivedDate: '2026-10-05',
};

// ---------------------------------------------------------------------------
// timestamp rendering
// ---------------------------------------------------------------------------

describe('timestamp rendering', () => {
  test('fixture 3 answer ts renders as the contract 3.2 literal', () => {
    const answer = fixture3.find((t) => t.kind === 'answer' && t.text === '');
    // Contract 3.2 prints `2026-09-28 17:14:57`, which is this instant at
    // UTC+09:00.
    expect(formatTimestamp(answer.ts)).toBe('2026-09-28 17:14:57');
  });

  test('the wall clock does not depend on the host time zone', () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = 'UTC';
      const utc = formatTimestamp(1790583297);
      process.env.TZ = 'Pacific/Kiritimati';
      const other = formatTimestamp(1790583297);
      expect(utc).toBe(other);
      expect(utc).toBe('2026-09-28 17:14:57');
    } finally {
      process.env.TZ = original;
    }
  });

  test('the offset is explicit and defaults to UTC+09:00', () => {
    expect(DEFAULT_UT_OFFSET_MINUTES).toBe(540);
    expect(formatTimestamp(1790583297, { offsetMinutes: 0 })).toBe('2026-09-28 08:14:57');
    expect(formatDate(1790583297)).toBe('2026-09-28');
  });

  test('a non-integer ts is a hard error, never a guess', () => {
    expect(() => formatTimestamp('2026-09-28')).toThrow(CoreHardError);
  });
});

// ---------------------------------------------------------------------------
// LaTeX delimiters
// ---------------------------------------------------------------------------

describe('LaTeX delimiter conversion (contract 6.4)', () => {
  test('inline \\(...\\) becomes $...$', () => {
    expect(convertLatexDelimiters('x는 \\(E = \\hbar \\omega\\) 를 뜻한다.')).toBe(
      'x는 $E = \\hbar \\omega$ 를 뜻한다.'
    );
  });

  test('block \\[...\\] becomes $$...$$', () => {
    expect(convertLatexDelimiters('\\[\n\\delta = 1\n\\]')).toBe('$$\n\\delta = 1\n$$');
  });

  test('fixture 2 answers become dollar-delimited inline math', () => {
    const markdown = assembleFirstArchive(fixture2, META);
    expect(markdown).toContain('$E = \\hbar \\omega$');
    expect(markdown).toContain('$E_k = \\hbar^2 k^2 / 2m^*$');
    expect(markdown).not.toContain('\\(');
    expect(markdown).not.toContain('\\)');
  });

  test('delimiters inside a fenced code block are left alone', () => {
    const source = '```python\nvalue = f\\(x\\)\n```';
    expect(convertLatexDelimiters(source)).toBe(source);
  });

  test('a non-string body is a hard error', () => {
    expect(() => convertLatexDelimiters(null)).toThrow(CoreHardError);
  });
});

// ---------------------------------------------------------------------------
// fixture 6 — code fence preservation
// ---------------------------------------------------------------------------

describe('fixture 6 — fenced code block survives verbatim', () => {
  const markdown = assembleFirstArchive(fixture6, META);

  test('the whole fence block is byte-identical to the answer text', () => {
    const answer = fixture6[1];
    const fenceStart = answer.text.indexOf('```python');
    const fenceEnd = answer.text.indexOf('```', fenceStart + 3) + 3;
    const fence = answer.text.slice(fenceStart, fenceEnd);
    expect(markdown).toContain(fence);
  });

  test('the fence still opens and closes and the code between is unchanged', () => {
    const answer = fixture6[1];
    const lines = markdown.split('\n');
    const open = lines.findIndex((l) => l === '```python');
    const close = lines.indexOf('```', open + 1);
    expect(open).toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(open);
    // The whole fenced region, from the opening line to the closing line, is
    // the answer's own bytes with nothing added or removed.
    const rendered = lines.slice(open, close + 1).join('\n');
    const start = answer.text.indexOf('```python');
    const end = answer.text.indexOf('```', start + 3) + 3;
    expect(rendered).toBe(answer.text.slice(start, end));
    expect(rendered.split('```python\n')[1].split('\n```')[0]).toBe(
      answer.text.split('```python\n')[1].split('\n```')[0]
    );
  });

  test('the LaTeX outside the fence is still converted', () => {
    expect(markdown).toContain('$$\n\\delta = \\frac{1}{\\alpha}');
    expect(markdown).toContain('$d$');
  });
});

// ---------------------------------------------------------------------------
// fixture 3 — empty answer placeholder
// ---------------------------------------------------------------------------

describe('fixture 3 — empty answer placeholder (contract 3.2, 3.1)', () => {
  const markdown = assembleFirstArchive(fixture3, META);
  const answer = fixture3.find((t) => t.kind === 'answer' && t.text === '');

  test('the answer heading is present and never omitted', () => {
    expect(markdown).toContain('### A');
    // Two questions, so two answer headings — one per turn.
    expect(markdown.split('### A').length - 1).toBe(2);
  });

  test('the placeholder is a blockquote line carrying the ANSWER turn timestamp', () => {
    expect(markdown).toContain(renderEmptyAnswerPlaceholder(answer.ts));
    expect(markdown).toContain('> (이 답변 기록이 비어 있습니다 — 2026-09-28 17:14:57)');
  });

  test('the placeholder sits directly under the answer heading', () => {
    const index = markdown.indexOf('### A');
    expect(markdown.slice(index, index + 100)).toContain('> (이 답변 기록이 비어 있습니다');
  });

  test('the timestamp is the answer turn ts, not the question ts', () => {
    const question = fixture3[0];
    expect(question.ts).not.toBe(answer.ts);
    const questionStamp = formatTimestamp(question.ts);
    expect(questionStamp).toBe('2026-09-28 17:14:50');
    expect(markdown).not.toContain(questionStamp);
  });

  test('the repeated question is preserved, not merged', () => {
    expect(markdown.split('2강 9페이지 설명해줘.').length - 1).toBe(2);
  });

  test('the rendered body matches the contract 3.2 rendering byte for byte', () => {
    // The contract 3.2 markdown block, transcribed exactly. Anything that
    // shifts a blank line or reorders a heading shows up here as a byte
    // difference.
    //
    // One deliberate departure from the literal in the contract: the second
    // question names `9페이지` again, so contract 2.2 opens a second
    // `## 9페이지` heading rather than continuing the first. The example block
    // in contract 3.2 shows one heading for the pair; the transition table in
    // contract 2.2 states "새 그룹 시작" unconditionally, contract 5 restates
    // that rule for the review path, and design spec 13.1 agrees. Contract 2.2
    // also declares design spec 6's "페이지가 바뀔 때만" wording ambiguous and
    // resolves it to always reopen, so the normative rule wins over the
    // illustrative block. Everything else — the placeholder line, the heading
    // depths, the blank lines — is byte for byte.
    const expected = [
      '# 1강',
      '',
      '## 9페이지',
      '',
      '### Q',
      '2강 9페이지 설명해줘.',
      '',
      '### A',
      '> (이 답변 기록이 비어 있습니다 — 2026-09-28 17:14:57)',
      '',
      '## 9페이지',
      '',
      '### Q',
      '2강 9페이지 설명해줘.',
      '',
      '### A',
      '9페이지에서는 화학 기판 epitaxy 장비의 구성과 공정 순서를 설명합니다.',
      '',
    ].join('\n');

    const body = markdown.slice(markdown.indexOf('# 1강'));
    expect(body).toBe(expected);
  });

  test('the placeholder line and heading depths of contract 3.2 are intact', () => {
    // The byte-for-byte comparison above carries the full expected block. This
    // test pins the two properties the contract states as RULES in section 3.2
    // prose, independent of the heading count: the `### A` heading survives an
    // empty answer, and the placeholder carries the ANSWER turn's timestamp.
    expect(markdown).toContain('### A');
    expect(markdown).toContain('> (이 답변 기록이 비어 있습니다 — 2026-09-28 17:14:57)');
    // The question turn's own timestamp is 2026-09-28 17:14:50 and must not
    // appear: the placeholder is the answer turn's (contract 3.1).
    expect(markdown).not.toContain('2026-09-28 17:14:50');
  });
});

// ---------------------------------------------------------------------------
// first archive: frontmatter and heading depth
// ---------------------------------------------------------------------------

describe('first archive frontmatter (contract 6.4)', () => {
  const frontmatter = renderFrontmatter({ ...META, turns: fixture3 });

  test('all eight fields are present', () => {
    expect(frontmatter).toContain('type: notebooklm-study');
    expect(frontmatter).toContain('course: 예제 과목');
    expect(frontmatter).toContain('lecture: 1');
    expect(frontmatter).toContain('archived: 2026-10-05');
    expect(frontmatter).toContain('archive_turns: 4');
    expect(frontmatter).toContain(`archive_first_turn: "${fixture3[0].id}"`);
    expect(frontmatter).toContain(`archive_last_turn: "${fixture3[3].id}"`);
    expect(frontmatter).toContain(`archive_conversation: "${META.conversationId}"`);
  });

  test('archive_turns is the turn count, not the pair count', () => {
    // The measured run is 174 turns = 87 questions + 87 answers (contract 6.4).
    const measured = Array.from({ length: 174 }, (_, i) => ({
      id: `t${String(i).padStart(3, '0')}`,
      ts: 1790000000 + i,
      kind: i % 2 === 0 ? 'question' : 'answer',
      text: `본문 ${i}`,
    }));
    const block = renderFrontmatter({ ...META, turns: measured });
    expect(block).toContain('archive_turns: 174');
    expect(block).toContain('archive_first_turn: "t000"');
    expect(block).toContain('archive_last_turn: "t173"');
    // 87 pairs, never 87.
    expect(block).not.toContain('archive_turns: 87');
  });

  test('the block is YAML delimited and carries no Dataview query', () => {
    expect(frontmatter.startsWith('---\n')).toBe(true);
    expect(frontmatter.endsWith('---')).toBe(true);
    expect(frontmatter).not.toContain('```dataview');
    expect(frontmatter.toLowerCase()).not.toContain('dataview');
  });

  test('missing user-confirmed fields are hard errors, never defaults', () => {
    expect(() => renderFrontmatter({ ...META, lecture: null, turns: fixture3 })).toThrow(CoreHardError);
    expect(() => renderFrontmatter({ ...META, course: '', turns: fixture3 })).toThrow(CoreHardError);
    expect(() => renderFrontmatter({ ...META, conversationId: '', turns: fixture3 })).toThrow(CoreHardError);
    expect(() => renderFrontmatter({ ...META, turns: [] })).toThrow(CoreHardError);
  });

  test('a scalar that would change meaning is quoted', () => {
    expect(yamlScalar('plain value')).toBe('plain value');
    expect(yamlScalar('23')).toBe('"23"');
    expect(yamlScalar('2026-10-05')).toBe('2026-10-05');
    expect(yamlScalar('key: value')).toBe('"key: value"');
    expect(yamlScalar('say "hi"')).toBe(`"say \\"hi\\""`);
    expect(yamlScalar(174)).toBe('174');
  });
});

describe('first archive body (contract 6.4, spec section 6)', () => {
  test('H1 is the lecture, H2 the page group, H3 the Q and A headings', () => {
    const markdown = assembleFirstArchive(fixture7, META);
    expect(markdown).toContain('# 1강');
    expect(markdown).toContain('## 23페이지');
    expect(markdown).toContain('## 24페이지');
    expect(markdown).toContain('### Q');
    expect(markdown).toContain('### A');
    // No review-session depth leaks into a first archive.
    expect(markdown).not.toContain('## 추가 질문');
    expect(markdown).not.toContain('#### ');
    expect(markdown).not.toContain('##### ');
  });

  test('a revisited page opens its H2 heading again (contract 2.2)', () => {
    const markdown = assembleFirstArchive(fixture7, META);
    expect(markdown.split('## 23페이지').length - 1).toBe(2);
    // Conversation order is kept: 23 comes before 24, and 23 comes back after.
    expect(markdown.indexOf('## 23페이지')).toBeLessThan(markdown.indexOf('## 24페이지'));
    expect(markdown.lastIndexOf('## 23페이지')).toBeGreaterThan(markdown.indexOf('## 24페이지'));
  });

  test('an unclassified question gets no page heading but is still rendered', () => {
    const turns = [
      { id: 'u1', ts: 1790583290, kind: 'question', text: '이 강의에서 가장 중요한 부분 정리해줘' },
      { id: 'u2', ts: 1790583300, kind: 'answer', text: '정리합니다.' },
    ];
    const markdown = assembleFirstArchive(turns, META);
    expect(markdown).toContain('이 강의에서 가장 중요한 부분 정리해줘');
    expect(markdown).toContain('정리합니다.');
    expect(markdown).not.toContain('페이지');
    // The renderer's guard exists because a first archive never writes this
    // heading (contract 2.6).
    expect(() => renderPageHeading(null, 'first')).toThrow(CoreHardError);
  });

  test('the file ends with a newline and starts with the frontmatter block', () => {
    const markdown = assembleFirstArchive(fixture3, META);
    expect(markdown.startsWith('---\ntype: notebooklm-study\n')).toBe(true);
    expect(markdown.endsWith('\n')).toBe(true);
  });

  test('every fixture assembles without a hard error', () => {
    for (const [name, turns] of [
      ['01', fixture1],
      ['02', fixture2],
      ['03', fixture3],
      ['04', fixture4],
      ['05', fixture5],
      ['06', fixture6],
      ['07', fixture7],
    ]) {
      expect(() => assembleFirstArchive(turns, META), name).not.toThrow();
      expect(() => assembleReviewSession(turns, { date: '2026-10-15' }), name).not.toThrow();
    }
  });

  test('an unpaired trailing question renders its Q heading without an A', () => {
    // Fixture 5 ends with a lone question. The core already reports this as
    // grade error and blocks the save (contract 1.4, 3.3); the renderer must
    // still not crash and must not invent an empty answer turn to pair with it.
    const markdown = assembleFirstArchive(fixture5, META);
    expect(markdown).toContain('### Q\n이 표는 왜 이렇게 돼?');
    expect(markdown.split('### A').length - 1).toBe(1);
    expect(markdown).not.toContain('이 답변 기록이 비어 있습니다');
  });
});

// ---------------------------------------------------------------------------
// review session
// ---------------------------------------------------------------------------

describe('review session assembly (spec 13.1, 13.2; contract section 5)', () => {
  const firstArchive = assembleFirstArchive(fixture7, META);
  const reviewTurns = [
    { id: 'r1', ts: 1790670000, kind: 'question', text: '23페이지 독점시장 조건이 뭐였지?' },
    { id: 'r2', ts: 1790670010, kind: 'answer', text: '23페이지는 직접 천이와 간접 천이를 다룹니다.' },
    { id: 'r3', ts: 1790670020, kind: 'question', text: '5페이지 표는 왜 그렇지?' },
    { id: 'r4', ts: 1790670030, kind: 'answer', text: '5페이지 표는 결정 구조를 비교합니다.' },
  ];
  const fragment = assembleReviewSession(reviewTurns, { date: '2026-10-15' });

  test('the heading depth is H2 section, H3 date, H4 page, H5 Q and A', () => {
    expect(fragment).toContain('## 추가 질문');
    expect(fragment).toContain('### 2026-10-15');
    expect(fragment).toContain('#### 23페이지');
    expect(fragment).toContain('##### Q');
    expect(fragment).toContain('##### A');
    // The first-archive depth must not appear as a line of its own.
    expect(fragment.split('\n').filter((l) => l === '### Q')).toEqual([]);
    expect(fragment.split('\n').filter((l) => l === '### A')).toEqual([]);
    expect(fragment.split('\n').filter((l) => l === '## 23페이지')).toEqual([]);
  });

  test('the section comes first and the date second', () => {
    expect(fragment.indexOf('## 추가 질문')).toBeLessThan(fragment.indexOf('### 2026-10-15'));
    expect(fragment.indexOf('### 2026-10-15')).toBeLessThan(fragment.indexOf('#### 23페이지'));
  });

  test('conversation order is kept, pages are not sorted', () => {
    expect(fragment.indexOf('#### 23페이지')).toBeLessThan(fragment.indexOf('#### 5페이지'));
  });

  test('an unclassified review question uses the 페이지 미지정 heading', () => {
    const unclassified = assembleReviewSession(
      [
        { id: 'u1', ts: 1790670000, kind: 'question', text: '독점시장의 가격차별 조건이 뭐였지?' },
        { id: 'u2', ts: 1790670010, kind: 'answer', text: '수요와 공급의 탄력성 차이입니다.' },
      ],
      { date: '2026-10-15' }
    );
    expect(unclassified).toContain('#### 페이지 미지정');
    expect(renderPageHeading(null, 'review')).toBe('#### 페이지 미지정');
    // No page number is invented for it (spec 13.2).
    expect(unclassified).not.toMatch(/#### \d+페이지/);
  });

  test('returning to a page inside one session opens the heading again', () => {
    // Contract 2.2: a group reopens when the page changes, so 23 -> 24 -> 23
    // produces two `#### 23페이지` headings. A consecutive repeat of the same
    // page is one group, because nothing changed.
    const revisited = assembleReviewSession(
      [
        { id: 'p1', ts: 1790670000, kind: 'question', text: '23페이지 설명해줘.' },
        { id: 'p2', ts: 1790670010, kind: 'answer', text: '첫 답변.' },
        { id: 'p3', ts: 1790670020, kind: 'question', text: '24페이지 설명해줘.' },
        { id: 'p4', ts: 1790670030, kind: 'answer', text: '가운데 답변.' },
        { id: 'p5', ts: 1790670040, kind: 'question', text: '23페이지 표도 설명해줘.' },
        { id: 'p6', ts: 1790670050, kind: 'answer', text: '두 번째 답변.' },
      ],
      { date: '2026-10-15' }
    );
    expect(revisited.split('\n').filter((l) => l === '#### 23페이지').length).toBe(2);
    expect(revisited.split('\n').filter((l) => l === '#### 24페이지').length).toBe(1);

    const repeated = assembleReviewSession(
      [
        { id: 'q1', ts: 1790670000, kind: 'question', text: '23페이지 설명해줘.' },
        { id: 'q2', ts: 1790670010, kind: 'answer', text: '첫 답변.' },
        { id: 'q3', ts: 1790670020, kind: 'question', text: '23페이지 표도 설명해줘.' },
        { id: 'q4', ts: 1790670030, kind: 'answer', text: '두 번째 답변.' },
      ],
      { date: '2026-10-15' }
    );
    // A question naming a page opens a new group even when the number equals
    // the page currently open (contract 2.2, restated for the review path in
    // contract 5 and design spec 13.1). Both questions here carry `23페이지`,
    // so the heading appears twice.
    expect(repeated.split('\n').filter((l) => l === '#### 23페이지').length).toBe(2);
  });

  test('an empty review answer keeps its heading and gets a placeholder', () => {
    const withEmpty = assembleReviewSession(
      [
        { id: 'e1', ts: 1790670000, kind: 'question', text: '27페이지 설명해줘.' },
        { id: 'e2', ts: 1790670010, kind: 'answer', text: '' },
      ],
      { date: '2026-10-15' }
    );
    expect(withEmpty).toContain('##### A');
    expect(withEmpty).toContain('> (이 답변 기록이 비어 있습니다 — 2026-09-29 17:20:10)');
  });

  test('a malformed date is a hard error, not a silently invented heading', () => {
    expect(() => assembleReviewSession(reviewTurns, { date: '2026/10/15' })).toThrow(CoreHardError);
    expect(() => assembleReviewSession(reviewTurns, {})).toThrow(CoreHardError);
  });
});

describe('appending a review session does not reclassify anything', () => {
  const firstArchive = assembleFirstArchive(fixture7, META);
  const fragment = assembleReviewSession(
    [
      { id: 'r1', ts: 1790670000, kind: 'question', text: '23페이지 독점시장 조건이 뭐였지?' },
      { id: 'r2', ts: 1790670010, kind: 'answer', text: '직접 천이와 간접 천이입니다.' },
    ],
    { date: '2026-10-15' }
  );
  const appended = appendReviewSession(firstArchive, fragment);

  test('the existing content is preserved byte for byte', () => {
    expect(appended.startsWith(firstArchive.replace(/\n+$/, ''))).toBe(true);
  });

  test('existing H2 page groups keep their heading and count', () => {
    const bodyBefore = firstArchive.split('---').slice(2).join('---');
    const h2Before = bodyBefore.match(/^## .*페이지$/gm) ?? [];
    expect(h2Before).toEqual(['## 23페이지', '## 24페이지', '## 23페이지']);
    // The appended fragment adds no H2 page group at all.
    const fragmentH2 = fragment.match(/^## .*페이지$/gm) ?? [];
    expect(fragmentH2).toEqual([]);
    expect(appended.split('## 추가 질문').length - 1).toBe(1);
  });

  test('the review page nests as H4, so the same page number may exist twice', () => {
    expect(appended).toContain('#### 23페이지');
    // The H2 count is unchanged: the review page nests one level deeper, so
    // `## 23페이지` is still only the one the first archive wrote.
    const h2Pages = appended.split('\n').filter((l) => l === '## 23페이지');
    expect(h2Pages.length).toBe(2);
    expect(appended.split('\n').filter((l) => l === '#### 23페이지').length).toBe(1);
  });

  test('the fragment is placed after the existing body, at the end of file', () => {
    expect(appended.indexOf('## 추가 질문')).toBeGreaterThan(appended.indexOf('## 24페이지'));
    expect(appended.trimEnd().endsWith('직접 천이와 간접 천이입니다.')).toBe(true);
  });

  test('appending to an empty file yields the fragment alone', () => {
    expect(appendReviewSession('', fragment)).toBe(fragment);
  });

  test('a non-string argument is a hard error', () => {
    expect(() => appendReviewSession(null, fragment)).toThrow(CoreHardError);
    expect(() => appendReviewSession(firstArchive, null)).toThrow(CoreHardError);
  });
});