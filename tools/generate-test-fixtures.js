// Portable wire fixtures: all content, IDs, and page tokens below are synthetic.
// No browser session, private conversation, or Obsidian vault is read.
import { mkdirSync, writeFileSync } from 'node:fs';
import { normalizeTurns } from '../src/adapter.js';
import { assembleFirstArchive } from '../src/markdown-assembler.js';

const directory = new URL('../fixtures/rpc/', import.meta.url);
mkdirSync(directory, {recursive:true});
const chronological=[];
for(let index=0; index<87; index++) {
  const timestamp=1790583290+index*20;
  const question=index===0 ? '1강 개요를 설명해줘.'
    : index===1 ? '1강 말고 2강 2페이지 설명해줘.'
    : `2강 ${index+1}페이지 예제를 설명해줘.`;
  const answer=[20,40].includes(index) ? ''
    : String.raw`예제 답변 [1, 2]. 변수 \\(\alpha\\)와 방향 \\(\rightarrow\\)을 설명합니다.

| 항목 | 예제 수식 |
|---|---|
| 단위 | \\(\left[\text{A/cm}^2\right]\\) |

\\[y = \alpha x\\]`;
  chronological.push([`synthetic-q-${index}`,[timestamp,0],1,question,null,2]);
  chronological.push([`synthetic-a-${index}`,[timestamp+10,0],2,null,
    [[answer,null,['synthetic-conversation','synthetic-conversation',0],null,
      [null,null,null,[['synthetic-citation']]]]],2]);
}
const turns=chronological.reverse();
const partial=[turns.slice(0,100),'SYNTHETIC_NEXT_PAGE'];
const frame=JSON.stringify([['wrb.fr','khqZz',JSON.stringify(partial),null,null,null,'generic']]);
writeFileSync(new URL('conversation.json',directory),JSON.stringify([turns],null,2)+'\n');
writeFileSync(new URL('partial-conversation.json',directory),JSON.stringify(partial,null,2)+'\n');
writeFileSync(new URL('partial-response.txt',directory),`)]}'\n\n${frame.length+2}\n${frame}\n`);
const note=assembleFirstArchive(normalizeTurns(turns),{
  course:'예제 과목',lecture:2,
  conversationId:'00000000-0000-4000-8000-000000000002',archivedDate:'2026-10-10',
});
writeFileSync(new URL('first-archive.md',directory),note+'\n사용자가 직접 남긴 예제 메모\n');
console.log('Generated 174 synthetic turns and a matching archive; no private data was read.');
