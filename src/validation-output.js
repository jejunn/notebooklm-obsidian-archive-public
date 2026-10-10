// Validation output — the block the user reads before anything is written.
//
// Contract reference: implementation-contract.md section 2.4 (the multi-page
// notice shows the question's first line), 2.5 (`다른 강의 질문 N건 포함 (N강)`
// plus each question's first line and time), 2.6 (`미분류 질문 N개` plus each
// question's first line), 3.1 (the empty-answer notice and the
// duplicates-are-not-merged notice), 3.3 (`error` alone blocks the save), 4
// (the pagination line), 6.3 (the core hands over structured fields AND a
// human-readable block); design spec section 10 (the block shape, the unclassified
// and empty-answer bullet lists, and "검증 출력은 파일 저장보다 먼저").
//
// This module is pure. It reads a validation result and renders it; it never
// performs a write. The save gate is a separate function so that the ordering
// rule of spec section 10 — the block reaches the user before a file is created
// — is expressed once, in one place, and can be tested without a vault.

import { CoreHardError, GRADE_ERROR, GRADE_INFO, GRADE_WARNING, validate } from './ingest-core.js';
import { formatPaginationLine } from './adapter.js';
import { formatTimestamp } from './markdown-assembler.js';

/** Bullet used by every notice list. The spec's example blocks use it. */
const BULLET = '•';

/** Grade marker per contract 3.3. Errors are printed first, so they are seen. */
const MARKER = Object.freeze({
  [GRADE_ERROR]: '✖',
  [GRADE_WARNING]: '⚠',
  [GRADE_INFO]: '·',
});

/**
 * The first line of a text, with surrounding whitespace removed.
 *
 * Spec section 10 asks for "각 질문의 첫 줄 정도" and contract 2.4 requires the
 * notice to carry "질문 원문 첫 줄". The text is never reformatted or truncated:
 * a notice that shortened a question would hide the very words the user needs to
 * recognise it. A multi-line question simply shows its first line, which is
 * enough to identify it.
 *
 * @param {string|null|undefined} text
 * @returns {string} the first non-empty line, or '' when there is none
 */
export function firstLineOf(text) {
  if (typeof text !== 'string') return '';
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return '';
}

/**
 * One bullet line: `<marker> <text> (<timestamp>)` or `<marker> <text>`.
 *
 * The timestamp is the one the entry carries, so the empty-answer notice prints
 * the ANSWER turn's time (contract 3.1 last row) and the other-lecture notice
 * prints the QUESTION turn's time (contract 2.5). The caller decides which by
 * passing `ts`; nothing here looks the timestamp up.
 *
 * @param {string} marker
 * @param {string} text already first-lined
 * @param {number|null} [ts]
 * @param {{offsetMinutes?: number}} [options]
 * @returns {string}
 */
function bullet(marker, text, ts = null, options = {}) {
  const line = text.length > 0 ? text : '(빈 줄)';
  const prefix = marker.length > 0 ? `${marker} ${BULLET}` : BULLET;
  if (ts === null || ts === undefined) {
    return `${prefix} ${line}`;
  }
  return `${prefix} ${line} (${formatTimestamp(ts, options)})`;
}

// ---------------------------------------------------------------------------
// Per-category notice bodies
// ---------------------------------------------------------------------------

/**
 * Render the body lines of one validation entry.
 *
 * Every branch reads the entry's own structured fields and never re-derives a
 * fact the core already decided. A category with no body renders nothing; the
 * generic message line still prints, so an entry added by a later task is never
 * silently dropped from the block.
 *
 * @param {object} entry
 * @param {{offsetMinutes?: number}} options
 * @returns {Array<string>} body lines, possibly empty
 */
function renderEntryBody(entry, options) {
  switch (entry.category) {
    // Contract 2.6 / spec 10: the unclassified list shows each question's first
    // line. No page number is invented and none is printed as if it existed.
    case 'unclassified':
      return (entry.questions ?? []).map((q) => bullet('', firstLineOf(q.text)));

    // Contract 2.5: each question's first line AND its time.
    case 'other-lecture':
      return (entry.questions ?? []).map((q) =>
        bullet('', firstLineOf(q.text), q.ts, options)
      );

    // Contract 3.1 / spec 10: the question text with the answer turn's time.
    case 'empty answer':
      return (entry.answers ?? []).map((a) =>
        bullet('', firstLineOf(a.questionText), a.answerTs, options)
      );

    // Contract 2.4: the notice carries the question's first line.
    case 'multi-page reference':
      return (entry.questions ?? []).map((q) => bullet('', firstLineOf(q.text)));

    // Contract 3.1: duplicates are kept, so the notice proves nothing merged.
    case 'duplicate preserved':
      return (entry.questions ?? []).map((q) =>
        bullet('', `${firstLineOf(q.text)} (${q.count}건)`, null, options)
      );

    default:
      return [];
  }
}

/**
 * The count phrase a notice header carries.
 *
 * Contract 2.5 fixes the other-lecture header literally. The other headers
 * follow spec section 10's example wording.
 *
 * @param {object} entry
 * @returns {string}
 */
