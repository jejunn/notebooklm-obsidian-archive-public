// The DOM wiring, and the only file that talks to the page.
//
// Everything it calls is tested. What is not tested is this file's own use of
// `document`, `window.confirm`, and the settings block — that is what the Mac
// run is for. The separation is deliberate: the parts that could be wrong in a
// subtle way are all offline, and the parts that need a logged-in browser are
// all obvious.
//
// Built into a single-file userscript by tools/build-userscript.js. The content
// world cannot import module files, so bundling is what makes the tested modules
// reachable from a browser at all.

import { collectConversation, describeFailure } from './userscript-entry.js';
import { runValidationPipeline } from './validation-output.js';
import { formatTimestamp } from './markdown-assembler.js';
import { saveArchive } from './archive-save.js';
import { VAULT_ORIGIN } from './vault-writer.js';
import { findConversationCandidate, notebookIdFromUrl } from './conversation-selection.js';
import { requestSaveOptions, validateSaveOptions } from './archive-options.js';

// ---------------------------------------------------------------------------
// Defaults for the options dialog and injected test runs. The browser reads
// the notebook from its URL, fetches a recent conversation candidate, and asks
// the user to confirm its first and last questions before accessing the vault.
// The dialog suggests the course from the current notebook title's brackets.
// Lecture starts blank; course, lecture, and save mode are confirmed there.
//
// The API key is deliberately left blank here and asked for at run time. A key
// typed into a script file ends up in the extension's storage and in any copy
// of the file, and this script never needs it stored to work.
// ---------------------------------------------------------------------------

export const CONFIG = {
  notebookId: '00000000-0000-4000-8000-000000000004',
  conversationId: '00000000-0000-4000-8000-000000000002',
  course: '',
  lecture: null,
  limit: 400,                // 400 turn items, roughly 200 question/answer pairs
  sourceLabel: '',
  vaultOrigin: VAULT_ORIGIN,
  // Initial value of the dialog's validation-only checkbox. Uncheck it there
  // to save; editing this file is not required.
  dryRun: true,
};

/** Apply defaults at run time. Used by injected tests. */
export function setConfig(overrides = {}) {
  Object.assign(CONFIG, overrides);
  return CONFIG;
}

const REQUIRED = ['notebookId', 'course'];

function missingConfig(config) {
  const missing = REQUIRED.filter((key) => !config[key]);
  if (config.conversationId !== null && !config.conversationId) missing.push('conversationId');
  if (!Number.isInteger(config.lecture) || config.lecture < 1) missing.push('lecture');
  if (!Number.isInteger(config.limit) || config.limit < 200) missing.push('limit(>=200)');
  return missing;
}

function report(value) {
  // One object per line, in the shape the 2026-10-07 recording used, so a Mac
  // run can be compared against it directly.
  const line = JSON.stringify(value);
  console.log('[nbm-archive] ' + line);
  return line;
}

/**
 * The end-to-end run, with the page as the only ambient input.
 *
 * `confirm` is injected for the same reason `fetchImpl` is: the ordering rule in
 * design spec 10 — the validation block reaches the human before a file exists —
 * is worth testing offline, and it is the one rule here with a real failure mode
 * (writing without asking).
 */
