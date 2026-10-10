// T6 acceptance checks for the validation output.
//
// The assertions come from implementation-contract.md section 2.4 (the
// multi-page notice shows the question's first line), 2.5 (`다른 강의 질문 N건
// 포함 (N강)` plus each question's first line and time), 2.6 (`미분류 질문 N개`
// plus each question's first line), 3.1 (empty-answer and
// duplicates-not-merged notices), 3.3 (`error` alone blocks the save), 4 (the
// pagination line), 6.3 (structured fields AND a human-readable block); design
// spec section 10 (the block shape and "검증 출력은 파일 저장보다 먼저").
//
// Every fixture is run through the full pipeline, so the "every fixture
// produces a block" acceptance is checked by construction. No test reaches the
// network or the vault: the write function is a local counter.

import { describe, expect, test } from 'bun:test';

import fixture1 from '../fixtures/01-question-with-page-number.js';
import fixture2 from '../fixtures/02-follow-up-page-inheritance.js';
import fixture3 from '../fixtures/03-empty-answer.js';
import fixture4 from '../fixtures/04-duplicate-question-text.js';
import fixture5 from '../fixtures/05-odd-trailing-turn.js';
import fixture6 from '../fixtures/06-answer-with-code-block.js';
import fixture7 from '../fixtures/07-page-revisit.js';

import {
  CoreHardError,
  validate,
  validateStructure,
  GRADE_ERROR,
  GRADE_INFO,
  GRADE_WARNING,
} from '../src/ingest-core.js';
import {
  firstLineOf,
  isSaveBlocked,
  renderValidationBlock,
  runValidationPipeline,
} from '../src/validation-output.js';

const ALL_FIXTURES = {
  1: fixture1,
  2: fixture2,
  3: fixture3,
  4: fixture4,
  5: fixture5,
  6: fixture6,
  7: fixture7,
};

/** A write stub that records whether it was called at all. */
function countingWrite() {
  const calls = [];
  const write = async (context) => {
    calls.push(context);
    return { status: 204 };
  };
  write.calls = calls;
  return write;
}

describe('the first line of a question', () => {
  test('a one-line question is its own first line', () => {
    expect(firstLineOf('23페이지 설명해줘.')).toBe('23페이지 설명해줘.');
  });

  test('a multi-line question shows only its first line', () => {
    expect(firstLineOf('첫째 줄\n둘째 줄\n셋째 줄')).toBe('첫째 줄');
  });

  test('a missing or empty text yields an empty string, never undefined', () => {
    expect(firstLineOf(null)).toBe('');
    expect(firstLineOf(undefined)).toBe('');
    expect(firstLineOf('')).toBe('');
    expect(firstLineOf('\n\n')).toBe('');
  });
});

describe('every fixture produces a block plus structured fields', () => {
  for (const [number, turns] of Object.entries(ALL_FIXTURES)) {
    test(`fixture ${number} renders a block and keeps its structured fields`, () => {
      const block = renderValidationBlock(validate(turns), {
        pagination: { turnCount: turns.length, pageCount: 1, limit: 200, exhausted: true },
      });

      // The block.
      expect(block).toContain('저장 전 검증');
      expect(block).toContain('질문:');
      expect(block).toContain('답변:');
      expect(block).toContain('빈 답변:');
      expect(block).toContain('감지된 페이지:');
      expect(block).toContain('미분류 질문:');
      expect(block).toMatch(/저장: (진행|차단)/);

      // The pagination line, built by the adapter's renderer (contract 4).
      expect(block).toContain(`조회: ${turns.length} turn (1페이지, limit=200, 토큰 소진 확인됨)`);

      // The structured half survives alongside the text.
      const structured = validate(turns);
      expect(Array.isArray(structured.entries)).toBe(true);
      expect(structured.counts.turns).toBe(turns.length);
    });
  }
});

describe('grade error blocks the save and no write is attempted', () => {
  test('fixture 5 (odd trailing turn) blocks and never calls the write', async () => {
    const write = countingWrite();
    const run = await runValidationPipeline({ turns: fixture5, write });

    expect(run.result.saveBlocked).toBe(true);
    expect(isSaveBlocked(run.result)).toBe(true);
    expect(run.writeAttempted).toBe(false);
    expect(write.calls).toHaveLength(0);
    expect(run.writeResult).toBeNull();
    expect(run.block).toContain('저장: 차단');
    expect(run.block).toContain('error가 있어서 파일을 쓰지 않습니다');
  });

  test('a duplicated turn ID blocks the same way (contract 1.4)', async () => {
    const turns = [
      { id: 'a', ts: 1, kind: 'question', text: '23페이지' },
      { id: 'a', ts: 2, kind: 'answer', text: '' },
    ];
    const write = countingWrite();
    const run = await runValidationPipeline({ turns, write });

    expect(run.saveBlocked).toBe(true);
    expect(write.calls).toHaveLength(0);
    expect(run.block).toContain('저장: 차단');
  });

  test('the block prints the blocking entry before anything is written', () => {
    const block = renderValidationBlock(validate(fixture5));
    expect(block).toContain('오류');
    expect(block.indexOf('저장: 차단')).toBeGreaterThan(block.indexOf('오류'));
  });

  test('a caller with no write function is not silently treated as saved', async () => {
    const run = await runValidationPipeline({ turns: fixture5 });
    expect(run.writeAttempted).toBe(false);
    expect(run.saveBlocked).toBe(true);

    await expect(runValidationPipeline({ turns: fixture1 })).rejects.toThrow(CoreHardError);
  });
});

