import { buildRequestUrl, extractRpcPayload, AdapterHardError } from './adapter.js';
import { readPageAuth, CONTENT_TYPE, REQUEST_TIMEOUT_MS, classifyStatus } from './userscript-entry.js';

export function notebookIdFromUrl(href) {
  const url=new URL(href);
  const match=/^\/notebook\/([^/]+)\/?$/.exec(url.pathname);
  if(url.origin!=='https://notebook.google.com' || !match) throw new AdapterHardError('NotebookLM 노트북 화면에서 실행하세요.');
  return decodeURIComponent(match[1]);
}

// This RPC supplies a candidate, not proof of which historical chat is on screen.
// runArchive must show first/last questions for explicit human confirmation.
export async function findConversationCandidate({html,href,notebookId,fetchImpl}) {
  const auth=readPageAuth(html,href);
  if(!auth.at || !auth.sid) throw new AdapterHardError('TOKEN_EXTRACTION_FAILED: page auth missing');
  const rpcId='hPTbtc';
  const inner=JSON.stringify([[],null,notebookId,1]);
  const body=new URLSearchParams({'f.req':JSON.stringify([[[rpcId,inner,null,'generic']]]),at:auth.at}).toString();
  let response;
  try {
    response=await fetchImpl(buildRequestUrl({notebookId,sid:auth.sid,authuser:auth.authuser,rpcId}),{
      method:'POST',credentials:'include',headers:{'Content-Type':CONTENT_TYPE},body,
      signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch { throw new AdapterHardError('conversation candidate request did not complete'); }
  if(!response.ok) throw new AdapterHardError(`${classifyStatus(response.status)}: conversation lookup failed`);
  let parsed;
  try { parsed=JSON.parse(extractRpcPayload(await response.text(),rpcId)); }
  catch { throw new AdapterHardError('conversation candidate response changed'); }
  const id=parsed?.[0]?.[0]?.[0];
  const row=parsed?.[0]?.[0];
  const timestamp=value=>Array.isArray(value) && value.length===2 && value.every(Number.isInteger);
  // Mac capture: [id, [created_seconds,nanos], [updated_seconds,nanos]].
  const knownRow=Array.isArray(row) && (row.length===1 ||
    (row.length===3 && timestamp(row[1]) && timestamp(row[2])));
  if(!Array.isArray(parsed) || parsed.length!==1 || !Array.isArray(parsed[0]) || parsed[0].length!==1 ||
    !knownRow ||
    typeof id!=='string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    throw new AdapterHardError('대화 후보를 확인하지 못했습니다. 질문이 있는 대화에서 다시 실행하세요.');
  }
  return id;
}