function renderEntryHeader(entry) {
  switch (entry.category) {
    case 'unclassified':
      return `⚠ 미분류 질문 ${countOf(entry.questions)}개`;
    case 'other-lecture':
      return `⚠ 다른 강의 질문 ${countOf(entry.questions)}건 포함 (${lectureList(entry)})`;
    case 'empty answer':
      return `⚠ 빈 답변 ${countOf(entry.answers)}건 (raw 응답에서 실제로 비어 있었음)`;
    case 'multi-page reference':
      return `⚠ 복수 페이지 참조 ${countOf(entry.questions)}건`;
    case 'duplicate preserved':
      return `· 중복 질문 ${countOf(entry.questions)}쌍 — 합치지 않고 모두 보존함`;
    default:
      return `${MARKER[entry.grade] ?? MARKER[GRADE_INFO]} ${entry.message}`;
  }
}

function countOf(list) {
  return Array.isArray(list) ? list.length : 0;
}

/**
 * The lecture numbers a notice names, de-duplicated and in first-seen order.
 *
 * The block must print the lecture a question names, not a number inherited from
 * whichever entry happened to be built first. A conversation may name more than
 * one foreign lecture, so this lists them all.
 */
function lectureList(entry) {
  const numbers = [];
  for (const question of entry.questions ?? []) {
    if (Number.isInteger(question.lecture) && !numbers.includes(question.lecture)) {
      numbers.push(question.lecture);
    }
  }
  if (numbers.length === 0 && Number.isInteger(entry.lecture)) numbers.push(entry.lecture);
  return numbers.map((n) => `${n}강`).join(', ');
}

// ---------------------------------------------------------------------------
// The block
// ---------------------------------------------------------------------------

/**
 * Render the whole pre-save validation block.
 *
 * Shape, from design spec section 10 and contract 6.3:
 *
 *   저장 전 검증
 *
 *   과목: 예제 과목
 *   강의: 1강
 *   파일: 예제 과목/1강.md
 *   조회: 174 turn (3페이지, limit=200, 토큰 소진 확인됨)
 *   질문: 87
 *   답변: 87
 *   빈 답변: 2
 *   감지된 페이지: 50개
 *   미분류 질문: 1개
 *
 *   ⚠ 빈 답변 2건 (raw 응답에서 실제로 비어 있었음)
 *   • 2강 9페이지 설명해줘 (2026-09-28 17:14:57)
 *   ...
 *   저장: 진행 — error 0건, warning 3건, info 2건
 *
 * The `과목` and `파일` lines are inputs, so they print only when the caller
 * supplies them (spec section 10's note that a section example's input fields are
 * still inputs). `조회` prints only when the caller supplies the adapter's
 * pagination report, because the core alone cannot know the RPC page count
 * (contract 4).
 *
 * @param {object} result the result of `validate`
 * @param {{course?: string, lecture?: number, filePath?: string, pagination?: object, offsetMinutes?: number, extraEntries?: Array<object>}} [options]
 * @returns {string} the block, without a trailing newline
 */
export function renderValidationBlock(result, options = {}) {
  if (!result || !Array.isArray(result.entries)) {
    throw new CoreHardError('renderValidationBlock needs the result of validate()');
  }

  const entries = [...result.entries, ...(options.extraEntries ?? [])];
  const counts = result.counts ?? {};
  const lines = ['저장 전 검증', ''];

  if (typeof options.course === 'string' && options.course.length > 0) {
    lines.push(`과목: ${options.course}`);
  }
  if (Number.isInteger(options.lecture)) {
    lines.push(`강의: ${options.lecture}강`);
  }
  if (typeof options.filePath === 'string' && options.filePath.length > 0) {
    lines.push(`파일: ${options.filePath}`);
  }
  if (options.pagination) {
    lines.push(formatPaginationLine(options.pagination));
  }

  lines.push(`질문: ${counts.questions ?? 0}`);
  lines.push(`답변: ${counts.answers ?? 0}`);
  lines.push(`빈 답변: ${counts.emptyAnswers ?? 0}`);
  lines.push(`감지된 페이지: ${counts.pages ?? 0}개`);
  lines.push(`미분류 질문: ${counts.unclassified ?? 0}개`);

  const { errors, warnings, infos } = partitionEntries(entries);

  // Errors first. Spec section 10: the block is what the user reads before
  // deciding, so a blocking entry must not sit below a page of warnings.
  if (errors.length > 0) {
    lines.push('');
    for (const entry of errors) {
      lines.push(`${MARKER[GRADE_ERROR]} 오류 — ${entry.message}`);
      lines.push(...renderEntryBody(entry, options));
    }
  }

  if (warnings.length > 0) {
    lines.push('');
    for (const entry of warnings) {
      lines.push(renderEntryHeader(entry));
      lines.push(...renderEntryBody(entry, options));
    }
  }

  if (infos.length > 0) {
    lines.push('');
    for (const entry of infos) {
      lines.push(renderEntryHeader(entry));
      lines.push(...renderEntryBody(entry, options));
    }
  }

  lines.push('');
  lines.push(renderSaveDecision(errors.length, warnings.length, infos.length));

  return lines.join('\n');
}