describe('warnings do not block and every one is displayed', () => {
  test('fixture 3: empty answer and other-lecture warnings, save proceeds', async () => {
    const write = countingWrite();
    const run = await runValidationPipeline({
      turns: fixture3,
      selectedLecture: 1,
      write,
    });

    expect(run.saveBlocked).toBe(false);
    expect(isSaveBlocked(run.result)).toBe(false);
    expect(write.calls).toHaveLength(1);
    expect(write.calls[0].block).toBe(run.block);

    // Both warnings are printed, not summarised away (contract 3.3).
    expect(run.block).toContain('빈 답변 1건');
    expect(run.block).toContain('다른 강의 질문 2건 포함 (2강)');
    expect(run.block).toContain('저장: 진행');
  });

  test('the duplicate-preserved notice is printed as info, grade info', () => {
    const result = validate(fixture4);
    const info = result.entries.find((e) => e.category === 'duplicate preserved');
    expect(info.grade).toBe(GRADE_INFO);

    const block = renderValidationBlock(result);
    expect(block).toContain('중복 질문 1쌍 — 합치지 않고 모두 보존함');
    expect(block).toContain('55페이지 설명해줘 (2건)');
    expect(block).toContain('저장: 진행');
  });

  test('a warning-only result reports every warning it holds', () => {
    const result = validate(fixture3, { selectedLecture: 1 });
    expect(result.warnings.length).toBeGreaterThan(0);
    for (const entry of result.warnings) expect(entry.grade).toBe(GRADE_WARNING);

    const block = renderValidationBlock(result);
    // Every warning category reachable in fixture 3 gets its own header.
    expect(block).toContain('⚠ 다른 강의 질문 2건 포함 (2강)');
    expect(block).toContain('⚠ 빈 답변 1건 (raw 응답에서 실제로 비어 있었음)');
  });
});

describe('the unclassified line (contract 2.6, spec 10)', () => {
  test('it names the count and shows each question first line', () => {
    const turns = [
      { id: 'q1', ts: 1790583290, kind: 'question', text: '독점시장의 가격차별 조건이 뭐였지?' },
      { id: 'a1', ts: 1790583300, kind: 'answer', text: '첫 질문의 답변입니다.' },
      { id: 'q2', ts: 1790583310, kind: 'question', text: '이 문제에서 왜 이 공식을 적용하는 거야?\n두 번째 줄' },
      { id: 'a2', ts: 1790583320, kind: 'answer', text: '두 번째 질문의 답변입니다.' },
    ];

    const block = renderValidationBlock(validate(turns));

    expect(block).toContain('미분류 질문: 2개');
    expect(block).toContain('⚠ 미분류 질문 2개');
    expect(block).toContain('• 독점시장의 가격차별 조건이 뭐였지?');
    // Only the first line of the multi-line question is shown.
    expect(block).toContain('• 이 문제에서 왜 이 공식을 적용하는 거야?');
    expect(block).not.toContain('두 번째 줄');

    // No page number is invented for an unclassified question.
    expect(block).not.toMatch(/미분류[^]*?\d+페이지/);
  });

  test('no unclassified line at all when every question has a page', () => {
    const block = renderValidationBlock(validate(fixture1));
    expect(block).toContain('미분류 질문: 0개');
    expect(block).not.toContain('⚠ 미분류 질문');
  });
});

