import { expect, test } from 'bun:test';
import { findConversationCandidate, notebookIdFromUrl } from '../src/conversation-selection.js';
const id='00000000-0000-4000-8000-000000000002';
const html=`<script>window.WIZ_global_data={"SNlM0e":"${'a'.repeat(42)}","FdrFJe":"${'b'.repeat(19)}"};</script>`;
const frame = payload => { const s=JSON.stringify([['wrb.fr','hPTbtc',JSON.stringify(payload),null,null,null,'generic']]);return `)]}'\n\n${s.length}\n${s}\n`; };
test('notebook comes from current URL, not the old test notebook', () => {
  expect(notebookIdFromUrl('https://notebook.google.com/notebook/new-notebook?authuser=1')).toBe('new-notebook');
  expect(()=>notebookIdFromUrl('https://other.example/notebook/old')).toThrow();
});
test('candidate request is read-only and uses current notebook/authuser', async () => {
  const result=await findConversationCandidate({html,href:'https://notebook.google.com/notebook/new-notebook?authuser=2',
    notebookId:'new-notebook',fetchImpl:async(url,request)=>{
      expect(new URL(url).searchParams.get('rpcids')).toBe('hPTbtc');
      expect(new URL(url).searchParams.get('authuser')).toBe('2');
      expect(request.credentials).toBe('include');
      const f=JSON.parse(new URLSearchParams(request.body).get('f.req'));
      expect(JSON.parse(f[0][0][1])).toEqual([[],null,'new-notebook',1]);
      return {ok:true,status:200,text:async()=>frame([[[id]]])};
    }});
  expect(result).toBe(id);
});
test('unknown candidate response or missing auth blocks rather than using the old ID', async () => {
  for(const payload of [[],[['not-a-uuid']],[[[id,id]]]]) {
    await expect(findConversationCandidate({html,href:'https://notebook.google.com/notebook/n',notebookId:'n',
      fetchImpl:async()=>({ok:true,status:200,text:async()=>frame(payload)})})).rejects.toThrow();
  }
  await expect(findConversationCandidate({html:'',href:'https://notebook.google.com/notebook/n',notebookId:'n',
    fetchImpl:async()=>{throw new Error('must not fetch');}})).rejects.toThrow();
});

test('live Safari candidate row includes created and updated timestamps', async () => {
  expect(await findConversationCandidate({html,href:'https://notebook.google.com/notebook/n',notebookId:'n',
    fetchImpl:async()=>({ok:true,status:200,text:async()=>frame([[[id,[1791000000,0],[1791000100,0]]]])})})).toBe(id);
});
