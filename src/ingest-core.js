// Ingest core — the pure layer of the archive tool.
//
// Contract reference: implementation-contract.md sections 1.5 (body extractor),
// 2.2 (page state machine), 2.3 (page number extraction), 2.4 (multi-page
// reference), 2.5 (other-lecture detection), 2.6 (unclassified), 3.1 (empty
// answer and duplicate preservation), 3.3 (three validation grades).
//
// The core is a set of pure functions. It performs no network access and no
// filesystem access, it holds no module-level mutable state, and it never
// mutates its arguments. That is what lets the same code serve the userscript
// adapter and the Python CLI fallback later (contract 1.1, 6.5).
//
// The trust boundary (contract 1.1) sits above this file. The adapter hands
// over an array of normalized turns in OLDEST-FIRST order; the core trusts that
// order and does not reorder anything (contract 1.3, test case T-ORD-2).

/**
 * Hard error raised when a structure is broken in a way that cannot be turned
 * into a validation entry at all, because there is nothing left to describe.
 *
 * Contract 1.4: "경로가 깨면 조용히 null을 돌려주지 말고 하드 에러를 낸다."
 * A silent failure removes the check from an archive that may live for years,
 * so every broken path raises instead of returning null or a default.
 */
export class CoreHardError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CoreHardError';
  }
}

// ---------------------------------------------------------------------------
// 1.5 Body extractor
// ---------------------------------------------------------------------------

/**
 * Extract the assemblable Markdown body from an answer turn's wire part.
 *
 * Contract 1.5 measured all 87 answers of the 2026-10-05 run: `turn[4][0]` has
 * length 4 and is not a structure array. `turn[4][0][0]` is a string that
 * already contains Markdown. So the interior of this function is one line; the
 * boundary is kept so that a future wire shape change is absorbed here alone.
 *
 * An empty string is a normal wire state, not a hard error (contract 1.4).
 *
 * @param {unknown} wireAnswerPart the raw `turn[4][0]` value of an answer turn
 * @returns {string} the answer body, verbatim
 */
export function extractAnswerBody(wireAnswerPart) {
  if (!Array.isArray(wireAnswerPart)) {
    throw new CoreHardError(
      'answer turn[4][0] is not an array; the wire path is broken (§1.4)'
    );
  }
  const body = wireAnswerPart[0];
  if (typeof body !== 'string') {
    throw new CoreHardError(
      'answer turn[4][0][0] is not a string; the wire path is broken (§1.4)'
    );
  }
  return body;
}

// ---------------------------------------------------------------------------
// 2.3 / 2.4 Page number extraction
// ---------------------------------------------------------------------------

// Only digits directly attached to the page token count, with whitespace
// allowed between them (contract 2.3: `23 페이지` is 23). An optional comma
// separated list is captured so that `1, 2, 3, 5, 8페이지` counts as a
// multi-page reference instead of silently reading as a single page 8.
//
// The lecture marker is deliberately NOT part of this pattern: `2강 9페이지`
// matches the 9 only, because `2강` is not followed by the page token. That is
// what makes a lecture number becoming the current page structurally impossible.
const PAGE_TOKEN = '페이지';
const PAGE_REFERENCE = /(\d+(?:\s*,\s*\d+)*)\s*페이지/g;

// A lecture marker is only honoured as a prefix of the question (contract 2.5).
const LECTURE_PREFIX = /^[\s]*(\d+)\s*강/;

/**
 * Split the matched digit run into numbers, so a comma list becomes several
 * references instead of one number containing commas.
 *
 * @param {string} digits
 * @returns {number[]}
 */
function toNumbers(digits) {
  return digits
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => Number.parseInt(part, 10));
}

/**
 * Extract the page reference from a question turn's text.
 *
 * Contract 2.3 and 2.4. Rules, in one place:
 *   - `23페이지 설명해줘`      -> page 23
 *   - `23 페이지`             -> page 23 (whitespace is allowed)
 *   - `1강 10페이지 설명해줘` -> page 10, never the lecture number 1
 *   - `다음 페이지 설명해줘.`  -> no match, so the current page is inherited
 *   - `2개 설명해줘`           -> no match, the digits are not on the page token
 *   - `p.9`, `5 page`         -> no match, unsupported forms
 *   - several matches         -> the LAST one is used (contract 2.4)
 *
 * The question text is never interpreted. Nothing here reads meaning, guesses
 * intent, or derives a page from an answer or a citation.
 *
 * @param {string} questionText
 * @returns {{page: number|null, pages: number[], matchCount: number, lecture: number|null, multiPage: boolean}}
 */