describe('the other-lecture line (contract 2.5)', () => {
  test('it reads with the count and the lecture number, and lists first line plus time', () => {
    const turns = [
      { id: 'q1', ts: 1790583290, kind: 'question', text: '2강 9페이지 설명해줘.' },
      { id: 'a1', ts: 1790583300, kind: 'answer', text: '답변 하나.' },
      { id: 'q2', ts: 1790583310, kind: 'question', text: '3강 4페이지 설명해줘.' },
      { id: 'a2', ts: 1790583320, kind: 'answer', text: '답변 둘.' },
    ];

    const block = renderValidationBlock(validate(turns, { selectedLecture: 1 }));

    expect(block).toContain('⚠ 다른 강의 질문 2건 포함 (2강, 3강)');
    expect(block).toContain('• 2강 9페이지 설명해줘. (2026-09-28 17:14:50)');
    expect(block).toContain('• 3강 4페이지 설명해줘. (2026-09-28 17:15:10)');
    expect(block).toContain('저장: 진행');
  });

  test('T-ALT-2: a single foreign-lecture question still warns', () => {
    const turns = [
      { id: 'q1', ts: 1790583290, kind: 'question', text: '2강 9페이지 설명해줘.' },
      { id: 'a1', ts: 1790583300, kind: 'answer', text: '9페이지의 답변입니다.' },
    ];
    const block = renderValidationBlock(validate(turns, { selectedLecture: 1 }));
    expect(block).toContain('⚠ 다른 강의 질문 1건 포함 (2강)');
    expect(block).toContain('저장: 진행');
  });

  test('no line when the prefix matches the selected lecture (T-ALT-1 negative)', () => {
    const block = renderValidationBlock(validate(fixture4, { selectedLecture: 1 }));
    expect(block).not.toContain('다른 강의');
  });

  test('no line when the lecture was never selected (contract 9: never inferred)', () => {
    const block = renderValidationBlock(validate(fixture3));
    expect(block).not.toContain('다른 강의');
  });
});

describe('the empty-answer notice (contract 3.1, spec 10)', () => {
  test('it shows the question first line with the ANSWER turn timestamp', () => {
    const block = renderValidationBlock(validate(fixture3));

    expect(block).toContain('빈 답변: 1');
    expect(block).toContain('⚠ 빈 답변 1건 (raw 응답에서 실제로 비어 있었음)');
    // 1790583297 is the answer turn, printed at UTC+09:00 as the contract 3.2
    // literal 2026-09-28 17:14:57.
    expect(block).toContain('• 2강 9페이지 설명해줘. (2026-09-28 17:14:57)');
  });

  test('the answer heading is not what this notice claims to remove', () => {
    // The notice reports the state; it does not decide to drop the answer. The
    // placeholder and the kept heading are the assembler's job (contract 3.2).
    const block = renderValidationBlock(validate(fixture3));
    expect(block).toContain('저장: 진행');
  });
});

describe('the multi-page reference notice (contract 2.4)', () => {
  test('P-09: the notice carries the question first line and the save proceeds', () => {
    const turns = [
      { id: 'q1', ts: 1, kind: 'question', text: '1, 2, 3, 5, 8페이지' },
      { id: 'a1', ts: 2, kind: 'answer', text: '답변 본문.' },
    ];
    const block = renderValidationBlock(validate(turns));

    expect(block).toContain('⚠ 복수 페이지 참조 1건');
    expect(block).toContain('• 1, 2, 3, 5, 8페이지');
    expect(block).toContain('저장: 진행');
  });

  test('the skipped pages themselves are never listed (contract 2.4)', () => {
    const turns = [
      { id: 'q1', ts: 1, kind: 'question', text: '1, 2, 3, 5, 8페이지' },
      { id: 'a1', ts: 2, kind: 'answer', text: '답변 본문.' },
    ];
    const block = renderValidationBlock(validate(turns));
    expect(block).not.toContain('미학습 페이지');
    expect(block).not.toContain('건너뛴 페이지');
  });
});

describe('the page counts (contract 3.3 info grade)', () => {
  test('fixture 7 reopens the page, so the distinct page count is 2', () => {
    const block = renderValidationBlock(validate(fixture7));
    expect(block).toContain('감지된 페이지: 2개');
  });

  test('a page-free conversation reports zero detected pages', () => {
    const turns = [{ id: 'q1', ts: 1, kind: 'question', text: '설명해줘' }];
    const block = renderValidationBlock(validate(turns));
    expect(block).toContain('감지된 페이지: 0개');
  });
});

describe('the pagination line (contract 4)', () => {
  test('the line prints only when the caller supplies the adapter report', () => {
    const withoutReport = renderValidationBlock(validate(fixture1));
    expect(withoutReport).not.toContain('조회:');

    const withReport = renderValidationBlock(validate(fixture1), {
      pagination: { turnCount: 174, pageCount: 3, limit: 200, exhausted: true },
    });
    expect(withReport).toContain('조회: 174 turn (3페이지, limit=200, 토큰 소진 확인됨)');
  });

  test('a truncated run never reads as the whole conversation', () => {
    const block = renderValidationBlock(validate(fixture1), {
      pagination: { turnCount: 100, pageCount: 1, limit: 200, exhausted: false },
    });
    expect(block).toContain('전체 조회 아님');
    expect(block).not.toContain('토큰 소진 확인됨');
    expect(block).toContain('저장: 진행');
  });

  test('an incomplete scan is also carried as a warning by the core', () => {
    const result = validate(fixture1, { exhausted: false, limit: 200 });
    const warning = result.warnings.find((w) => w.category === 'pagination');
    expect(warning.grade).toBe(GRADE_WARNING);
    expect(renderValidationBlock(result)).toContain(warning.message);
  });
});

