// T4 acceptance checks for the delta rules D1..D6 and the file-conflict halt.
//
// The assertions come from implementation-contract.md section 5 (the delta
// table, the "기준은 개수가 아니라 turn ID다" rule, the anchor position report,
// the D5 no-op and the file-conflict judgment), and design spec section 13.3
// (delta rules, conversation identity), section 13.4 (date idempotency) and
// section 12 (the four conflict options with cancel as the default).

import { describe, expect, test } from 'bun:test';

import { CoreHardError } from '../src/ingest-core.js';
import {
  ACTION_APPEND,
  ACTION_ASK,
  ACTION_FIRST_ARCHIVE,
  ACTION_NEW_FILE,
  ACTION_NOOP,
  CONFLICT_OPTIONS,
  checkDateIdempotency,
  evaluateDelta,
  fileConflict,
  hasAdditionalQuestionsSection,
  hasSessionDateHeading,
  parseFrontmatter,
  planSave,
  renderSave,
} from '../src/delta-rules.js';
import { assembleFirstArchive } from '../src/markdown-assembler.js';

const CONVERSATION_ID = '00000000-0000-4000-8000-000000000003';
const OTHER_CONVERSATION_ID = '00000000-0000-4000-8000-000000000001';
const COURSE = '예제 과목';
const LECTURE = 1;
const TARGET = '예제 과목/1강.md';
const BASE_TS = 1790583297;

// Deterministic turn IDs in the shape the wire uses. `turnId(n)` is the n-th
// turn (1-based) of the conversation built by `makeConversation`.
const turnId = (n) => `turn-${String(n).padStart(3, '0')}`;

/**
 * Build an oldest-first conversation of `turnCount` turns (question, answer).
 *
 * @param {number} turnCount
 * @returns {Array<{id: string, ts: number, kind: string, text: string}>}
 */
function makeConversation(turnCount) {
  const turns = [];
  for (let i = 1; i <= turnCount; i += 1) {
    const isQuestion = i % 2 === 1;
    const pair = Math.ceil(i / 2);
    turns.push({
      id: turnId(i),
      ts: BASE_TS + i * 60,
      kind: isQuestion ? 'question' : 'answer',
      text: isQuestion ? `${pair}번째 질문 ${pair}페이지 설명해줘.` : `답변 ${pair}.`,
    });
  }
  return turns;
}

/**
 * The file an earlier run of the tool would have written for `turns`.
 *
 * The content is produced by the real assembler rather than pasted in, so the
 * frontmatter the delta rules read is byte-identical to the frontmatter the
 * writer emits — including the quoting of the turn IDs.
 *
 * @param {Array<object>} turns
 * @returns {string}
 */
function existingFileFor(turns, overrides = {}) {
  return assembleFirstArchive(turns, {
    course: overrides.course ?? COURSE,
    lecture: overrides.lecture ?? LECTURE,
    conversationId: overrides.conversationId ?? CONVERSATION_ID,
    archivedDate: overrides.archivedDate ?? '2026-10-05',
  });
}

// ---------------------------------------------------------------------------
// frontmatter parsing
// ---------------------------------------------------------------------------

describe('frontmatter parsing', () => {
  test('the eight written fields are read back unchanged', () => {
    const turns = makeConversation(4);
    const parsed = parseFrontmatter(existingFileFor(turns));
    expect(parsed.present).toBe(true);
    expect(parsed.fields.type).toBe('notebooklm-study');
    expect(parsed.fields.course).toBe(COURSE);
    expect(parsed.fields.lecture).toBe('1');
    expect(parsed.fields.archived).toBe('2026-10-05');
    expect(parsed.fields.archive_turns).toBe('4');
    expect(parsed.fields.archive_first_turn).toBe(turnId(1));
    expect(parsed.fields.archive_last_turn).toBe(turnId(4));
    expect(parsed.fields.archive_conversation).toBe(CONVERSATION_ID);
  });

  test('an absent file and a file without frontmatter both read as absent', () => {
    expect(parseFrontmatter(null).present).toBe(false);
    expect(parseFrontmatter('# 1강\n\n본문만 있는 파일\n').present).toBe(false);
  });

  test('a frontmatter block that never closes is a hard error, not an empty one', () => {
    // An empty read would take the D1 path and overwrite a real archive.
    expect(() => parseFrontmatter('---\ntype: notebooklm-study\n')).toThrow(CoreHardError);
  });
});

// ---------------------------------------------------------------------------
// D2 — anchor matched at turn 174
// ---------------------------------------------------------------------------

