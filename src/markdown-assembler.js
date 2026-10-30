// Markdown assembler — the output half of the archive tool.
//
// Contract reference: implementation-contract.md section 6.4 (frontmatter and
// body assembly), section 3.2 (empty-answer placeholder), section 5 (review
// session assembly), section 1.5 (the body arrives as Markdown already).
//
// Like the ingest core this module is pure: no network, no filesystem, no
// module-level mutable state, no argument mutation. The turn array it receives
// is the OLDEST-FIRST array the adapter hands over (contract 1.3).
//
// Two shapes are produced and they are deliberately different documents:
//   - assembleFirstArchive  — the whole file, frontmatter included
//   - assembleReviewSession — the `## 추가 질문` fragment appended to a file
// The delta rules D1..D6 that decide *whether* to append live in T4; this
// module only renders, so the renderer cannot quietly invent an append.

import { CoreHardError, runPageStateMachine } from './ingest-core.js';
import { stripSourceMarkers } from './citation-cleanup.js';

/**
 * Fixed offset for rendering turn timestamps.
 *
 * Contract 3.2's example literal is `2026-09-28 17:14:57`, which is the fixture
 * 3 answer turn `1790583297` read at UTC+09:00. The archive must reproduce that
 * literal byte for byte regardless of where the userscript or the CLI runs, so
 * the wall clock is derived from a fixed offset rather than from the host time
 * zone. A host-local `toLocaleString` would print a different string on a
 * different machine and the placeholder would stop matching the original chat.
 */
export const DEFAULT_UT_OFFSET_MINUTES = 9 * 60;

/**
 * Render a unix second as `YYYY-MM-DD HH:mm:ss` at a fixed UTC offset.
 *
 * `new Date(ms).toISOString()` is UTC by definition, so shifting the epoch by
 * the offset and then reading the UTC fields yields the intended wall clock
 * without ever consulting the host zone.
 *
 * @param {number} ts unix seconds (contract 1.2)
 * @param {{offsetMinutes?: number}} [options]
 * @returns {string}
 */
