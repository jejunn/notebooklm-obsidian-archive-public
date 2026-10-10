// Delta rules D1..D6 and the file-conflict halt.
//
// Contract reference: implementation-contract.md section 5 (the delta table and
// the date-idempotency judgment), section 6.4 (`archive_last_turn` in the
// frontmatter) and the "파일 충돌" judgment that reconciles design spec section
// 12 with section 18; design spec section 13.3 (delta rules) and section 13.4
// (date idempotency).
//
// The module is pure, like the core and the assembler: no network, no
// filesystem, no module-level mutable state, no argument mutation. The caller
// reads the vault, hands over the file content as a string, and performs the
// PUT only when the plan says `write` is not null. Nothing here can talk to the
// user, so "묻는다" (D3) and "선택지를 제시한다" (file conflict) are returned as
// data for the caller to present; the default option is written into the data
// so a caller cannot forget it.
//
// The load-bearing decision is D2. The base is the recorded turn ID, never the
// turn count (contract 5): a content fingerprint breaks the moment the user
// edits an answer, and a count cannot tell WHICH turns are new. The anchor's
// position is reported so the user can confirm it, exactly as design spec
// section 13.3's example prints `기준 turn: ... → 174번째에서 일치`.

import { CoreHardError } from './ingest-core.js';
import {
  appendReviewSession,
  assembleFirstArchive,
  assembleReviewSession,
} from './markdown-assembler.js';

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Write the whole file; there is nothing archived there yet (D1). */
export const ACTION_FIRST_ARCHIVE = 'first-archive';
/** Append the turns after the anchor to the review section (D2). */
export const ACTION_APPEND = 'append';
/** The anchor is the last turn; there is nothing to add (D5). */
export const ACTION_NOOP = 'noop';
/** The file belongs to another conversation; stop and ask (D3). */
export const ACTION_ASK = 'ask';
/** The anchor is gone; report a new-file path instead of appending (D4). */
export const ACTION_NEW_FILE = 'new-file';

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

// The `---` fence must be the very first line. Anything before it means the
// document has no frontmatter, which is D1's "archive_conversation 없음", not a
// parse failure.
const FENCE = /^---[ \t]*\r?\n/;

/**
 * Parse the YAML frontmatter block of an existing archive file.
 *
 * Only the eight scalar fields the writer emits are read, and they are read
 * exactly as written: a quoted scalar keeps its value, an unquoted one is
 * trimmed. Nothing is coerced, so `archive_conversation` can be compared to the
 * adapter's ID with `===` and no number ever becomes a string.
 *
 * A frontmatter block that opens and never closes is a hard error rather than an
 * empty object: an empty object would read as "no archive_conversation", send
 * the save down the first-archive path, and overwrite a file that already
 * holds an archive (contract 1.4, 18절 "덮어쓰지 않는다").
 *
 * @param {string|null} content existing file text, or null when it is absent
 * @returns {{present: boolean, fields: object, order: string[]}}
 */
export function parseFrontmatter(content) {
  if (content === null || content === undefined) {
    return { present: false, fields: {}, order: [] };
  }
  if (typeof content !== 'string') {
    throw new CoreHardError('existing file content is not a string (§1.4)');
  }
  if (!FENCE.test(content)) {
    return { present: false, fields: {}, order: [] };
  }

  const rest = content.slice(FENCE.exec(content)[0].length);
  const end = /^---[ \t]*(\r?\n|$)/m.exec(rest);
  if (!end) {
    throw new CoreHardError('frontmatter opens but never closes; the file is broken (§1.4)');
  }

  const body = rest.slice(0, end.index);
  const fields = {};
  const order = [];
  for (const line of body.split('\n')) {
    if (line.trim() === '') continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)[ \t]*:[ \t]*(.*)$/.exec(line);
    if (!match) {
      throw new CoreHardError(`frontmatter line is not a scalar field: ${line}`);
    }
    fields[match[1]] = parseYamlScalar(match[2]);
    order.push(match[1]);
  }

  return { present: true, fields, order };
}

/**
 * Read one scalar exactly as the writer emitted it.
 *
 * A double-quoted scalar is unquoted and unescaped; anything else is trimmed.
 * The archive is written by this same tool, so a plain scalar never needs
 * conversion — the only transformation that can be lossless is removing the
 * quotes the writer itself added.
 *
 * The escape forms are exactly the ones `quoteYamlString` writes: backslash,
 * double quote, the named control escapes (`\n`, `\r`, `\t`, `\b`, `\f`, `\0`)
 * and a `\xNN` hex escape. The scan is a single left-to-right pass, so a value
 * that genuinely contains a backslash followed by `n` round-trips as those two
 * characters rather than as a newline.
 *
 * @param {string} raw
 * @returns {string}
 */
