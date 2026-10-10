// Fixture 2 — Phase B case 2
// A follow-up question with no page number, so the current page is inherited
// from the preceding question. Contract reference: §2.2 state machine row
// "state n, no extracted page -> append to group n", §2.7 P-02, P-03.

/**
 * @type {Array<{id: string, ts: number, kind: 'question' | 'answer', text: string}>}
 */
export default [
  {
    id: '00000000-0000-4000-8000-000000000007',
    ts: 1790653400,
    kind: 'question',
    text: '23페이지 설명해줘.',
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    ts: 1790653480,
    kind: 'answer',
    text: '23페이지는 직접 천이와 간접 천이의 차이를 정의하는 구간입니다.',
  },
  {
    // No page token and no page digits: current page stays 23 (P-02).
    id: '00000000-0000-4000-8000-000000000009',
    ts: 1790653560,
    kind: 'question',
    text: '여기서 x는 왜 증가해?',
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    ts: 1790653620,
    kind: 'answer',
    text: 'x는 광자의 에너지 \\(E = \\hbar \\omega\\) 를 뜻하며, 주파수가 커질수록 증가합니다.',
  },
  {
    // Still page 23 (P-03).
    id: '00000000-0000-4000-8000-000000000011',
    ts: 1790653700,
    kind: 'question',
    text: '그러면 앞 공식과는 모순 아닌가?',
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    ts: 1790653760,
    kind: 'answer',
    text: '모순이 아닙니다. 앞 공식은 \\(E_k = \\hbar^2 k^2 / 2m^*\\) 형태의 분산 관계이며, ' +
      '두 식은 같은 에너지-운동량 관계의 다른 표기입니다.',
  },
];