// Fixture 7 — Phase B case 7
// One conversation that returns to a previously seen page number: 23, then 24,
// then back to 23. The 2026-10-05 measurement re-asks an already-seen page 4
// times (page 9 at question indices 5 and 6, page 19 at 23, 24 and 25, page 27
// at 39 and 40), but every one of those repeats is ADJACENT — no page is
// revisited after an intervening page. This fixture's 23 -> 24 -> 23 shape,
// where another page sits in between, therefore never occurs in the real data
// and stays hand-authored.
//
// Contract reference: §2.2 — a new group and a new heading open every time the
// page changes, including on the way back, so the page 23 heading appears twice
// in the assembled output. That is the rule this fixture makes falsifiable; the
// spec's weaker "only when the page changes" wording is ambiguous for 5 -> 8 -> 5
// and §2.2 resolves it to "always reopen on change".

/**
 * @type {Array<{id: string, ts: number, kind: 'question' | 'answer', text: string}>}
 */
export default [
  {
    id: '00000000-0000-4000-8000-000000000026',
    ts: 1790653400,
    kind: 'question',
    text: '23페이지 설명해줘.',
  },
  {
    id: '00000000-0000-4000-8000-000000000027',
    ts: 1790653470,
    kind: 'answer',
    text: '23페이지는 직접 천이와 간접 천이의 정의를 다룹니다.',
  },
  {
    id: '00000000-0000-4000-8000-000000000028',
    ts: 1790653540,
    kind: 'question',
    text: '24페이지 설명해줘.',
  },
  {
    id: '00000000-0000-4000-8000-000000000029',
    ts: 1790653600,
    kind: 'answer',
    text: '24페이지의 표는 두 천이 유형의 결정 구조를 비교합니다.',
  },
  {
    // Revisit: page 23 was already opened by the first question of this array.
    id: '00000000-0000-4000-8000-000000000030',
    ts: 1790653680,
    kind: 'question',
    text: '23페이지로 돌아가서 그 표를 다시 설명해줘.',
  },
  {
    id: '00000000-0000-4000-8000-000000000031',
    ts: 1790653750,
    kind: 'answer',
    text: '다시 23페이지입니다. 표에는 직접 천이형과 간접 천이형의 에너지 준위 배치가 나란히 있습니다.',
  },
];