function parseYamlScalar(raw) {
  const trimmed = raw.replace(/\r$/, '');
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(
      /\\([\\"nrtbf0]|x[0-9a-fA-F]{2})/g,
      (match, escape) => {
        switch (escape) {
          case '\\':
            return '\\';
          case '"':
            return '"';
          case 'n':
            return '\n';
          case 'r':
            return '\r';
          case 't':
            return '\t';
          case 'b':
            return '\b';
          case 'f':
            return '\f';
          case '0':
            return '\0';
          default:
            return String.fromCharCode(Number.parseInt(escape.slice(1), 16));
        }
      }
    );
  }
  return trimmed.trim();
}

// ---------------------------------------------------------------------------
// Document landmarks
// ---------------------------------------------------------------------------

// Both headings are matched as whole lines. A substring search would find the
// word inside body text and then the tool would decide an append belongs under
// a heading that is really a sentence.
const SECTION_HEADING = /^##[ \t]+추가[ \t]+질문[ \t]*\r?$/m;
const SESSION_HEADING = /^###[ \t]+(\d{4}-\d{2}-\d{2})[ \t]*\r?$/gm;

/**
 * Does the file already carry a `## 추가 질문` section?
 *
 * D6 keys on this: when it is absent the section is created at the END of the
 * file (design spec 13.1), when it is present the new turns go inside it.
 *
 * @param {string} content
 * @returns {boolean}
 */
export function hasAdditionalQuestionsSection(content) {
  if (typeof content !== 'string') return false;
  return SECTION_HEADING.test(content);
}

/**
 * Does the file already carry a `### YYYY-MM-DD` session heading?
 *
 * Design spec 13.4: one date heading per day. When it is already there the new
 * turns continue under it instead of opening a second one.
 *
 * @param {string} content
 * @param {string} date `YYYY-MM-DD`
 * @returns {boolean}
 */
export function hasSessionDateHeading(content, date) {
  if (typeof content !== 'string') return false;
  SESSION_HEADING.lastIndex = 0;
  let match;
  while ((match = SESSION_HEADING.exec(content)) !== null) {
    if (match[1] === date) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// File conflict
// ---------------------------------------------------------------------------

/**
 * The four options of design spec section 12, in the order the spec lists them.
 *
 * "알려고 자동으로 진행" is absent by construction. The list has exactly four
 * entries and there is no "proceed because the user asked", because section 18
 * forbids overwriting and the contract's judgment turns section 12's weaker
 * "알려야 한다" into a halt.
 */
export const CONFLICT_OPTIONS = Object.freeze([
  { id: 'append-review', label: "복습 추가 → '추가 질문' 영역에 넣기", isDefault: false },
  { id: 'new-file', label: '새 파일로 저장', isDefault: false },
  { id: 'overwrite', label: '덮어쓰기', isDefault: false },
  { id: 'cancel', label: '취소', isDefault: true },
]);

/**
 * Build the conflict result: the save stops and the options are presented.
 *
 * The default is cancel, and it is carried as data rather than left to the
 * caller's UI. A caller that renders the options and forgets to preselect
 * cancel would have turned "묻는다" into "알려만 하고 진행", which the contract
 * judgment explicitly rejects.
 *
 * @param {{targetPath: string, reason: string, extra?: object}} request
 * @returns {{halted: true, conflict: object}}
 */
export function fileConflict(request) {
  const { targetPath, reason, extra = {} } = request;
  if (typeof targetPath !== 'string' || targetPath.length === 0) {
    throw new CoreHardError('a file conflict needs the target path it halted on');
  }
  return {
    halted: true,
    conflict: {
      targetPath,
      reason,
      options: CONFLICT_OPTIONS,
      defaultOption: 'cancel',
      ...extra,
    },
  };
}

// ---------------------------------------------------------------------------
// D1..D6
// ---------------------------------------------------------------------------

/**
 * Decide what to do with a conversation given the target file.
 *
 * The decision is keyed on the recorded turn ID, never on a count
 * (contract 5, design spec 13.3):
 *
 *   D1  no archive_conversation      first archive, write the whole file
 *   D2  conversation matches         append the turns AFTER the anchor
 *   D3  conversation differs         stop and ask; never append silently
 *   D4  the anchor is gone           no append; report a new-file path
 *   D5  no turns after the anchor    no-op; the file is not touched
 *   D6  no `## 추가 질문` yet        create the section at the end of the file
 *
 * `turns` is the whole conversation in oldest-first order, the same array the
 * adapter hands the core (contract 6.1). The module does not filter it by date
 * or by question kind; the anchor is found by exact ID equality and everything
 * after it is new, which is why an odd-length tail or a pair split across the
 * anchor cannot silently drop a half pair.
 *
 * @param {{existingContent: string|null, turns: Array<object>, conversationId: string, targetPath: string}} request
 * @returns {{rule: string, action: string, write: boolean, newTurns: Array<object>, anchor: object|null, question: object|null, suggestedPath: string|null, validationEntries: Array<object>}}
 */
export function evaluateDelta(request) {
  const { existingContent, turns, conversationId, targetPath } = request;

  if (!Array.isArray(turns)) {
    throw new CoreHardError('turns is not an array (§1.2)');
  }
  if (typeof conversationId !== 'string' || conversationId.length === 0) {
    throw new CoreHardError('the adapter must supply a conversation ID (contract 6.1)');
  }
  if (typeof targetPath !== 'string' || targetPath.length === 0) {
    throw new CoreHardError('a delta decision needs the target path');
  }

  const base = {
    targetPath,
    conversationId,
    existingContent: existingContent ?? null,
    newTurns: [],
    anchor: null,
    question: null,
    suggestedPath: null,
    validationEntries: [],
    fileExists: existingContent !== null && existingContent !== undefined,
  };

  const { fields } = parseFrontmatter(existingContent ?? null);
  const archivedConversation = fields.archive_conversation ?? null;

  // D1 — nothing archived here yet. The plan is a first archive; whether the
  // write is allowed at all is the file-conflict question, handled by planSave.
  if (archivedConversation === null) {
    return { ...base, rule: 'D1', action: ACTION_FIRST_ARCHIVE, write: true, turns };
  }

  // D3 — the file belongs to a different conversation. A notebook holds several
  // conversations (design spec 13.3), so appending here would silently merge
  // two chats. Stop and ask; the default is cancel.
  if (archivedConversation !== conversationId) {
    return {
      ...base,
      rule: 'D3',
      action: ACTION_ASK,
      write: false,
      question: {
        rule: 'D3',
        targetPath,
        fileConversation: archivedConversation,
        currentConversation: conversationId,
        message:
          `${targetPath} 는 다른 대화에 대한 기록입니다 (파일: ${archivedConversation}, ` +
          `현재 대화: ${conversationId}). 조용히 append하지 않습니다.`,
        options: CONFLICT_OPTIONS,
        defaultOption: 'cancel',
      },
      validationEntries: [
        info(
          'conversation mismatch',
          `archive_conversation ${archivedConversation} != ${conversationId}; the save stops and asks (D3)`
        ),
      ],
    };
  }

  // D2 / D4 / D5 all key on the anchor ID.
  const anchorTurnId = fields.archive_last_turn ?? null;
  if (anchorTurnId === null) {
    // The file claims this conversation but records no anchor turn. There is no
    // position to append after, and guessing one would re-append the whole
    // lecture. D4 is the honest answer: report a new-file path.
    return {
      ...base,
      rule: 'D4',
      action: ACTION_NEW_FILE,
      write: false,
      suggestedPath: targetPath,
      validationEntries: [
        info('anchor missing', 'the file records no archive_last_turn; a new-file path is reported (D4)'),
      ],
    };
  }

  const position = turns.findIndex((turn) => turn && turn.id === anchorTurnId);
  if (position === -1) {
    // D4 — the anchor is not in this conversation. The user deleted the
    // original chat and studied again, so the IDs no longer line up. Appending
    // anyway would interleave two unrelated studies; report a new file.
    return {
      ...base,
      rule: 'D4',
      action: ACTION_NEW_FILE,
      write: false,
      suggestedPath: targetPath,
      anchor: { turnId: anchorTurnId, position: null, index: null, found: false },
      validationEntries: [
        info(
          'anchor not found',
          `기준 turn ${anchorTurnId} 이 현재 대화에 없습니다; append하지 않고 새 파일 경로를 안내합니다 (D4)`
        ),
      ],
    };
  }

  // The anchor is at index `position`, so its 1-based position is position + 1.
  // For the recorded run the anchor is the 174th of 174 turns and the reported
  // position is 174, which is what design spec 13.3's example prints.
  const anchor = {
    turnId: anchorTurnId,
    index: position,
    position: position + 1,
    found: true,
  };
  const newTurns = turns.slice(position + 1);

  // D5 — the anchor is the last turn. The user did nothing, so the file is
  // left untouched. This is a no-op, NOT a hard error: an error here would tell
  // the user their own archive is broken (contract 5).
  if (newTurns.length === 0) {
    return {
      ...base,
      rule: 'D5',
      action: ACTION_NOOP,
      write: false,
      anchor,
      validationEntries: [
        info(
          'no new turns',
          `기준 turn ${anchorTurnId} 이 ${anchor.position}번째에서 일치하고 그 뒤에 신규 turn가 0개입니다. ` +
            '추가할 새 질문 없음 (no-op)'
        ),
      ],
    };
  }

  // D2 — append everything after the anchor, in conversation order.
  const recordedTurns = Number.parseInt(fields.archive_turns ?? '', 10);
  const entries = [
    info(
      'delta anchor',
      `기준 turn ${anchorTurnId} → ${anchor.position}번째에서 일치. ` +
        `${turns.length} turn 중 ${newTurns.length} turn만 추가합니다. (D2)`
    ),
  ];
  if (Number.isInteger(recordedTurns) && recordedTurns !== position + 1) {
    // The ID is the base, but a count that disagrees with the anchor position
    // means one of the two records is wrong. It is reported, not enforced:
    // enforcing it would reintroduce count-keying, which the contract forbids.
    entries.push(
      info(
        'anchor count disagreement',
        `archive_turns ${recordedTurns} 은 기준 turn의 위치 ${anchor.position} 와 다릅니다. ` +
          '기준은 개수가 아니라 turn ID이므로 ID를 따릅니다.'
      )
    );
  }

  return {
    ...base,
    rule: 'D2',
    action: ACTION_APPEND,
    write: true,
    anchor,
    newTurns,
    validationEntries: entries,
  };
}

// ---------------------------------------------------------------------------
// The whole save decision
// ---------------------------------------------------------------------------

/**
 * Combine the delta decision with the file-conflict halt.
 *
 * Order matters. The conflict check runs on the INTENT, not on the file: the
 * save halts when a FIRST ARCHIVE would land on a path that already exists.
 * An append onto an existing archive is not a conflict — that path is what D2
 * is for — and a file belonging to another conversation halts through D3's ask
 * with the same four options and the same default.
 *
 * When nothing halts, `write` carries the content to PUT. When something
 * halts, `write` is null and no caller may write.
 *
 * @param {{existingContent: string|null, turns: Array<object>, conversationId: string, targetPath: string}} request
 * @returns {object} the delta plan, plus `halted`, `conflict` and `write`
 */
export function planSave(request) {
  const delta = evaluateDelta(request);
  const exists = delta.fileExists;

  if (!exists) {
    return { ...delta, halted: false, conflict: null };
  }

  if (delta.action === ACTION_FIRST_ARCHIVE) {
    // Design spec 12 / contract file-conflict judgment: a target file that
    // exists stops the save and the four options are offered, cancel default.
    return {
      ...fileConflict({
        targetPath: delta.targetPath,
        reason:
          `${delta.targetPath} 가 이미 있습니다. 자동 덮어쓰기를 하지 않습니다. ` +
          '(D1 최초 아카이브인데 대상 파일이 이미 존재합니다)',
        extra: { rule: 'D1', delta },
      }),
      rule: delta.rule,
      action: delta.action,
      write: false,
      newTurns: [],
      anchor: null,
      question: null,
      suggestedPath: delta.targetPath,
      validationEntries: delta.validationEntries,
      fileExists: true,
      delta,
    };
  }

  if (delta.action === ACTION_ASK) {
    // D3 halts too. The ask and the conflict carry the same options, so the
    // result is merged rather than nested: a caller reads one `options` list.
    return {
      ...delta,
      halted: true,
      conflict: {
        targetPath: delta.targetPath,
        reason: delta.question.message,
        options: delta.question.options,
        defaultOption: delta.question.defaultOption,
      },
      write: false,
      delta,
    };
  }

  return { ...delta, halted: false, conflict: null };
}

/**
 * The date-idempotency judgment (contract 5, design spec 13.4), separated out
 * because the two rows answer different questions.
 *
 *   append + today's date heading already exists -> keep adding under it
 *   first archive + today already archived         -> grade error
 *
 * The second row is a hard error rather than a no-op on purpose: a silent
 * duplicate is not the right answer, and the user asked for a first archive
 * into a file that already holds today's first archive.
 *
 * @param {{mode: 'append'|'first', existingContent: string|null, today: string, turns?: Array<object>}} request
 * @returns {{reuseDateHeading: boolean, validationEntries: Array<object>, saveBlocked: boolean}}
 */
export function checkDateIdempotency(request) {
  const { mode, existingContent, today, turns } = request;
  if (typeof today !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new CoreHardError(`today must be YYYY-MM-DD: ${today}`);
  }
  if (mode !== 'append' && mode !== 'first') {
    throw new CoreHardError(`unknown date idempotency mode: ${mode}`);
  }

  const content = existingContent ?? '';
  const { fields } = parseFrontmatter(existingContent ?? null);
  const dateHeadingExists = hasSessionDateHeading(content, today);

  if (mode === 'append') {
    return {
      reuseDateHeading: dateHeadingExists,
      saveBlocked: false,
      validationEntries: dateHeadingExists
        ? [info('date heading reused', `### ${today} 가 이미 있어 그 아래에 계속 추가합니다 (13.4)`)]
        : [],
    };
  }

  const alreadyArchivedToday = fields.archived === today;
  if (alreadyArchivedToday) {
    return {
      reuseDateHeading: false,
      saveBlocked: true,
      validationEntries: [
        {
          grade: 'error',
          category: 'duplicate first archive today',
          message:
            `이 파일은 이미 ${today} 에 최초 아카이브되었습니다. ` +
            '같은 날짜에 최초 학습 아카이브를 다시 만들면 같은 페이지 그룹이 두 번 생깁니다. ' +
            '(13.4)',
          date: today,
        },
      ],
    };
  }

  return { reuseDateHeading: false, saveBlocked: false, validationEntries: [] };
}

// ---------------------------------------------------------------------------
// Rendering the decided content
// ---------------------------------------------------------------------------

/**
 * Render the file content a plan asks for.
 *
 * D1 assembles the whole file. D2 appends a review-session fragment, and this
 * is where D6 lands: with no `## 추가 질문` in the file the section is created
 * at the END (design spec 13.1), and when the section is already there the new
 * turns go inside it with no second section heading. The date heading follows
 * 13.4: reused when today is already open.
 *
 * Nothing in the existing body is rewritten, moved or reclassified. The existing
 * `## N페이지` groups are never touched, so the same page number may legitimately
 * appear twice (design spec 13.1).
 *
 * @param {object} plan the result of `planSave`
 * @param {{course: string, lecture: number, date: string, archivedDate?: string, offsetMinutes?: number}} options
 * @returns {string|null} the content to PUT, or null when nothing is written
 */
export function renderSave(plan, options) {
  if (!plan || plan.write !== true) return null;

  if (plan.action === ACTION_FIRST_ARCHIVE) {
    return assembleFirstArchive(plan.turns, {
      course: options.course,
      lecture: options.lecture,
      conversationId: plan.conversationId,
      archivedDate: options.archivedDate ?? options.date,
      offsetMinutes: options.offsetMinutes,
    });
  }

  if (plan.action === ACTION_APPEND) {
    const existingContent = plan.existingContent;
    const sectionExists = hasAdditionalQuestionsSection(existingContent);
    const dateExists = hasSessionDateHeading(existingContent, options.date);
    const fragment = assembleReviewSession(plan.newTurns, {
      date: options.date,
      offsetMinutes: options.offsetMinutes,
      includeSection: !sectionExists,
      includeDate: !dateExists,
    });

    if (!sectionExists) {
      // D6: create `## 추가 질문` at the end of the file.
      return appendReviewSession(existingContent, fragment);
    }
    // The section is the last thing in the file (design spec 13.1), so the end
    // of the file is inside the section already.
    const base = existingContent.replace(/\n+$/, '');
    return `${base}\n\n${fragment}`;
  }

  throw new CoreHardError(`plan action ${plan.action} asked for a write but has no renderer`);
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/**
 * One validation entry. Grade `info` never blocks (contract 3.3).
 *
 * @param {string} category
 * @param {string} message
 * @returns {{grade: string, category: string, message: string}}
 */
function info(category, message) {
  return { grade: 'info', category, message };
}