export function formatTimestamp(ts, options = {}) {
  if (!Number.isInteger(ts)) {
    throw new CoreHardError(`ts is not an integer unix second: ${ts} (§1.2)`);
  }
  const offsetMinutes = options.offsetMinutes ?? DEFAULT_UT_OFFSET_MINUTES;
  if (!Number.isInteger(offsetMinutes)) {
    throw new CoreHardError(`offsetMinutes is not an integer: ${offsetMinutes}`);
  }
  const shifted = new Date((ts + offsetMinutes * 60) * 1000);
  return shifted.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Render a unix second as `YYYY-MM-DD` at a fixed UTC offset.
 *
 * Used for the `archived` frontmatter field (contract 6.4) and for the review
 * session's `### YYYY-MM-DD` heading (spec section 13.1).
 *
 * @param {number} ts unix seconds
 * @param {{offsetMinutes?: number}} [options]
 * @returns {string}
 */
export function formatDate(ts, options = {}) {
  return formatTimestamp(ts, options).slice(0, 10);
}

// ---------------------------------------------------------------------------
// LaTeX delimiters
// ---------------------------------------------------------------------------

// Contract 6.4: `\(...\)` becomes `$...$` and `\[...\]` becomes `$$...$$`.
// Obsidian renders dollar-delimited math, so the NotebookLM escaping is undone
// here rather than by the extractor (contract 1.5 returns the body verbatim).
//
// Inline code and fenced code are NOT touched. Fixture 6 carries a Python fence
// whose source legitimately contains backslashes; rewriting delimiters inside
// it would corrupt code that the user came here to read. The display form is
// converted before the inline form because `\[` and `\(` are distinct, but the
// order is fixed anyway so a future edit cannot introduce an overlap.
const FENCE = /^([ \t]*)(`{3,}|~{3,})([^\n]*)$/;
// Recorded bodies use both single and doubled delimiter backslashes. Consume
// the whole delimiter and require equal widths at each end; otherwise a
// leftover backslash escapes the resulting dollar sign in Markdown. TeX inside
// the delimiters (including \\\\ line breaks) remains byte-identical.
const DISPLAY_MATH = /(?<!\\)(\\{1,2})\[([\s\S]*?)(?<!\\)\1\]/g;
const INLINE_MATH = /(?<!\\)(\\{1,2})\(([\s\S]*?)(?<!\\)\1\)/g;
const INLINE_CODE = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g;

/**
 * Convert LaTeX delimiters outside code fences.
 *
 * The text is cut into fenced and unfenced segments and only the unfenced ones
 * are rewritten. A fenced segment is the opening line, everything up to the
 * matching closing line, and the closing line, emitted byte for byte. The cut is
 * made on lines, so a `\[` opened before a fence can never pair with a `\]` after
 * it; an unterminated fence swallows the rest of the body, which is the
 * conservative direction because an unterminated fence is already broken
 * Markdown.
 *
 * @param {string} text
 * @returns {string} the same text with `\(...\)` and `\[...\]` re-delimited
 */
export function convertLatexDelimiters(text) {
  if (typeof text !== 'string') {
    throw new CoreHardError('text is not a string (§1.2)');
  }
  const lines = text.split('\n');
  const segments = [];
  let buffer = [];
  let fenced = false;
  let fenceChar = null;

  const flush = () => {
    if (buffer.length > 0) {
      segments.push({ fenced, text: buffer.join('\n') });
      buffer = [];
    }
  };

  for (const line of lines) {
    const match = FENCE.exec(line);
    if (!fenced && match) {
      flush();
      fenced = true;
      fenceChar = match[2][0];
      buffer.push(line);
      continue;
    }
    if (fenced) {
      buffer.push(line);
      // A closing fence repeats the fence character at least three times and
      // carries no info string.
      if (match && match[2].length >= 3 && match[2][0] === fenceChar && match[3].trim() === '') {
        flush();
        fenced = false;
        fenceChar = null;
      }
      continue;
    }
    buffer.push(line);
  }
  flush();

  return segments.map((s) => (s.fenced ? s.text : convertSegment(s.text))).join('\n');
}

/**
 * Convert the delimiters inside one segment that is known not to be in a fence.
 *
 * The replacement is a function, not a string, so a `$` inside the math body is
 * never read as a `$`-substitution pattern. Display math is converted first, and
 * both forms run over the whole segment, so a `\[` on one line and its `\]` on
 * another still pair up.
 *
 * @param {string} segment
 * @returns {string}
 */
function convertSegment(segment) {
  let converted = '';
  let cursor = 0;
  for (const match of segment.matchAll(INLINE_CODE)) {
    converted += convertMath(segment.slice(cursor, match.index)) + match[0];
    cursor = match.index + match[0].length;
  }
  return converted + convertMath(segment.slice(cursor));
}

function convertMath(text) {
  return text
    .replace(DISPLAY_MATH, (_, _slashes, body) => `$$${body}$$`)
    .replace(INLINE_MATH, (_, _slashes, body) => `$${body}$`);
}

// ---------------------------------------------------------------------------
// YAML frontmatter
// ---------------------------------------------------------------------------

// Quote a scalar only when a plain one would change meaning: an empty value, a
// leading YAML indicator character, a `: ` or ` #` sequence inside, edge
// whitespace, an embedded quote character, a control character (a newline in
// the middle of a course name would break the block into two lines and make the
// file unreadable by this tool's own parseFrontmatter), or a bare type keyword
// that would parse as a boolean or null.
const CONTROL_CHAR = /[\u0000-\u001F\u007F]/;
const PLAIN_UNSAFE =
  /^[-?:,[\]{}#&*!|>'"%@`]|^$|^\s|\s$|:\s|\s#|["']|^(true|false|yes|no|on|off|null|~)$/i;
const NUMERIC_LIKE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

/**
 * Render one YAML scalar for the frontmatter block.
 *
 * @param {string|number|boolean} value
 * @returns {string}
 */
export function yamlScalar(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new CoreHardError(`frontmatter value is not a finite number: ${value}`);
    }
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value !== 'string') {
    throw new CoreHardError(`frontmatter value is not a scalar: ${value}`);
  }
  if (PLAIN_UNSAFE.test(value) || NUMERIC_LIKE.test(value) || CONTROL_CHAR.test(value)) {
    return quoteYamlString(value);
  }
  return value;
}

/**
 * Quote a string unconditionally, escaping every character that would otherwise
 * end the scalar or the physical line.
 *
 * A backslash and a double quote are escaped as themselves. A control character
 * is escaped with its YAML two-character form so the scalar stays on ONE
 * physical line: `course` is user-supplied and user-confirmed (contract 9), and
 * a pasted course name carrying a newline would otherwise be written raw and
 * make the block unreadable to this tool's own parseFrontmatter, which keys
 * D1..D6 on those fields. Escaping keeps the value lossless — `parseYamlScalar`
 * in the delta rules decodes these same two-character forms.
 *
 * Turn IDs and the conversation ID go through here rather than through
 * `yamlScalar`: they are opaque wire values that may begin with a digit or a
 * hyphen, and the contract's own frontmatter example quotes all three.
 *
 * @param {string} value
 * @returns {string}
 */
function quoteYamlString(value) {
  const escaped = value.replace(/[\\"\u0000-\u001F\u007F]/g, (character) => {
    switch (character) {
      case '\\':
        return '\\\\';
      case '"':
        return '\\"';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\t':
        return '\\t';
      case '\b':
        return '\\b';
      case '\f':
        return '\\f';
      case '\0':
        return '\\0';
      default:
        return `\\x${character.charCodeAt(0).toString(16).padStart(2, '0')}`;
    }
  });
  return `"${escaped}"`;
}

/**
 * Build the frontmatter block for a first archive (contract 6.4).
 *
 * The eight fields are fixed and no Dataview query is emitted: the document has
 * to behave normally in Obsidian with no plugin installed (spec section 8).
 *
 * `archive_turns` is the TURN count, not the pair count — the recorded value
 * for the measured run is 174 = 87 questions + 87 answers, and the delta rules
 * key on turn IDs rather than counts anyway (contract 5).
 *
 * @param {{course: string, lecture: number, conversationId: string, archivedDate: string, turns: Array<object>}} meta
 * @returns {string} the `---` delimited YAML block, without a trailing newline
 */
export function renderFrontmatter(meta) {
  const { course, lecture, conversationId, archivedDate, turns } = meta;
  if (typeof course !== 'string' || course.length === 0) {
    throw new CoreHardError('frontmatter course is missing (contract 6.4, §9)');
  }
  if (!Number.isInteger(lecture)) {
    throw new CoreHardError('frontmatter lecture must be the number the user confirmed (contract 6.4, §9)');
  }
  if (typeof conversationId !== 'string' || conversationId.length === 0) {
    throw new CoreHardError('frontmatter conversation id is missing (contract 6.1)');
  }
  if (typeof archivedDate !== 'string' || archivedDate.length === 0) {
    throw new CoreHardError('frontmatter archive date is missing (contract 6.4)');
  }
  if (!Array.isArray(turns) || turns.length === 0) {
    throw new CoreHardError('a first archive has no turns (contract 6.4)');
  }

  // Turn IDs are always quoted: they are opaque strings that may begin with a
  // digit or a hyphen, and the contract's own example quotes them.
  const firstTurn = turns[0];
  const lastTurn = turns[turns.length - 1];
  if (typeof firstTurn?.id !== 'string' || typeof lastTurn?.id !== 'string') {
    throw new CoreHardError('a turn has no string id (contract 1.2)');
  }

  const lines = [
    'type: notebooklm-study',
    `course: ${yamlScalar(course)}`,
    `lecture: ${yamlScalar(lecture)}`,
    `archived: ${yamlScalar(archivedDate)}`,
    `archive_turns: ${yamlScalar(turns.length)}`,
    `archive_first_turn: ${quoteYamlString(firstTurn.id)}`,
    `archive_last_turn: ${quoteYamlString(lastTurn.id)}`,
    `archive_conversation: ${quoteYamlString(conversationId)}`,
  ];
  return ['---', ...lines, '---'].join('\n');
}

// ---------------------------------------------------------------------------
// Body blocks
// ---------------------------------------------------------------------------

/**
 * The empty-answer placeholder (contract 3.2, spec section 6).
 *
 * The line is byte-identical to the contract's example:
 * `> (이 답변 기록이 비어 있습니다 — 2026-09-28 17:14:57)`.
 *
 * The timestamp is the ANSWER turn's `ts`, never the question's (contract 3.1),
 * so a later comparison against the original chat lands on the right turn.
 *
 * @param {number} answerTs
 * @param {{offsetMinutes?: number}} [options]
 * @returns {string}
 */
export function renderEmptyAnswerPlaceholder(answerTs, options = {}) {
  return `> (이 답변 기록이 비어 있습니다 — ${formatTimestamp(answerTs, options)})`;
}

/**
 * Render one question/answer pair under the given heading depth.
 *
 * Contract 3.1 and 3.2: the answer heading is NEVER omitted. An empty answer
 * body fills the body slot with the placeholder line; dropping the heading
 * instead would leave a hole in the Obsidian outline that page-level navigation
 * depends on (spec section 6, section 18).
 *
 * A question with no answer turn at all renders no answer heading. That is not
 * the empty-answer case: the answer turn exists and its body is empty. A
 * missing answer means the alternation structure is broken, which the core
 * already reports as grade `error` and blocks on save (contract 1.4, 3.3).
 *
 * @param {{question: object, answer: object|null}} pair
 * @param {{questionHeading: string, answerHeading: string, offsetMinutes?: number}} options
 * @returns {string[]} markdown lines
 */
function renderPair(pair, options) {
  const { questionHeading, answerHeading, offsetMinutes = DEFAULT_UT_OFFSET_MINUTES } = options;

  // One block per pair, so the body sits directly under its heading. That is
  // how the contract's own rendered examples read (sections 3.2 and 6.4):
  // `### Q` then the question text on the next line, no blank line between.
  const lines = [questionHeading, convertLatexDelimiters(pair.question.text)];

  if (pair.answer !== null && pair.answer !== undefined) {
    lines.push('', answerHeading);
    lines.push(
      pair.answer.text === ''
        ? renderEmptyAnswerPlaceholder(pair.answer.ts, { offsetMinutes })
        : stripSourceMarkers(convertLatexDelimiters(pair.answer.text))
    );
  }

  return lines.join('\n');
}

/**
 * Join blocks with one blank line between them, which is what the contract's
 * rendered examples show throughout sections 3.2 and 6.4.
 *
 * @param {string[]} blocks
 * @returns {string}
 */
function joinBlocks(blocks) {
  return blocks.join('\n\n');
}

/**
 * The page-group heading text.
 *
 * First archive uses `## N페이지`; a review session nests one level deeper as
 * `#### N페이지` (contract 6.4, spec section 13.1). A review question with no
 * page gets `#### 페이지 미지정` (spec section 13.2) — a page number is never
 * invented for it (contract 2.6).
 *
 * @param {number|null} page
 * @param {{depth: 'first'|'review'}} placement
 * @returns {string}
 */
export function renderPageHeading(page, placement) {
  const marker = placement === 'review' ? '####' : '##';
  if (page === null || page === undefined) {
    // Contract 2.6: the unclassified group has NO heading in a first archive,
    // and `#### 페이지 미지정` in a review session. The caller handles the
    // first-archive case by passing null and skipping the heading.
    if (placement !== 'review') {
      throw new CoreHardError('a first archive does not render a heading for an unclassified group (contract 2.6)');
    }
    return `${marker} 페이지 미지정`;
  }
  return `${marker} ${page}페이지`;
}

// ---------------------------------------------------------------------------
// First archive
// ---------------------------------------------------------------------------

/**
 * Assemble the complete file for a first archive (contract 6.4, spec section 6).
 *
 * Heading depth:
 *   `# N강`      lecture, from the lecture number the user confirmed (§9)
 *   `## N페이지` page group
 *   `### Q` / `### A`
 *
 * Page groups come straight from the core's state machine, so conversation
 * order is preserved and a revisited page opens its heading again
 * (contract 2.2). Unclassified questions are rendered under the lecture
 * heading with NO page-group heading — contract 2.6 says a first archive
 * creates no heading for them — but they are still rendered, because dropping
 * turns would break the "nothing lost" success criterion (spec section 18).
 *
 * @param {Array<object>} turns oldest-first normalized turns
 * @param {{course: string, lecture: number, conversationId: string, archived?: string, archivedDate?: string, offsetMinutes?: number}} meta
 * @returns {string} the whole file
 */
export function assembleFirstArchive(turns, meta) {
  const offsetMinutes = meta.offsetMinutes ?? DEFAULT_UT_OFFSET_MINUTES;
  const { groups } = runPageStateMachine(turns, { pageChoices: meta.pageChoices });
  const archivedDate = meta.archivedDate ?? meta.archived;

  const blocks = [
    renderFrontmatter({ ...meta, archivedDate, turns }),
    `# ${meta.lecture}강`,
  ];

  for (const group of groups) {
    // Contract 2.6: an unclassified group gets no heading on the first archive.
    if (!(group.page === null && group.unclassified)) {
      blocks.push(renderPageHeading(group.page, 'first'));
    }
    for (const pair of group.items) {
      blocks.push(renderPair(pair, { questionHeading: '### Q', answerHeading: '### A', offsetMinutes }));
    }
  }

  return `${joinBlocks(blocks)}\n`;
}

// ---------------------------------------------------------------------------
// Review session
// ---------------------------------------------------------------------------

/**
 * Assemble the `## 추가 질문` fragment for a review session (spec section 13.1,
 * contract section 5).
 *
 * Heading depth:
 *   `## 추가 질문`  the section, placed at the END of the file
 *   `### YYYY-MM-DD` the session date
 *   `#### N페이지`   page group, nested so an existing `## 23페이지` is untouched
 *   `##### Q` / `##### A`
 *
 * Two rules are load-bearing and are enforced by construction here:
 *   - No reclassification. The fragment never mentions an existing `## N페이지`
 *     heading, so the same page number can legitimately exist twice in the file
 *     (spec 13.1). The decision of whether the file already has a
 *     `## 추가 질문` section belongs to the delta rules (D6) in T4.
 *   - Conversation order is kept. Groups are not sorted by page (spec 13.1).
 *
 * `includeSection` and `includeDate` are additive options used by the delta
 * rules in T4: D6 creates the `## 추가 질문` section only when the file does
 * not already have one, and design spec 13.4 reuses an existing
 * `### YYYY-MM-DD` heading instead of opening a second one. Both default to
 * true, so the standalone fragment is unchanged.
 *
 * @param {Array<object>} turns oldest-first normalized turns, the new turns only
 * @param {{date: string, offsetMinutes?: number, includeSection?: boolean, includeDate?: boolean}} options `date` is `YYYY-MM-DD`
 * @returns {string} the section fragment, ending with a newline
 */
export function assembleReviewSession(turns, options) {
  const offsetMinutes = options.offsetMinutes ?? DEFAULT_UT_OFFSET_MINUTES;
  const includeSection = options.includeSection ?? true;
  const includeDate = options.includeDate ?? true;
  const date = options.date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new CoreHardError(`review session date must be YYYY-MM-DD: ${date} (spec 13.1)`);
  }

  const { groups } = runPageStateMachine(turns, { initialPage: options.initialPage ?? null, pageChoices: options.pageChoices });

  const blocks = [];
  if (includeSection) blocks.push('## 추가 질문');
  if (includeDate) blocks.push(`### ${date}`);

  for (const group of groups) {
    blocks.push(renderPageHeading(group.page, 'review'));
    for (const pair of group.items) {
      blocks.push(renderPair(pair, { questionHeading: '##### Q', answerHeading: '##### A', offsetMinutes }));
    }
  }

  return `${joinBlocks(blocks)}\n`;
}

/**
 * Append a review-session fragment after the existing file content.
 *
 * The existing content is returned with its own bytes intact. Nothing in the
 * existing body is rewritten, moved or reclassified; the only thing added is a
 * horizontal rule from the spec's rendering (spec 13.1) and the fragment
 * itself.
 *
 * Whether to call this at all is the delta decision, and it is not made here
 * (contract 5, T4).
 *
 * @param {string} existingContent the current file text
 * @param {string} fragment the output of `assembleReviewSession`
 * @returns {string} existingContent followed by the fragment
 */
export function appendReviewSession(existingContent, fragment) {
  if (typeof existingContent !== 'string') {
    throw new CoreHardError('existing file content is not a string');
  }
  if (typeof fragment !== 'string') {
    throw new CoreHardError('review session fragment is not a string');
  }
  if (existingContent.length === 0) {
    return fragment;
  }
  const base = existingContent.replace(/\n+$/, '');
  return `${base}\n\n---\n\n${fragment}`;
}