describe('D2 append keyed on the turn ID', () => {
  test('only the turns after the anchor are appended and the position is reported', () => {
    const archived = makeConversation(174);
    const existingContent = existingFileFor(archived);
    const turns = makeConversation(182);

    const plan = evaluateDelta({
      existingContent,
      turns,
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });

    expect(plan.rule).toBe('D2');
    expect(plan.action).toBe(ACTION_APPEND);
    expect(plan.write).toBe(true);

    // Design spec 13.3: the base is the turn ID, not the count.
    expect(plan.anchor.turnId).toBe(turnId(174));
    expect(plan.anchor.position).toBe(174);
    expect(plan.anchor.index).toBe(173);
    expect(plan.newTurns.map((t) => t.id)).toEqual([turnId(175), turnId(176), turnId(177), turnId(178), turnId(179), turnId(180), turnId(181), turnId(182)]);
    expect(plan.newTurns).toHaveLength(8);

    // The validation output has to let the user confirm the position themselves.
    const anchorEntry = plan.validationEntries.find((e) => e.category === 'delta anchor');
    expect(anchorEntry.grade).toBe('info');
    expect(anchorEntry.message).toContain('174번째에서 일치');
  });

  test('the appended fragment reaches the end of the file and reclassifies nothing', () => {
    const archived = makeConversation(4);
    const existingContent = existingFileFor(archived);
    const turns = makeConversation(8);

    const plan = evaluateDelta({
      existingContent,
      turns,
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });
    const saved = renderSave(plan, { course: COURSE, lecture: LECTURE, date: '2026-10-15' });

    // Everything the first archive wrote is still present, unchanged.
    expect(saved.startsWith(existingContent.replace(/\n+$/, ''))).toBe(true);
    // D6: no `## 추가 질문` in the file yet, so the section is created at the end.
    expect(hasAdditionalQuestionsSection(existingContent)).toBe(false);
    expect(saved).toContain('## 추가 질문');
    expect(saved).toContain('### 2026-10-15');
    expect(saved).toContain('##### Q');
    expect(saved).toContain('##### A');
    // The original first-archive headings are untouched, so the same page may
    // legitimately appear twice (design spec 13.1). The new turns are questions
    // 3 and 4, and the review fragment opens its own `#### N페이지` headings
    // instead of re-opening the existing `## 1페이지`.
    expect(saved).toContain('### Q');
    expect(saved).toContain('## 1페이지');
    expect(saved).toContain('#### 3페이지');
    expect(saved.indexOf('## 1페이지')).toBeLessThan(saved.indexOf('#### 3페이지'));
  });

  test('a second append reuses the section and the date heading instead of duplicating them', () => {
    const existingContent = existingFileFor(makeConversation(4));
    const first = renderSave(
      evaluateDelta({
        existingContent,
        turns: makeConversation(8),
        conversationId: CONVERSATION_ID,
        targetPath: TARGET,
      }),
      { course: COURSE, lecture: LECTURE, date: '2026-10-15' }
    );

    // 13.4: one date heading per day. The second run adds under it.
    const idempotency = checkDateIdempotency({
      mode: 'append',
      existingContent: first,
      today: '2026-10-15',
    });
    expect(idempotency.reuseDateHeading).toBe(true);
    expect(idempotency.saveBlocked).toBe(false);

    const second = renderSave(
      evaluateDelta({
        existingContent: first,
        turns: makeConversation(8),
        conversationId: CONVERSATION_ID,
        targetPath: TARGET,
      }),
      { course: COURSE, lecture: LECTURE, date: '2026-10-15', reuseDateHeading: idempotency.reuseDateHeading }
    );

    expect(second.match(/^## 추가 질문$/gm)).toHaveLength(1);
    expect(second.match(/^### 2026-10-15$/gm)).toHaveLength(1);
    expect(second.length).toBeGreaterThan(first.length);
  });

  test('the anchor wins over a disagreeing count, and the disagreement is reported', () => {
    const existingContent = existingFileFor(makeConversation(174));
    const plan = evaluateDelta({
      existingContent,
      turns: makeConversation(176),
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });
    expect(plan.anchor.position).toBe(174);
    expect(plan.newTurns).toHaveLength(2);
    expect(plan.validationEntries.some((e) => e.category === 'anchor count disagreement')).toBe(false);

    // A file whose archive_turns does not match the anchor position is still
    // keyed on the ID; the disagreement is reported, never enforced.
    const edited = existingContent.replace('archive_turns: 174', 'archive_turns: 99');
    const editedPlan = evaluateDelta({
      existingContent: edited,
      turns: makeConversation(176),
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });
    expect(editedPlan.action).toBe(ACTION_APPEND);
    expect(editedPlan.anchor.position).toBe(174);
    expect(editedPlan.newTurns).toHaveLength(2);
    expect(editedPlan.validationEntries.some((e) => e.category === 'anchor count disagreement')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// D5 — nothing new
// ---------------------------------------------------------------------------

describe('D5 no-op', () => {
  test('an anchor at the last turn writes nothing and is not an error', () => {
    const turns = makeConversation(174);
    const existingContent = existingFileFor(turns);

    const plan = evaluateDelta({
      existingContent,
      turns,
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });

    expect(plan.rule).toBe('D5');
    expect(plan.action).toBe(ACTION_NOOP);
    expect(plan.write).toBe(false);
    expect(plan.newTurns).toHaveLength(0);
    expect(plan.anchor.position).toBe(174);
    // A no-op is grade info. No grade error, so nothing blocks and nothing
    // tells the user their own archive is broken (contract 5).
    expect(plan.validationEntries.every((e) => e.grade !== 'error')).toBe(true);
    expect(renderSave(plan, { course: COURSE, lecture: LECTURE, date: '2026-10-15' })).toBeNull();

    const saved = planSave({
      existingContent,
      turns,
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });
    expect(saved.halted).toBe(false);
    expect(saved.write).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// D3 — the conversation does not match
// ---------------------------------------------------------------------------

describe('D3 conversation mismatch', () => {
  test('nothing is appended and the tool asks, with cancel as the default', () => {
    const existingContent = existingFileFor(makeConversation(4), {
      conversationId: OTHER_CONVERSATION_ID,
    });

    const plan = evaluateDelta({
      existingContent,
      turns: makeConversation(8),
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });

    expect(plan.rule).toBe('D3');
    expect(plan.action).toBe(ACTION_ASK);
    expect(plan.write).toBe(false);
    expect(plan.newTurns).toHaveLength(0);
    expect(plan.suggestedPath).toBeNull();

    expect(plan.question.fileConversation).toBe(OTHER_CONVERSATION_ID);
    expect(plan.question.currentConversation).toBe(CONVERSATION_ID);
    expect(plan.question.defaultOption).toBe('cancel');
    expect(plan.question.options.find((o) => o.isDefault).id).toBe('cancel');
    expect(renderSave(plan, { course: COURSE, lecture: LECTURE, date: '2026-10-15' })).toBeNull();

    // planSave halts, and the ask it returns carries the same default.
    const saved = planSave({
      existingContent,
      turns: makeConversation(8),
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });
    expect(saved.halted).toBe(true);
    expect(saved.write).toBe(false);
    expect(saved.conflict.defaultOption).toBe('cancel');
    expect(saved.conflict.options.find((o) => o.isDefault).id).toBe('cancel');
  });

  test('the same conversation is not treated as a mismatch', () => {
    const existingContent = existingFileFor(makeConversation(4));
    const plan = evaluateDelta({
      existingContent,
      turns: makeConversation(6),
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });
    expect(plan.rule).toBe('D2');
  });
});

// ---------------------------------------------------------------------------
// D4 — the anchor is gone
// ---------------------------------------------------------------------------

describe('D4 anchor not found', () => {
  test('no append happens and a new-file path is reported', () => {
    const existingContent = existingFileFor(makeConversation(174));
    // The user deleted the original chat and studied again: the IDs no longer
    // line up at all.
    const turns = makeConversation(8);

    const plan = evaluateDelta({
      existingContent,
      turns,
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });

    expect(plan.rule).toBe('D4');
    expect(plan.action).toBe(ACTION_NEW_FILE);
    expect(plan.write).toBe(false);
    expect(plan.newTurns).toHaveLength(0);
    expect(plan.suggestedPath).toBe(TARGET);
    expect(plan.anchor.found).toBe(false);
    expect(renderSave(plan, { course: COURSE, lecture: LECTURE, date: '2026-10-15' })).toBeNull();

    const saved = planSave({
      existingContent,
      turns,
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });
    expect(saved.write).toBe(false);
    expect(saved.suggestedPath).toBe(TARGET);
  });

  test('a file that claims this conversation but records no anchor reports a new file', () => {
    const existingContent = existingFileFor(makeConversation(174)).replace(
      /^archive_last_turn: .*$/m,
      'archive_last_turn: ""'
    );
    const plan = evaluateDelta({
      existingContent,
      turns: makeConversation(174),
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });
    expect(plan.rule).toBe('D4');
    expect(plan.write).toBe(false);
    expect(plan.suggestedPath).toBe(TARGET);
  });
});

// ---------------------------------------------------------------------------
// D1 and the file conflict
// ---------------------------------------------------------------------------

describe('D1 and the file conflict', () => {
  test('a target that already exists on a first archive halts with cancel as the default', () => {
    // The existing file is not an archive of this conversation, so a first
    // archive would land on top of it. The save stops and offers the four
    // options with cancel preselected (design spec 12, contract file conflict).
    const plan = planSave({
      existingContent: '# 1강\n\n이 파일은 아카이브가 아니다\n',
      turns: makeConversation(4),
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });

    expect(plan.halted).toBe(true);
    expect(plan.rule).toBe('D1');
    expect(plan.action).toBe(ACTION_FIRST_ARCHIVE);
    expect(plan.write).toBe(false);
    expect(plan.conflict.targetPath).toBe(TARGET);
    expect(plan.conflict.defaultOption).toBe('cancel');
    // Design spec 12: exactly four options, cancel preselected, and no
    // "proceed because the user asked".
    expect(plan.conflict.options.map((o) => o.id)).toEqual([
      'append-review',
      'new-file',
      'overwrite',
      'cancel',
    ]);
    expect(plan.conflict.options.filter((o) => o.isDefault)).toHaveLength(1);
    expect(renderSave(plan, { course: COURSE, lecture: LECTURE, date: '2026-10-15' })).toBeNull();
  });

  test('a first archive onto a path holding another conversation also halts', () => {
    // D3 rather than D1, but the file still exists at the target path, so the
    // same halt and the same options apply. Nothing is written either way.
    const plan = planSave({
      existingContent: existingFileFor(makeConversation(4), { conversationId: OTHER_CONVERSATION_ID }),
      turns: makeConversation(4),
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });
    expect(plan.halted).toBe(true);
    expect(plan.rule).toBe('D3');
    expect(plan.write).toBe(false);
    expect(plan.conflict.options).toEqual(CONFLICT_OPTIONS);
    expect(plan.conflict.defaultOption).toBe('cancel');
  });

  test('an absent target is a first archive and is written without asking', () => {
    const plan = planSave({
      existingContent: null,
      turns: makeConversation(4),
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });
    expect(plan.halted).toBe(false);
    expect(plan.rule).toBe('D1');
    expect(plan.write).toBe(true);

    const saved = renderSave(plan, { course: COURSE, lecture: LECTURE, date: '2026-10-05' });
    expect(saved).toContain('type: notebooklm-study');
    expect(saved).toContain(`archive_conversation: "${CONVERSATION_ID}"`);
    expect(saved).toContain(`archive_last_turn: "${turnId(4)}"`);
  });

  test('an append onto an existing archive is not a conflict', () => {
    const plan = planSave({
      existingContent: existingFileFor(makeConversation(4)),
      turns: makeConversation(6),
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });
    expect(plan.halted).toBe(false);
    expect(plan.conflict).toBeNull();
    expect(plan.rule).toBe('D2');
  });

  test('the conflict helper always offers the same four options with cancel default', () => {
    const { halted, conflict } = fileConflict({ targetPath: TARGET, reason: 'because' });
    expect(halted).toBe(true);
    expect(conflict.defaultOption).toBe('cancel');
    expect(conflict.options).toEqual(CONFLICT_OPTIONS);
    expect(conflict.options.map((o) => o.id)).not.toContain('proceed');
  });
});

// ---------------------------------------------------------------------------
// date idempotency (13.4)
// ---------------------------------------------------------------------------

describe('date idempotency', () => {
  test('a first archive repeated on the same day is a hard error, not a no-op', () => {
    const existingContent = existingFileFor(makeConversation(4), { archivedDate: '2026-10-15' });
    const result = checkDateIdempotency({ mode: 'first', existingContent, today: '2026-10-15' });
    expect(result.saveBlocked).toBe(true);
    expect(result.validationEntries[0].grade).toBe('error');
    expect(result.validationEntries[0].category).toBe('duplicate first archive today');
  });

  test('a first archive on a later day is allowed', () => {
    const existingContent = existingFileFor(makeConversation(4), { archivedDate: '2026-10-05' });
    const result = checkDateIdempotency({ mode: 'first', existingContent, today: '2026-10-15' });
    expect(result.saveBlocked).toBe(false);
    expect(result.validationEntries).toHaveLength(0);
  });

  test('an append on a day with no heading yet opens one', () => {
    const existingContent = existingFileFor(makeConversation(4));
    const result = checkDateIdempotency({ mode: 'append', existingContent, today: '2026-10-15' });
    expect(result.reuseDateHeading).toBe(false);
    expect(result.saveBlocked).toBe(false);
  });

  test('a malformed date or mode is a hard error', () => {
    const existingContent = existingFileFor(makeConversation(4));
    expect(() => checkDateIdempotency({ mode: 'first', existingContent, today: '2026-10-15T00:00:00Z' })).toThrow(CoreHardError);
    expect(() => checkDateIdempotency({ mode: 'both', existingContent, today: '2026-10-15' })).toThrow(CoreHardError);
  });
});

// ---------------------------------------------------------------------------
// input guards
// ---------------------------------------------------------------------------

describe('input guards', () => {
  test('the adapter must supply a conversation ID and a target path', () => {
    const request = {
      existingContent: existingFileFor(makeConversation(2)),
      turns: makeConversation(2),
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    };
    expect(() => evaluateDelta({ ...request, conversationId: '' })).toThrow(CoreHardError);
    expect(() => evaluateDelta({ ...request, targetPath: '' })).toThrow(CoreHardError);
    expect(() => evaluateDelta({ ...request, turns: null })).toThrow(CoreHardError);
    expect(() => fileConflict({ targetPath: '', reason: 'x' })).toThrow(CoreHardError);
  });

  test('the delta rules do not mutate the turn array they are given', () => {
    const turns = makeConversation(8);
    const snapshot = JSON.stringify(turns);
    const plan = evaluateDelta({
      existingContent: existingFileFor(makeConversation(4)),
      turns,
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });
    renderSave(plan, { course: COURSE, lecture: LECTURE, date: '2026-10-15' });
    expect(JSON.stringify(turns)).toBe(snapshot);
  });
});
// ---------------------------------------------------------------------------
// frontmatter: control characters must survive the writer/reader round trip
// ---------------------------------------------------------------------------

describe('frontmatter control characters round-trip losslessly', () => {
  // `course` is user-supplied and user-confirmed (contract 9), so a pasted name
  // can carry a newline. Contract 5 keys D1..D6 on these fields, so a block the
  // tool's own parseFrontmatter cannot read makes the archive permanently
  // un-appendable: the next run raises instead of taking the D2 path and the
  // user has to hand-edit the vault file. These tests pin the round trip.
  const turns = makeConversation(2);

  const roundTrip = (course) => parseFrontmatter(existingFileFor(turns, { course }));

  test('an embedded newline is escaped, not emitted raw', () => {
    const block = existingFileFor(turns, { course: '과목\n이름' });
    // The scalar occupies ONE physical line, so the frontmatter still holds
    // exactly the eight contract 6.4 fields between its two fences.
    const frontmatter = block.slice(0, block.indexOf('\n---\n', 4));
    expect(frontmatter.split('\n')).toHaveLength(9); // 1 fence + 8 fields
    expect(block).toContain('course: "과목\\n이름"');
    expect(roundTrip('과목\n이름').fields.course).toBe('과목\n이름');
  });

  test('a trailing newline is escaped, not emitted raw', () => {
    expect(roundTrip('예제 과목\n').fields.course).toBe('예제 과목\n');
  });

  test('a carriage return and a tab survive', () => {
    expect(roundTrip('a\r\nb').fields.course).toBe('a\r\nb');
    expect(roundTrip('a\tb').fields.course).toBe('a\tb');
  });

  test('an ordinary course name is still written as a plain scalar', () => {
    // The common case must not be quoted: an ordinary Korean course name has no
    // reason to gain quotes in the vault file.
    const block = existingFileFor(turns, { course: COURSE });
    expect(block).toContain(`course: ${COURSE}`);
    expect(block).not.toContain(`course: "${COURSE}"`);
  });

  test('a literal backslash followed by n is not mistaken for a newline', () => {
    // The escape scan is a single left-to-right pass, so an escaped backslash
    // is consumed together with the backslash and the `n` stays literal.
    expect(roundTrip('C:\\node').fields.course).toBe('C:\\node');
    expect(roundTrip('back\\nslash').fields.course).toBe('back\\nslash');
  });

  test('quotes and backslashes still round-trip', () => {
    expect(roundTrip('say "hi"').fields.course).toBe('say "hi"');
    expect(roundTrip('a\\b').fields.course).toBe('a\\b');
  });

  test('an archived file whose course carries a newline is still appendable', () => {
    // The end-to-end consequence: D2 keys on archive_conversation and the last
    // turn ID, so a newline-bearing course must not push the run onto a hard
    // error path.
    const archived = existingFileFor(turns, { course: '과목\n이름' });
    const delta = evaluateDelta({
      existingContent: archived,
      turns,
      conversationId: CONVERSATION_ID,
      targetPath: TARGET,
    });
    expect(delta.rule).toBe('D5');
    expect(delta.action).toBe(ACTION_NOOP);
  });
});