export async function runArchive({
  html,
  href,
  fetchImpl = fetch,
  confirm = typeof window === 'undefined' ? () => false : window.confirm.bind(window),
  promptForApiKey = typeof window === 'undefined' ? () => null : window.prompt.bind(window),
  notify = typeof window === 'undefined' ? () => {} : window.alert.bind(window),
  mode,
  notebookId = CONFIG.notebookId,
  conversationId = CONFIG.conversationId,
  course = CONFIG.course,
  lecture = CONFIG.lecture,
  dryRun = CONFIG.dryRun,
  now = new Date(),
}) {
  const cfg = { ...CONFIG, mode, notebookId, conversationId, course, lecture, dryRun };
  const missing = missingConfig(cfg);
  if (missing.length > 0) {
    return report({ step: 'CONFIG', verdict: 'CONFIG_INCOMPLETE', missing });
  }
  try { Object.assign(cfg, validateSaveOptions(cfg)); }
  catch(error) { notify(error.message); return report({step:'CONFIG',verdict:'CONFIG_INCOMPLETE'}); }
  const candidate = cfg.conversationId === null;
  if (candidate) {
    try { cfg.conversationId = await findConversationCandidate({html,href,notebookId:cfg.notebookId,fetchImpl}); }
    catch(error) { notify('대화를 조회하지 못했습니다. 질문이 있는 NotebookLM 화면에서 다시 실행하세요.');
      return report({step:'COLLECT',verdict:'CONVERSATION_LOOKUP_FAILED',detail:error.message}); }
  }

  const collected = await collectConversation({
    html,
    href,
    notebookId: cfg.notebookId,
    conversationId: cfg.conversationId,
    limit: cfg.limit,
    fetchImpl,
  }).catch((error) => {
    const out = describeFailure(error, []);
    report({ step: 'COLLECT', ...out });
    return null;
  });
  if (collected === null) return null;

  report({
    step: 'COLLECT',
    turnCount: collected.turns.length,
    exhausted: collected.exhausted,
    nextPageTokenPresent: collected.nextPageTokenPresent,
    pagination: collected.paginationLine,
  });

  if (!collected.exhausted) {
    // Not an error, and deliberately not "전체 조회" either. Design spec 4
    // reserves that wording for a confirmed token exhaustion, and the page-2
    // request shape is still unknown, so the run stops here and says why.
    notify(`조회 한도 ${cfg.limit}개 안에 대화 전체를 가져오지 못했습니다.\n일부 내용만 저장하지 않도록 저장을 중단했습니다.\nObsidian에는 저장하지 않았습니다. 긴 대화 처리는 별도 개선이 필요합니다.`);
    return report({
      step: 'PARTIAL',
      verdict: 'PAGINATION_UNPROVEN',
      turnCount: collected.turns.length,
      detail:
        'a next-page token came back and the page-2 request shape is unproven ' +
        '(the one recorded attempt used token_param_index: 1 and repeated all ' +
        '100 rows of page 1). Nothing was written.',
    });
  }

  const vaultPath = `${cfg.course}/${cfg.lecture}강.md`;
  let approved = false;

  const pipeline = await runValidationPipeline({
    turns: collected.turns,
    course: cfg.course,
    lecture: cfg.lecture,
    selectedLecture: cfg.lecture,
    filePath: vaultPath,
    pagination: {
      turnCount: collected.turns.length,
      pageCount: 1,
      limit: cfg.limit,
      exhausted: collected.exhausted,
    },
    exhausted: collected.exhausted,
    limit: cfg.limit,
    beforeWrite: ({ result, block }) => {
      report({
        step: 'VALIDATION',
        saveBlocked: false,
        writeAttempted: false,
        errors: result.errors.length,
        warnings: result.warnings.length,
        infos: result.infos.length,
        counts: result.counts,
        reason: null,
      });
      const questions = collected.turns.filter(turn => turn.kind === 'question');
      const preview = `저장 방식: ${cfg.mode === 'first' ? '처음 저장' : '복습 추가'}\n` +
        (candidate ? '최근 대화 후보를 조회했습니다. 지금 저장하려는 대화인지 아래 질문을 확인하세요.\n' : '') +
        `시작 질문: ${questions[0]?.text.slice(0,160) ?? '(없음)'}\n` +
        `마지막 질문: ${questions.at(-1)?.text.slice(0,160) ?? '(없음)'}\n\n`;
      approved = confirm(preview + block);
      return approved;
    },
    write: async () => {
      if (cfg.dryRun) {
        return { ok: true, status: 0, url: null, reason: 'dryRun: nothing was written' };
      }
      const apiKey = promptForApiKey('Obsidian Local REST API key');
      if (!apiKey) {
        return { ok: false, status: 0, url: null, reason: 'no API key was given' };
      }
      return saveArchive({
        mode: cfg.mode,
        path: vaultPath,
        turns: collected.turns,
        course: cfg.course,
        lecture: cfg.lecture,
        conversationId: cfg.conversationId,
        date: formatTimestamp(Math.floor(now.getTime() / 1000)).slice(0, 10),
        apiKey,
        origin: cfg.vaultOrigin,
        fetchImpl,
        confirm,
      });
    },
  });

  if (pipeline.saveBlocked) {
    report({
      step: 'VALIDATION',
      saveBlocked: pipeline.saveBlocked,
      writeAttempted: pipeline.writeAttempted,
      errors: pipeline.result.errors.length,
      warnings: pipeline.result.warnings.length,
      infos: pipeline.result.infos.length,
      counts: pipeline.result.counts,
      reason: pipeline.reason,
    });
    confirm(pipeline.block);
    return report({ step: 'BLOCKED', writeResult: null });
  }

  if (!approved) {
    return report({ step: 'CANCELLED', verdict: 'CANCELLED', writeResult: pipeline.writeResult });
  }

  const action = pipeline.writeResult?.action;
  const step = action === 'noop' ? 'NOOP' : action === 'cancelled' ? 'CANCELLED'
    : pipeline.writeResult?.ok ? 'DONE' : 'BLOCKED';
  if (step !== 'CANCELLED') notify(step === 'NOOP' ? '추가할 새 질문이 없습니다. 기존 파일을 유지했습니다.'
    : step === 'BLOCKED' ? `저장하지 않았습니다.\n${pipeline.writeResult?.reason ?? '저장 조건을 확인하세요.'}`
    : cfg.dryRun ? '검증을 완료했습니다. 검증만 실행하여 Obsidian에는 저장하지 않았습니다.'
    : `${vaultPath}\n${cfg.mode === 'first' ? '처음 저장' : '복습 추가'}를 완료했습니다.`);
  return report({ step, writeResult: pipeline.writeResult });
}