export function extractPageReference(questionText) {
  if (typeof questionText !== 'string') {
    throw new CoreHardError('question text is not a string (§1.4)');
  }

  const pages = [];
  PAGE_REFERENCE.lastIndex = 0;
  let match;
  while ((match = PAGE_REFERENCE.exec(questionText)) !== null) {
    pages.push(...toNumbers(match[1]));
    if (match.index === PAGE_REFERENCE.lastIndex) {
      PAGE_REFERENCE.lastIndex += 1;
    }
  }

  const lectureMatch = LECTURE_PREFIX.exec(questionText);

  return {
    // The last match wins (contract 2.4): `1, 2, 3, 5, 8페이지` is 8.
    page: pages.length > 0 ? pages[pages.length - 1] : null,
    pages,
    matchCount: pages.length,
    lecture: lectureMatch ? Number.parseInt(lectureMatch[1], 10) : null,
    multiPage: pages.length > 1,
  };
}

/**
 * Detect a question that names a lecture other than the selected one.
 *
 * Contract 2.5: the marker is used for the warning only. It never splits the
 * file and never becomes the current page. The lecture number is never
 * inferred; the caller passes the lecture the user actually selected (contract
 * section 9).
 *
 * @param {string} questionText
 * @param {number|null|undefined} selectedLecture lecture the user selected
 * @returns {number|null} the other lecture number, or null
 */
export function detectOtherLecture(questionText, selectedLecture) {
  const { lecture } = extractPageReference(questionText);
  if (lecture === null) return null;
  if (selectedLecture === null || selectedLecture === undefined) return null;
  return lecture === selectedLecture ? null : lecture;
}

// ---------------------------------------------------------------------------
// 2.2 / 2.6 Page state machine and grouping
// ---------------------------------------------------------------------------

/**
 * Walk the turns in oldest-first order and open a new page group every time a
 * question names a page (contract 2.2).
 *
 * Only a question turn changes the state. An answer turn never does. A question
 * with no extracted page inherits the current page; when no page has been seen
 * yet the question stays unclassified and no page number is invented
 * (contract 2.6).
 *
 * A question carrying an explicit page ALWAYS opens a new group, including when
 * the number equals the page currently open. So `23페이지` asked twice in a row
 * produces two groups and two `## 23페이지` headings, and the sequence
 * 23 -> 24 -> 23 produces three. Contract 2.2 states this as an unconditional
 * transition and section 5 restates it for the review path ("같은 세션에서 같은
 * 페이지를 두 번 다뤄도 heading이 두 번 열린다 [§13.1] — §2.2와 같은 규칙"),
 * which is also design spec 13.1. The weaker reading, "a new heading only when
 * the page changes", is what the ambiguous wording of design spec section 6
 * would have produced; contract 2.2 resolves it to always reopen.
 *
 * The two readings differ only in group COUNT; the number of DISTINCT pages is
 * the same either way (50 page numbers, 4 to 56, in the 2026-10-05 run). The
 * measurement in contract section 2.7 DOES discriminate between them, because
 * that data re-asks an already-seen page 4 times: page 9 at question indices 5
 * and 6, page 19 at indices 23, 24 and 25, page 27 at indices 39 and 40. The
 * always-reopen rule therefore opens 54 page groups where the only-on-change
 * rule opens 50, a difference of 4 groups. All four repeats are adjacent (no
 * intervening page), so the narrower clause "no page revisited after an
 * intervening page" happens to hold, but that does not make the two group
 * counts equal.
 *
 * @param {Array<{id: string, ts: number, kind: string, text: string}>} turns oldest-first
 * @returns {{groups: Array<object>, questions: Array<object>, byTurnId: Map<string, object>}}
 */
