// Fixture 1 — Phase B case 1
// A question that carries an explicit page number, followed by its answer.
// Contract reference: §2.7 P-01 (`23페이지 설명해줘.` -> page 23), §1.2 turn shape.
//
// Turn objects carry exactly four stored fields: id, ts, kind, text.
// `hasBody` is a derived value in the contract (§1.2) and is never stored.

/**
 * @type {Array<{id: string, ts: number, kind: 'question' | 'answer', text: string}>}
 */
export default [
  {
    id: '00000000-0000-4000-8000-000000000005',
    ts: 1790653400,
    kind: 'question',
    text: '23페이지 설명해줘.',
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    ts: 1790653480,
    kind: 'answer',
    text: '23페이지에서는 **직접 천이형(Direct Bandgap)** 반도체의 에너지-운동량 관계를 다룹니다.\n\n' +
      '핵심 조건은 결정 모멘텀 \\(k = 0\\) 지점에서 가전자대의 최고점과 전도대의 최저점이 ' +
      '수직으로 정렬되어 있다는 것입니다.',
  },
];