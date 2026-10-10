// Fixture 5 — Phase B case 5
// An odd number of turns, so the final question has no answer after it. This
// must raise the alternation hard error described in §1.4 last row
// ("questions/answers not alternated -> hard error"), not be silently dropped.
//
// The array ends with a lone turn whose kind is `question`.

/**
 * @type {Array<{id: string, ts: number, kind: 'question' | 'answer', text: string}>}
 */
export default [
  {
    id: '00000000-0000-4000-8000-000000000021',
    ts: 1790653400,
    kind: 'question',
    text: '24페이지 설명해줘.',
  },
  {
    id: '00000000-0000-4000-8000-000000000022',
    ts: 1790653470,
    kind: 'answer',
    text: '24페이지의 표를 설명합니다.',
  },
  {
    // No matching answer follows this turn.
    id: '00000000-0000-4000-8000-000000000023',
    ts: 1790653540,
    kind: 'question',
    text: '이 표는 왜 이렇게 돼?',
  },
];