export function runPageStateMachine(turns, { initialPage = null, pageChoices = {} } = {}) {
  assertTurnArray(turns);

  const groups = [];
  const questions = [];
  const byTurnId = new Map();

  if (initialPage !== null && (!Number.isInteger(initialPage) || initialPage < 1)) {
    throw new CoreHardError('initial page must be a positive integer');
  }
  let currentPage = initialPage;
  let currentGroup = null;
  let pending = null;

  const openGroup = (page) => {
    const group = {
      page,
      unclassified: page === null,
      items: [],
    };
    groups.push(group);
    currentGroup = group;
    return group;
  };

  for (const turn of turns) {
    if (turn.kind === 'question') {
      const reference = extractPageReference(turn.text);

      let page = reference.page;
      if (Object.hasOwn(pageChoices, turn.id)) {
        const distinct = [...new Set(reference.pages)];
        if (distinct.length < 2 || !distinct.includes(pageChoices[turn.id])) {
          throw new CoreHardError('page choice must be one of the distinct referenced pages');
        }
        page = pageChoices[turn.id];
      }
      if (page !== null) {
        // Contract 2.2, row "n | 있음 (m) | 새 그룹 시작": the transition opens
        // a new group UNCONDITIONALLY, so `23페이지` asked twice in a row
        // yields two groups and two `## 23페이지` headings. The weaker "only
        // when the page changes" reading is what the ambiguous design spec
        // section 6 wording would have produced, and it is the one the code
        // used to implement even though the comment beside it said otherwise.
        openGroup(page);
        currentPage = page;
      } else if (currentGroup === null || currentPage === null) {
        // No page has been established yet: the question is unclassified and
        // no number is assigned (contract 2.6).
        if (currentGroup === null) openGroup(currentPage);
      }
      // Otherwise the current page is inherited and the group does not change.

      pending = {
        question: turn,
        page: currentPage,
        inherited: reference.page === null,
        reference,
        answer: null,
      };
      questions.push(pending);
      byTurnId.set(turn.id, pending);
      currentGroup.items.push(pending);
    } else {
      // An answer turn does not change the state (contract 2.2). It binds to
      // the question in front of it; if none is open, the alternation
      // validation reports it as a hard error and the answer is left unbound.
      if (pending) {
        pending.answer = turn;
        byTurnId.set(turn.id, pending);
      }
    }
  }

  return { groups, questions, byTurnId };
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/**
 * Group a turn array into question/answer pairs, preserving conversation order.
 *
 * Nothing is reordered and nothing is merged (contract 6.4, T-ORD-2). Two
 * questions with the same text but different turn IDs stay two items
 * (contract 3.1), because the turn ID is the identity.
 *
 * @param {Array<object>} turns oldest-first
 * @returns {Array<object>} the pairs, in conversation order
 */
export function groupConversation(turns) {
  return runPageStateMachine(turns).questions;
}

// ---------------------------------------------------------------------------
// 3.3 Three-tier validation result assembly
// ---------------------------------------------------------------------------

export const GRADE_ERROR = 'error';
export const GRADE_WARNING = 'warning';
export const GRADE_INFO = 'info';

function entry(grade, category, message, details = {}) {
  return { grade, category, message, ...details };
}

/**
 * Structural checks over a turn array: duplicate turn ID (contract 1.2, 3.1),
 * question/answer alternation, and an unpaired question (contract 1.4, design
 * spec section 15a structural pair count). All three are grade `error`, so a
 * result carrying any of them blocks the save.
 *
 * The structural pair count is kept separate from the answer-body check on
 * purpose. Spec section 15 splits them into (a) and (b) because one count
 * comparison cannot decide safety: 87 pairs can hold 2 empty answer bodies.
 * (a) lives here and blocks; (b) is the empty-answer warning.
 *
 * A repeated question text is NOT an error. It is preserved and reported as
 * grade `info` so the user can see that nothing was merged (contract 3.1).
 *
 * @param {Array<object>} turns
 * @returns {Array<object>} validation entries
 */
export function validateStructure(turns) {
  assertTurnArray(turns);
  const entries = [];

  const ids = new Map();
  for (const turn of turns) {
    if (ids.has(turn.id)) {
      entries.push(
        entry(
          GRADE_ERROR,
          'duplicate turn id',
          `turn ID appears more than once in the list: ${turn.id}`,
          { turnId: turn.id }
        )
      );
    } else {
      ids.set(turn.id, turn);
    }
  }

  let expected = 'question';
  for (let i = 0; i < turns.length; i += 1) {
    if (turns[i].kind !== expected) {
      entries.push(
        entry(
          GRADE_ERROR,
          'alternation',
          `turn ${i} has kind ${turns[i].kind} where ${expected} was required; ` +
            'question and answer turns must alternate',
          { index: i, turnId: turns[i].id }
        )
      );
    }
    expected = turns[i].kind === 'question' ? 'answer' : 'question';
  }

  // Spec section 15a checks the structural pair count, not only the order. An
  // odd-length array leaves a trailing question with no answer, which the
  // order check alone cannot see. It blocks, because the pairing is broken.
  for (let i = 0; i < turns.length; i += 1) {
    if (turns[i].kind === 'question' && turns[i + 1]?.kind !== 'answer') {
      entries.push(
        entry(
          GRADE_ERROR,
          'unpaired question',
          `question at turn ${i} is not followed by an answer; the pair count is broken`,
          { index: i, turnId: turns[i].id }
        )
      );
    }
  }

  const textCounts = new Map();
  for (const turn of turns) {
    if (turn.kind !== 'question') continue;
    textCounts.set(turn.text, (textCounts.get(turn.text) ?? 0) + 1);
  }
  const repeated = [...textCounts.entries()].filter(([, n]) => n > 1);
  if (repeated.length > 0) {
    entries.push(
      entry(
        GRADE_INFO,
        'duplicate preserved',
        `repeated question text kept as separate turns: ${repeated.length}`,
        { questions: repeated.map(([text, count]) => ({ text, count })) }
      )
    );
  }

  return entries;
}

/**
 * Validate the page assignment of a whole conversation.
 *
 * Every check here is grade `warning`; none of them blocks the save. Only grade
 * `error` blocks (contract 3.3).
 *
 * @param {Array<object>} turns oldest-first
 * @param {{selectedLecture?: number|null, exhausted?: boolean|null, limit?: number}} [options]
 * @returns {{entries: Array<object>, counts: object}} validation entries plus aggregate counts
 */
export function validatePages(turns, options = {}) {
  assertTurnArray(turns);
  const { selectedLecture = null, exhausted = null, limit = null } = options;
  const entries = [];

  const emptyAnswers = [];
  const multiPage = [];
  const otherLecture = [];
  const unclassified = [];
  const pageSet = new Set();

  for (let i = 0; i < turns.length; i += 1) {
    const turn = turns[i];

    if (turn.kind === 'question') {
      const reference = extractPageReference(turn.text);

      if (reference.multiPage) {
        multiPage.push({ text: turn.text, ts: turn.ts, pages: reference.pages });
      }

      const other = detectOtherLecture(turn.text, selectedLecture);
      if (other !== null) {
        otherLecture.push({ text: turn.text, ts: turn.ts, lecture: other });
      }
    } else if (turn.text === '') {
      const question = findPrecedingQuestion(turns, i);
      emptyAnswers.push({
        questionText: question ? question.text : null,
        answerTs: turn.ts,
        answerTurnId: turn.id,
      });
    }
  }

  const state = runPageStateMachine(turns, { pageChoices: options.pageChoices });
  for (const question of state.questions) {
    if (question.page === null) {
      unclassified.push({ text: question.question.text, ts: question.question.ts });
    } else {
      pageSet.add(question.page);
    }
  }

  if (multiPage.length > 0) {
    entries.push(
      entry(
        GRADE_WARNING,
        'multi-page reference',
        `multiple page references in one question: ${multiPage.length}`,
        { questions: multiPage.map((q) => ({ text: q.text, pages: q.pages })) }
      )
    );
  }

  if (otherLecture.length > 0) {
    entries.push(
      entry(
        GRADE_WARNING,
        'other-lecture',
        `questions naming another lecture: ${otherLecture.length}`,
        {
          lecture: otherLecture[0].lecture,
          // `lecture` is carried per question so the rendered notice can name
          // the lecture each question asked about (contract 2.5), not just the
          // first one seen.
          questions: otherLecture.map((q) => ({ text: q.text, ts: q.ts, lecture: q.lecture })),
        }
      )
    );
  }

  if (unclassified.length > 0) {
    entries.push(
      entry(
        GRADE_WARNING,
        'unclassified',
        `unclassified questions: ${unclassified.length}`,
        { questions: unclassified }
      )
    );
  }

  if (emptyAnswers.length > 0) {
    entries.push(
      entry(
        GRADE_WARNING,
        'empty answer',
        `empty answers: ${emptyAnswers.length}; the answer heading is kept`,
        { answers: emptyAnswers }
      )
    );
  }

  if (exhausted === false) {
    entries.push(
      entry(
        GRADE_WARNING,
        'pagination',
        'not the whole conversation: a pagination token is still present',
        { limit }
      )
    );
  } else if (exhausted === true) {
    entries.push(
      entry(GRADE_INFO, 'pagination', 'whole conversation confirmed', {
        turnCount: turns.length,
        limit,
      })
    );
  }

  return {
    entries,
    counts: {
      turns: turns.length,
      questions: turns.filter((t) => t.kind === 'question').length,
      answers: turns.filter((t) => t.kind === 'answer').length,
      emptyAnswers: emptyAnswers.length,
      pages: pageSet.size,
      unclassified: unclassified.length,
      multiPage: multiPage.length,
      otherLecture: otherLecture.length,
    },
  };
}

/**
 * Assemble the full validation result for a conversation.
 *
 * The result is the structured half of what contract 6.3 requires. Rendering it
 * into the human-readable block is a separate concern.
 *
 * `saveBlocked` is true when, and only when, at least one entry has grade
 * `error`. Warnings and info entries are reported and the save proceeds
 * (contract 3.3: "error만 저장을 막는다").
 *
 * @param {Array<object>} turns oldest-first normalized turns
 * @param {{selectedLecture?: number|null, exhausted?: boolean|null, limit?: number}} [options]
 * @returns {{saveBlocked: boolean, errors: Array<object>, warnings: Array<object>, infos: Array<object>, entries: Array<object>, groups: Array<object>, pairs: Array<object>, counts: object}}
 */
export function validate(turns, options = {}) {
  assertTurnArray(turns);

  const structural = validateStructure(turns);
  const { entries: pageEntries, counts } = validatePages(turns, options);
  const entries = [...structural, ...pageEntries];

  const errors = entries.filter((e) => e.grade === GRADE_ERROR);
  const warnings = entries.filter((e) => e.grade === GRADE_WARNING);
  const infos = entries.filter((e) => e.grade === GRADE_INFO);

  return {
    saveBlocked: errors.length > 0,
    errors,
    warnings,
    infos,
    entries,
    counts,
    groups: runPageStateMachine(turns, { pageChoices: options.pageChoices }).groups,
    pairs: runPageStateMachine(turns, { pageChoices: options.pageChoices }).questions,
  };
}

/**
 * Run the whole core over a conversation: page assignment, grouping and the
 * three-tier validation result.
 *
 * @param {Array<object>} turns oldest-first normalized turns
 * @param {object} [options]
 * @returns {object} the same shape as `validate`
 */
export function ingest(turns, options = {}) {
  return validate(turns, options);
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function assertTurnArray(turns) {
  if (!Array.isArray(turns)) {
    throw new CoreHardError('turns is not an array (§1.2)');
  }
  for (const turn of turns) {
    if (turn === null || typeof turn !== 'object') {
      throw new CoreHardError('a turn is not an object (§1.2)');
    }
    if (typeof turn.id !== 'string' || turn.id.length === 0) {
      throw new CoreHardError('a turn has no string id (§1.2)');
    }
    if (!Number.isInteger(turn.ts)) {
      throw new CoreHardError(`turn ${turn.id} has no integer ts (§1.2)`);
    }
    if (turn.kind !== 'question' && turn.kind !== 'answer') {
      throw new CoreHardError(`turn ${turn.id} has kind ${turn.kind} (§1.2)`);
    }
    if (typeof turn.text !== 'string') {
      throw new CoreHardError(`turn ${turn.id} has non-string text (§1.2)`);
    }
  }
}

function findPrecedingQuestion(turns, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (turns[i].kind === 'question') return turns[i];
  }
  return null;
}
