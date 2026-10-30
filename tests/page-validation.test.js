import { expect, test } from 'bun:test';
import { runPageStateMachine, validate } from '../src/ingest-core.js';
import { renderValidationBlock } from '../src/validation-output.js';

const turns = [
  { id:'q1', kind:'question', ts:1, text:'67페이지와 59페이지 비교' },
  { id:'a1', kind:'answer', ts:2, text:'답변' },
  { id:'q2', kind:'question', ts:3, text:'이어 설명' },
  { id:'a2', kind:'answer', ts:4, text:'답변' },
  { id:'q3', kind:'question', ts:5, text:'67페이지와 59페이지 비교' },
  { id:'a3', kind:'answer', ts:6, text:'답변' },
];
test('page choices use turn IDs and carry forward to page-less questions', () => {
  const state = runPageStateMachine(turns, { pageChoices: { q1:67, q3:59 } });
  expect(state.questions.map(q => q.page)).toEqual([67,67,59]);
  expect(state.questions[0].question.text).toBe('67페이지와 59페이지 비교');
  expect(() => runPageStateMachine(turns, { pageChoices: { q1:12 } })).toThrow();
});
test('dry run validation states that no files are written', () => {
  const block = renderValidationBlock(validate(turns), { dryRun:true });
  expect(block).toContain('저장하지 않');
  expect(block).not.toContain('저장: 진행');
});

test('actual save mode reports assessment separately from the write mode', () => {
  const block=renderValidationBlock(validate(turns), {dryRun:false});
  expect(block).toContain('실제 저장 모드');
  expect(block).toContain('검증 결과: 주의');
});
