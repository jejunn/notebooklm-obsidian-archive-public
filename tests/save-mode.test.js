import { expect, test } from 'bun:test';
import { planModeSave, renderModeSave } from '../src/save-mode.js';
import { assembleFirstArchive } from '../src/markdown-assembler.js';
import { parseFrontmatter } from '../src/delta-rules.js';
const makeTurns = (prefix, pairs = 2) => Array.from({length:pairs*2}, (_,i) => ({
  id:`${prefix}-${i}`,ts:1791000000+i,kind:i%2?'answer':'question',
  text:i%2?'수식 \\(x^2\\)과 설명 [1].':`${i+1}페이지 설명해줘`,
}));
const initial = makeTurns('initial');
const review = makeTurns('review');
const options = { course:'예제 과목',lecture:2,date:'2026-10-10' };
const base = assembleFirstArchive(initial,{...options,conversationId:'initial-chat',archivedDate:options.date})+'\n직접 수정한 메모\n\n';
const request = (changes={}) => ({...options,mode:'review',existingContent:base,
  turns:review,conversationId:'review-chat',targetPath:'예제 과목/2강.md',...changes});
const body = text => text.slice(text.indexOf('\n---',4)+4);

test('first mode refuses every existing file even same conversation', () => {
  for(const existingContent of [base,'# 사용자 노트','']) {
    expect(planModeSave(request({mode:'first',existingContent})).write).toBe(false);
  }
  const plan=planModeSave(request({mode:'first',existingContent:null}));
  expect(plan.action).toBe('first-archive');
  expect(renderModeSave(plan,options)).toContain('# 2강');
});
test('mode must be explicit and review cannot create a missing file', () => {
  expect(()=>planModeSave(request({mode:undefined}))).toThrow();
  expect(planModeSave(request({existingContent:null})).write).toBe(false);
});
test('new review chat appends all its turns while preserving original metadata and edited body', () => {
  const plan=planModeSave(request());
  expect(plan.newTurns).toEqual(review);
  expect(plan.newConversation).toBe(true);
  const saved=renderModeSave(plan,options);
  expect(body(saved).startsWith(body(base))).toBe(true);
  expect(saved.match(/^##### Q$/gm)).toHaveLength(2);
  expect(saved).toContain('## 추가 질문\n\n### 2026-10-10\n\n#### 1페이지');
  const fields=parseFrontmatter(saved).fields;
  expect(fields.archive_conversation).toBe('initial-chat');
  expect(fields.archive_last_turn).toBe('initial-3');
  expect(fields.archive_turns).toBe('4');
  expect(JSON.parse(fields.archive_review_sessions)).toEqual([
    {conversationId:'review-chat',lastTurnId:'review-3',turnCount:4},
  ]);
  expect(saved).not.toContain('[1]');
});
test('repeat, continuation, and return to an older review all use that chat own anchor', () => {
  let saved=renderModeSave(planModeSave(request()),options);
  expect(planModeSave(request({existingContent:saved})).action).toBe('noop');
  const longer=makeTurns('review',3);
  longer[4].text='왜 그렇게 되나요?';
  let plan=planModeSave(request({existingContent:saved,turns:longer}));
  expect(plan.newTurns).toHaveLength(2);
  const next=renderModeSave(plan,options);
  expect(body(next).startsWith(body(saved))).toBe(true);
  expect(next.slice(saved.length)).toContain('#### 3페이지'); // inherits preceding explicit page
  saved=next;
  const other=makeTurns('other');
  saved=renderModeSave(planModeSave(request({existingContent:saved,turns:other,conversationId:'other-chat'})),options);
  expect(planModeSave(request({existingContent:saved,turns:longer})).action).toBe('noop');
  expect(saved.match(/^## 추가 질문$/gm)).toHaveLength(1);
  expect(saved.match(/^### 2026-10-10$/gm)).toHaveLength(1);
});
test('original chat can append in review mode using its synthetic anchor', () => {
  const plan=planModeSave(request({conversationId:'initial-chat',turns:makeTurns('initial',3)}));
  expect(plan.newTurns).toHaveLength(2);
});
test('missing saved review anchor blocks; it is not mistaken for a new chat', () => {
  const saved=renderModeSave(planModeSave(request()),options);
  const edited=review.map(t=>({...t,id:'changed-'+t.id}));
  expect(planModeSave(request({existingContent:saved,turns:edited})).write).toBe(false);
});
test('unknown file, wrong lecture, broken ledger, and duplicate metadata fail closed', () => {
  const saved=renderModeSave(planModeSave(request()),options);
  for(const existingContent of ['# 기존 메모',base.replace('lecture: 2','lecture: 3'),
    saved.replace(/^archive_review_sessions:.*$/m,'archive_review_sessions: broken'),
    base.replace('archive_last_turn:', 'archive_last_turn: duplicate\narchive_last_turn:')]) {
    expect(()=>planModeSave(request({existingContent}))).toThrow();
  }
});
