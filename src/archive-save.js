// Read the current note before making a save decision. Failed reads never mean
// absence, and a second read protects edits made while the preview was open.
import { planModeSave, renderModeSave } from './save-mode.js';
import { buildVaultUrl, writeVaultFile } from './vault-writer.js';

export async function readVaultFile({ path, apiKey, origin, fetchImpl }) {
  const url = buildVaultUrl(path, origin);
  try {
    const response = await fetchImpl(url, {
      method: 'GET', headers: { Authorization: `Bearer ${apiKey}`, Accept: 'text/markdown' },
      credentials: 'omit', cache: 'no-store',
    });
    if (response.status === 404) return { ok: true, content: null, status: 404, url };
    if (response.status !== 200) return { ok: false, status: response.status, url, reason: `vault read status ${response.status}` };
    const content = await response.text();
    if (typeof content !== 'string') throw new Error('non-text response');
    return { ok: true, content, status: 200, url };
  } catch {
    // Do not include transport exceptions: they can contain credential-bearing URLs.
    return { ok: false, status: 0, url, reason: 'vault read did not complete' };
  }
}

export async function saveArchive(options) {
  const initial = await readVaultFile(options);
  if (!initial.ok) return initial;
  let plan;
  let content;
  try {
    plan = planModeSave({ ...options, existingContent: initial.content, targetPath: options.path });
    if (plan.action === 'noop') return { ok: true, status: 0, url: initial.url,
      action: 'noop', newTurnCount: 0, reason: '추가할 새 질문 없음; 기존 파일 유지' };
    if (!plan.write) return { ok: false, status: 0, url: initial.url, action: 'blocked', reason: plan.reason };
    content = renderModeSave(plan, options);
  } catch {
    return { ok: false, status: 0, url: initial.url, action: 'blocked',
      reason: '기존 노트의 메타데이터 또는 추가할 질문 구조를 확인할 수 없어 저장을 중단했습니다.' };
  }
  const newTurnCount = plan.action === 'append' ? plan.newTurns.length : options.turns.length;
  const message = plan.action === 'append'
    ? `복습 추가: ${options.path}\n${plan.newConversation ? '새 복습 대화 전체를 추가합니다.' : '이미 저장한 대화의 신규 질문만 추가합니다.'}\n기존 본문 유지, 신규 ${newTurnCount} turn을 추가 질문에 저장합니다.\n저장할까요?`
    : `${options.path}\n새 파일에 ${newTurnCount} turn을 저장합니다.\n저장할까요?`;
  if (!options.confirm(message)) return { ok: false, status: 0, url: initial.url,
    action: 'cancelled', reason: 'save preview cancelled' };
  const latest = await readVaultFile(options);
  if (!latest.ok) return latest;
  if (latest.content !== initial.content) return { ok: false, status: 0, url: initial.url,
    action: 'blocked', reason: 'target changed during preview; rerun without overwriting edits' };
  return { ...await writeVaultFile({ ...options, content }), action: plan.action, newTurnCount };
}