// ---------------------------------------------------------------------------
// Page entry point
// ---------------------------------------------------------------------------

function boot() {
  if (typeof document === 'undefined') return;
  if (!document.body) return;
  if (location.pathname.indexOf('/notebook/') === -1) return;

  // The verified script surfaced CSP violations as a verdict. Keep that: a
  // silent block looks exactly like an auth failure otherwise.
  const onCsp = (event) => {
    if (String(event.blockedURI).includes('/_/LabsTailwindUi/data/batchexecute')) {
      report({
        step: 'CSP',
        directive: event.effectiveDirective,
        disposition: event.disposition,
      });
    }
  };
  document.addEventListener('securitypolicyviolation', onCsp);

  // Reuse one button rather than firing on load: an archive run must be
  // something the user starts, on a page that is already logged in.
  const button = document.createElement('button');
  button.textContent = 'NotebookLM archive';
  button.style.cssText =
    'position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:10px 14px;' +
    'border-radius:8px;border:1px solid #888;background:#fff;color:#111;cursor:pointer;';
  const start = async () => {
    if (button.disabled) return;
    button.disabled = true;
    try {
      const options = await requestSaveOptions(document, CONFIG);
      if (options) await runArchive({ ...options, html: document.documentElement.outerHTML,
        href: location.href, notebookId: notebookIdFromUrl(location.href), conversationId: null });
    } catch {
      window.alert('아카이브 실행을 완료하지 못했습니다. 다시 시도하세요.');
    } finally {
      button.disabled = false;
    }
  };
  button.addEventListener('click', start);
  document.body.appendChild(button);

  // Also callable from the console, which is how a Mac run drives it by hand.
  window.__nbmArchive = start;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
