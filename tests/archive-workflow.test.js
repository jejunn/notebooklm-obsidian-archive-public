import {expect,test} from 'bun:test';
import {runArchive,CONFIG} from '../src/userscript-main.js?workflow';
import {readFileSync} from 'node:fs';
const synthetic=JSON.parse(readFileSync(new URL('../fixtures/rpc/conversation.json',import.meta.url),'utf8'))[0];
const frame=(rpc,payload)=>{const s=JSON.stringify([['wrb.fr',rpc,JSON.stringify(payload),null,null,null,'generic']]);return `)]}'\n\n${s.length}\n${s}\n`;};
const html=`<script>window.WIZ_global_data={"SNlM0e":"${'a'.repeat(42)}","FdrFJe":"${'b'.repeat(19)}"};</script>`;

test('partial collection shows an alert and never prompts for vault access',async()=>{
  const alerts=[];const calls=[];
  const result=JSON.parse(await runArchive({html,href:`https://notebook.google.com/notebook/${CONFIG.notebookId}`,
    mode:'first',dryRun:false,notify:m=>alerts.push(m),confirm:()=>{throw new Error('must not confirm');},
    promptForApiKey:()=>{throw new Error('must not request key');},
    fetchImpl:async(_,r)=>{calls.push(r.method);return{ok:true,status:200,text:async()=>frame('khqZz',[synthetic,'NEXT'])};}}));
  expect(result.step).toBe('PARTIAL');expect(calls).toEqual(['POST']);
  expect(alerts).toHaveLength(1);expect(alerts[0]).toContain('400');expect(alerts[0]).toContain('저장하지 않았습니다');
});
test('new notebook candidate is explicitly previewed with first and last questions before approval',async()=>{
  const seen=[];const calls=[];
  const id=CONFIG.conversationId;
  const result=JSON.parse(await runArchive({html,href:'https://notebook.google.com/notebook/new-notebook?authuser=2',
    notebookId:'new-notebook',conversationId:null,mode:'review',course:'새 과목',lecture:3,dryRun:true,
    notify:()=>{},confirm:m=>{seen.push(m);return false;},
    promptForApiKey:()=>{throw new Error('must not request key');},
    fetchImpl:async(url,r)=>{const rpc=new URL(url).searchParams.get('rpcids');calls.push(rpc);
      const args=JSON.parse(JSON.parse(new URLSearchParams(r.body).get('f.req'))[0][0][1]);
      if(rpc==='hPTbtc'){expect(args[2]).toBe('new-notebook');return{ok:true,status:200,text:async()=>frame(rpc,[[[id]]])};}
      expect(args[3]).toBe(id);return{ok:true,status:200,text:async()=>frame(rpc,[synthetic])};}}));
  expect(calls).toEqual(['hPTbtc','khqZz']);expect(result.step).toBe('CANCELLED');
  expect(seen[0]).toContain('복습 추가');expect(seen[0]).toContain('시작 질문');expect(seen[0]).toContain('마지막 질문');
  expect(seen[0]).toContain('새 과목/3강.md');
});
test('mode must be chosen before collection and settings do not leak to later runs',async()=>{
  const before={...CONFIG};
  const result=JSON.parse(await runArchive({html,href:'https://notebook.google.com/notebook/n',mode:null,
    course:'새 과목',lecture:3,notify:()=>{},fetchImpl:async()=>{throw new Error('must not fetch');},confirm:()=>true}));
  expect(result.step).toBe('CONFIG');expect(CONFIG).toEqual(before);
});

test('main review mode appends a new conversation after confirmation and repeated run makes no PUT',async()=>{
  let existing=readFileSync(new URL('../fixtures/rpc/first-archive.md',import.meta.url),'utf8');
  const original=existing;
  const rows=structuredClone(synthetic.slice(0,2));
  rows[0][0]='new-answer';rows[1][0]='new-question';
  const requests=[];const previews=[];
  const options={html,href:`https://notebook.google.com/notebook/${CONFIG.notebookId}`,
    mode:'review',conversationId:'new-review-chat',dryRun:false,notify:()=>{},
    confirm:m=>{previews.push(m);return true;},promptForApiKey:()=> 'test-key',
    fetchImpl:async(_,r)=>{requests.push(r.method);
      if(r.method==='GET')return{status:200,text:async()=>existing};
      if(r.method==='PUT'){existing=r.body;return{status:204};}
      return{ok:true,status:200,text:async()=>frame('khqZz',[rows])};}};
  const result=JSON.parse(await runArchive(options));
  expect(result.step).toBe('DONE');expect(result.writeResult.newTurnCount).toBe(2);
  expect(previews[1]).toContain('새 복습 대화 전체');
  expect(existing).toContain('## 추가 질문');
  const body=text=>text.slice(text.indexOf('\n---',4)+4);
  expect(body(existing).startsWith(body(original))).toBe(true);
  const saved=existing;
  expect(JSON.parse(await runArchive(options)).step).toBe('NOOP');
  expect(existing).toBe(saved);expect(requests.filter(method=>method==='PUT')).toHaveLength(1);
});
