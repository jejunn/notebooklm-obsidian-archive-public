// Explicit save intent; conversation IDs are used only for duplicate detection.
import { CoreHardError, validateStructure, runPageStateMachine } from './ingest-core.js';
import { parseFrontmatter, hasAdditionalQuestionsSection, hasSessionDateHeading } from './delta-rules.js';
import { assembleFirstArchive, assembleReviewSession, yamlScalar } from './markdown-assembler.js';

export const SAVE_MODES = ['first', 'review'];
const fail = (reason) => { throw new CoreHardError(reason); };
const blocked = (reason) => ({action:'blocked',write:false,reason,newTurns:[]});

function readMetadata(content, request) {
  const { fields, order } = parseFrontmatter(content);
  for(const key of ['archive_conversation','archive_last_turn','archive_turns','course','lecture']) {
    if(order.filter(k=>k===key).length!==1 || !fields[key]) fail(`missing or duplicate ${key}`);
  }
  if(fields.course!==request.course || fields.lecture!==String(request.lecture)) fail('target metadata differs');
  if(order.filter(k=>k==='archive_review_sessions').length>1) fail('duplicate review ledger');
  let sessions=[];
  if(fields.archive_review_sessions!==undefined) {
    try { sessions=JSON.parse(fields.archive_review_sessions); } catch { fail('broken review ledger'); }
  }
  if(!Array.isArray(sessions)) fail('review ledger must be a list');
  const seen=new Set();
  for(const session of sessions) {
    if(!session || typeof session.conversationId!=='string' || !session.conversationId ||
      typeof session.lastTurnId!=='string' || !session.lastTurnId ||
      !Number.isInteger(session.turnCount) || session.turnCount<2 || seen.has(session.conversationId)) fail('invalid review anchor');
    seen.add(session.conversationId);
  }
  return {fields,sessions};
}

export function planModeSave(request) {
  const { mode, existingContent, turns, conversationId }=request;
  if(!SAVE_MODES.includes(mode)) fail('choose first or review explicitly');
  if(typeof conversationId!=='string' || !conversationId) fail('conversation ID is required');
  if(!turns.length || validateStructure(turns).some(e=>e.grade==='error')) fail('invalid conversation structure');
  const base={...request,newTurns:[],write:false};
  if(mode==='first') {
    if(existingContent!==null && existingContent!==undefined) return {...base,...blocked('파일이 이미 있습니다. 처음 저장은 기존 파일을 덮어쓰지 않습니다. 복습 추가를 선택하세요.')};
    return {...base,action:'first-archive',write:true};
  }
  if(existingContent===null || existingContent===undefined) return {...base,...blocked('복습을 추가할 기존 파일이 없습니다. 처음 저장을 선택하세요.')};
  const {fields,sessions}=readMetadata(existingContent,request);
  const saved=sessions.find(s=>s.conversationId===conversationId);
  const anchorId=saved?.lastTurnId ?? (fields.archive_conversation===conversationId ? fields.archive_last_turn : null);
  let position=-1;
  if(anchorId!==null) {
    position=turns.findIndex(t=>t.id===anchorId);
    if(position===-1) return {...base,...blocked('이미 저장한 대화의 마지막 메시지를 찾을 수 없습니다. 중복 방지를 위해 저장을 중단했습니다.')};
  }
  const newTurns=turns.slice(position+1);
  if(!newTurns.length) return {...base,action:'noop',sessions};
  if(validateStructure(newTurns).some(e=>e.grade==='error')) fail('anchor splits a question/answer pair');
  const initialPage=position>=0 ? runPageStateMachine(turns.slice(0,position+1)).groups.at(-1)?.page ?? null : null;
  return {...base,action:'append',write:true,newTurns,sessions,
    newConversation:anchorId===null,anchor:{turnId:anchorId,position:position+1},initialPage};
}

export function renderModeSave(plan, options) {
  if(!plan.write) return null;
  if(plan.action==='first-archive') return assembleFirstArchive(plan.turns,{
    ...options,conversationId:plan.conversationId,archivedDate:options.date,
  });
  const hasSection=hasAdditionalQuestionsSection(plan.existingContent);
  const fragment=assembleReviewSession(plan.newTurns,{
    ...options,initialPage:plan.initialPage,includeSection:!hasSection,
    includeDate:!hasSessionDateHeading(plan.existingContent,options.date),
  });
  const content=plan.existingContent+(hasSection?'\n\n':'\n\n---\n\n')+fragment;
  const sessions=plan.sessions.filter(s=>s.conversationId!==plan.conversationId);
  sessions.push({conversationId:plan.conversationId,lastTurnId:plan.newTurns.at(-1).id,turnCount:plan.turns.length});
  const end=content.indexOf('\n---',4);
  let header=content.slice(0,end);
  const line=`archive_review_sessions: ${yamlScalar(JSON.stringify(sessions))}`;
  header=/^archive_review_sessions[ \t]*:/m.test(header)
    ? header.replace(/^archive_review_sessions[ \t]*:.*$/m,()=>line) : header+'\n'+line;
  return header+content.slice(end);
}