describe('the block accepts the caller input fields (spec 10)', () => {
  test('과목, 강의 and 파일 print when supplied and are absent otherwise', () => {
    const plain = renderValidationBlock(validate(fixture1));
    expect(plain).not.toContain('과목:');
    expect(plain).not.toContain('강의:');
    expect(plain).not.toContain('파일:');

    const full = renderValidationBlock(validate(fixture1), {
      course: '예제 과목',
      lecture: 1,
      filePath: '예제 과목/1강.md',
    });
    expect(full).toContain('과목: 예제 과목');
    expect(full).toContain('강의: 1강');
    expect(full).toContain('파일: 예제 과목/1강.md');
  });
});

describe('only grade error blocks (contract 3.3)', () => {
  test('isSaveBlocked is false for a warning-only and for an info-only result', () => {
    expect(isSaveBlocked(validate(fixture3, { selectedLecture: 1 }))).toBe(false);
    expect(isSaveBlocked(validate(fixture4))).toBe(false);
  });

  test('isSaveBlocked is true as soon as one error exists', () => {
    expect(isSaveBlocked(validate(fixture5))).toBe(true);
    expect(isSaveBlocked(validateStructure(fixture5)[0] ? { errors: validate(fixture5).errors } : null)).toBe(
      true
    );
  });

  test('an unrecognised grade is treated as an error, never as a pass', () => {
    const block = renderValidationBlock(
      { entries: [{ grade: 'fatal', category: 'unknown', message: '알 수 없는 등급' }], counts: {} },
      {}
    );
    expect(block).toContain('저장: 차단');
    expect(block).toContain('알 수 없는 등급');
  });

  test('extra entries from the delta layer join the same block', () => {
    const block = renderValidationBlock(validate(fixture1), {
      extraEntries: [{ grade: GRADE_ERROR, category: 'file conflict', message: '대상 파일이 이미 있습니다' }],
    });
    expect(block).toContain('대상 파일이 이미 있습니다');
    expect(block).toContain('저장: 차단');
  });

  test('an extra-entry error blocks the write, not just the printed line', async () => {
    // The block said `저장: 차단` while the write still ran. The gate and the
    // block have to read the same entries or the decision shown to the user is
    // not the decision the tool makes.
    const conflict = {
      grade: GRADE_ERROR,
      category: 'file conflict',
      message: '대상 파일이 이미 있습니다',
    };
    const write = countingWrite();
    const run = await runValidationPipeline({ turns: fixture1, extraEntries: [conflict], write });

    expect(run.block).toContain('저장: 차단');
    expect(run.saveBlocked).toBe(true);
    expect(run.writeAttempted).toBe(false);
    expect(write.calls).toHaveLength(0);
  });

  test('extra warnings and infos are reported and still let the save proceed', async () => {
    const write = countingWrite();
    const run = await runValidationPipeline({
      turns: fixture1,
      extraEntries: [
        { grade: GRADE_WARNING, category: 'delta', message: '기준 turn 174에서 일치' },
        { grade: GRADE_INFO, category: 'delta', message: '집계: 질문 1' },
      ],
      write,
    });

    expect(run.saveBlocked).toBe(false);
    expect(write.calls).toHaveLength(1);
    expect(run.block).toContain('기준 turn 174에서 일치');
    expect(run.block).toContain('집계: 질문 1');
    expect(run.block).toContain('저장: 진행');
  });
});

describe('malformed input raises instead of rendering a half block', () => {
  test('renderValidationBlock needs a validation result', () => {
    expect(() => renderValidationBlock(null)).toThrow(CoreHardError);
    expect(() => renderValidationBlock({})).toThrow(CoreHardError);
  });

  test('isSaveBlocked needs a result', () => {
    expect(() => isSaveBlocked(null)).toThrow(CoreHardError);
  });

  test('the pipeline needs a request object', async () => {
    await expect(runValidationPipeline(null)).rejects.toThrow(CoreHardError);
  });
});

describe('the block reaches the user before the file exists (spec 10)', () => {
  test('the write function is handed the block it was gated on', async () => {
    const write = countingWrite();
    const run = await runValidationPipeline({ turns: fixture2, write, course: '예제 과목' });

    expect(run.writeAttempted).toBe(true);
    expect(run.block).toContain('저장 전 검증');
    expect(run.block).toContain('과목: 예제 과목');
    expect(write.calls[0].block).toBe(run.block);
    expect(write.calls[0].turns).toBe(fixture2);
  });
});