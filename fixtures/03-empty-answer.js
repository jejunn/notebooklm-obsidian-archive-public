// Fixture 3 — Phase B case 3
// One answer turn whose text is the empty string. This is a normal wire state,
// not a hard error. Contract reference: §1.2 (`text` may be empty), §1.4,
// §3.1 (grade `warning`, `### A` heading kept), §3.2 (block placeholder carrying
// the ANSWER turn timestamp).
//
// The empty answer's `ts` is the epoch second for the instant printed as
// 2026-09-28 17:14:57 at UTC+09:00, which is the timestamp literal used in the
// contract §3.2 example. The fixture stores the raw epoch second only, because
// rendering is the assembler's concern (§1.2: `ts` is unix seconds) and must not
// depend on the host time zone.

/**
 * @type {Array<{id: string, ts: number, kind: 'question' | 'answer', text: string}>}
 */
export default [
  {
    id: '00000000-0000-4000-8000-000000000013',
    ts: 1790583290,
    kind: 'question',
    text: '2강 9페이지 설명해줘.',
  },
  {
    id: '00000000-0000-4000-8000-000000000014',
    ts: 1790583297,
    kind: 'answer',
    text: '',
  },
  {
    // The same question asked again minutes later, answered normally.
    // §3.1: duplicates are preserved, never merged.
    id: '00000000-0000-4000-8000-000000000015',
    ts: 1790583590,
    kind: 'question',
    text: '2강 9페이지 설명해줘.',
  },
  {
    id: '00000000-0000-4000-8000-000000000016',
    ts: 1790583660,
    kind: 'answer',
    text: '9페이지에서는 화학 기판 epitaxy 장비의 구성과 공정 순서를 설명합니다.',
  },
];