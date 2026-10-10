// Fixture 4 — Phase B case 4
// Two question/answer pairs whose question text is byte-identical while the turn
// IDs differ. Contract reference: §3.1 — turn ID is the identity, so both pairs
// are preserved and never merged.
//
// Note the contrast with §3.1 last row: identical question text AND identical
// turn ID is a defensive hard error. Only the ID distinguishes identity here.

/**
 * @type {Array<{id: string, ts: number, kind: 'question' | 'answer', text: string}>}
 */
export default [
  {
    id: '00000000-0000-4000-8000-000000000017',
    ts: 1790653400,
    kind: 'question',
    text: '55페이지 설명해줘',
  },
  {
    id: '00000000-0000-4000-8000-000000000018',
    ts: 1790653470,
    kind: 'answer',
    text: '첫 번째 답변입니다.',
  },
  {
    // Byte-identical text, different id.
    id: '00000000-0000-4000-8000-000000000019',
    ts: 1790653800,
    kind: 'question',
    text: '55페이지 설명해줘',
  },
  {
    id: '00000000-0000-4000-8000-000000000020',
    ts: 1790653860,
    kind: 'answer',
    text: '두 번째 답변입니다. 같은 문구지만 다른 turn ID이므로 둘 다 보존해야 합니다.',
  },
];