/**
 * The last line of the block: whether the save proceeds and why.
 *
 * Contract 3.3: only grade `error` blocks. Everything else is reported and the
 * save continues.
 */
function renderSaveDecision(errorCount, warningCount, infoCount) {
  const tally = `error ${errorCount}건, warning ${warningCount}건, info ${infoCount}건`;
  if (errorCount > 0) {
    return `저장: 차단 — ${tally}. error가 있어서 파일을 쓰지 않습니다`;
  }
  return `저장: 진행 — ${tally}. error만 저장을 막습니다`;
}

/**
 * Split entries by grade, preserving order inside each grade.
 *
 * An entry whose grade is not one of the three is treated as `error`. A grade
 * that is not recognised must not become a warning by accident: an unknown grade
 * would otherwise let a blocking condition pass.
 */
function partitionEntries(entries) {
  const errors = [];
  const warnings = [];
  const infos = [];
  for (const entry of entries) {
    if (entry.grade === GRADE_ERROR) errors.push(entry);
    else if (entry.grade === GRADE_WARNING) warnings.push(entry);
    else if (entry.grade === GRADE_INFO) infos.push(entry);
    else errors.push({ ...entry, grade: GRADE_ERROR, message: `알 수 없는 등급: ${entry.grade}` });
  }
  return { errors, warnings, infos };
}

/**
 * Whether a validation result blocks the save.
 *
 * Exposed on its own so the caller can ask the question without rendering
 * anything. This is the single place the rule from contract 3.3 is decided.
 *
 * `extraEntries` are the entries contributed by layers above the core (the
 * delta rules' file conflict, the date idempotency check). They are part of the
 * same save decision, so they are graded here too. A grade error that only
 * arrives from a later layer must block exactly like one from the core;
 * otherwise the block would say `저장: 차단` and the write would happen anyway,
 * which is the "저장 전 검증이 저장 전 확정이 되는" failure contract 3.3 exists
 * to prevent.
 *
 * @param {{errors?: Array<object>, saveBlocked?: boolean}} result
 * @param {Array<object>} [extraEntries]
 * @returns {boolean}
 */
export function isSaveBlocked(result, extraEntries = []) {
  if (!result || typeof result !== 'object') {
    throw new CoreHardError('isSaveBlocked needs a validation result');
  }
  if ((result.errors ?? []).some((entry) => entry.grade === GRADE_ERROR)) {
    return true;
  }
  return partitionEntries(extraEntries).errors.length > 0;
}

// ---------------------------------------------------------------------------
// The pipeline and the save gate
// ---------------------------------------------------------------------------

/**
 * Run the core over a conversation, render the block, and write only when no
 * grade `error` is present.
 *
 * This is the ordering rule of design spec section 10: the validation block
 * reaches the user before a file exists. The block is built first, always; the
 * write function is called only after the check, and only when the check passes.
 * The write is never even attempted on a blocked save, so a blocking condition
 * cannot half-write a file.
 *
 * `write` is injected for the same reason `fetch` is injected in the adapter:
 * the whole save path must be testable on the host with no vault and no network.
 *
 * @param {{turns: Array<object>, write?: ((context: object) => any)|null, beforeWrite?: ((context: object) => boolean|Promise<boolean>), course?: string, lecture?: number, filePath?: string, pagination?: object, exhausted?: boolean|null, limit?: number, selectedLecture?: number|null, offsetMinutes?: number, extraEntries?: Array<object>}} request
 * @returns {Promise<{saveBlocked: boolean, block: string, result: object, writeAttempted: boolean, writeResult: any, reason: string|null}>}
 */
export async function runValidationPipeline(request) {
  if (!request || typeof request !== 'object') {
    throw new CoreHardError('runValidationPipeline needs a request object');
  }
  const { turns, write = null } = request;

  const result = validate(turns, {
    selectedLecture: request.selectedLecture,
    exhausted: request.exhausted,
    limit: request.limit,
  });

  const block = renderValidationBlock(result, {
    course: request.course,
    lecture: request.lecture,
    filePath: request.filePath,
    pagination: request.pagination,
    offsetMinutes: request.offsetMinutes,
    extraEntries: request.extraEntries,
  });

  if (isSaveBlocked(result, request.extraEntries)) {
    return {
      saveBlocked: true,
      block,
      result,
      writeAttempted: false,
      writeResult: null,
      reason: 'grade error가 있어 저장을 시도하지 않았습니다',
    };
  }

  if (typeof write !== 'function') {
    throw new CoreHardError(
      'runValidationPipeline needs a write function when the validation passes'
    );
  }

  const context = { result, block, turns, request };
  // The browser must show the block and obtain approval before the write.
  if (request.beforeWrite && !(await request.beforeWrite(context))) {
    return {
      saveBlocked: false,
      block,
      result,
      writeAttempted: false,
      writeResult: null,
      reason: '사용자가 저장을 취소했습니다',
    };
  }

  const writeResult = await write(context);
  return {
    saveBlocked: false,
    block,
    result,
    writeAttempted: true,
    writeResult,
    reason: null,
  };
}
