// Vault writer — the single PUT into the Obsidian vault.
//
// Contract reference: implementation-contract.md section 6.4 ("파일 쓰기" and
// the "atomic write — 선택 A" decision); design spec section 16 ("Vault 쓰기
// 계약"), section 14 ("이 절차는 Obsidian REST 경로에서 실행되지 않는다").
//
// Everything measured here was measured against the plugin
// `Local REST API with MCP` 5.3.1 on 2026-10-05, and all three traps below
// were actually hit during that run. They are written down because each of them
// produces a failure that looks like a working tool:
//
//   - the `/vault/` prefix is required; without it the path is a 404
//   - `credentials: 'include'` fails, because the plugin sends ACAO `*` and a
//     wildcard origin is illegal with the credentials flag. Bearer auth makes
//     `omit` sufficient
//   - success is 204 No Content. Treating 200 or 201 as success reports a
//     working write as a failure
//
// The write is a single PUT, not a write-to-temp-then-rename (contract 6.4,
// option A). REST does not expose rename, and a single PUT already removes the
// risk 14 was defending against: if the request is cut, that request fails and
// the file keeps its previous content.

import { CoreHardError } from './ingest-core.js';

/** The HTTPS origin; the default port 27124 was already taken (design spec 16). */
export const VAULT_ORIGIN = 'https://localhost:27125';

/** The only status that means the vault accepted the file (contract 6.4). */
export const VAULT_SUCCESS_STATUS = 204;

/**
 * Build the vault URL for a path inside the vault.
 *
 * The `/vault/` prefix is part of the path and not decoration. A path that
 * already carries it is not doubled, so a caller can pass either form.
 *
 * Segments are percent-encoded, which keeps a course title containing a slash
 * or a space from silently creating a directory.
 *
 * @param {string} vaultPath a path relative to the vault root
 * @param {string} [origin]
 * @returns {string}
 */
export function buildVaultUrl(vaultPath, origin = VAULT_ORIGIN) {
  if (typeof vaultPath !== 'string' || vaultPath.trim().length === 0) {
    throw new CoreHardError('the vault path is empty');
  }
  const trimmed = vaultPath.trim().replace(/^\/+/, '').replace(/^vault\//, '');
  if (trimmed.length === 0) {
    throw new CoreHardError('the vault path is empty after stripping the prefix');
  }
  const encoded = trimmed
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${origin.replace(/\/+$/, '')}/vault/${encoded}`;
}

/**
 * Build the PUT request for one vault file.
 *
 * @param {{path: string, content: string, apiKey: string, origin?: string}} target
 * @returns {{url: string, method: string, headers: object, credentials: 'omit'}}
 */
export function buildVaultRequest({ path, content, apiKey, origin = VAULT_ORIGIN }) {
  if (typeof content !== 'string') {
    throw new CoreHardError('the file content must be a string');
  }
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    throw new CoreHardError('the vault write needs the plugin API key');
  }
  return {
    url: buildVaultUrl(path, origin),
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'text/markdown',
    },
    credentials: 'omit',
  };
}

/**
 * Write one file into the vault with a single PUT.
 *
 * `fetchImpl` is injected so the success/failure rule is testable without a
 * running Obsidian. The rule under test is the one that matters: 204 is
 * success and nothing else is. A 200 or 201 is reported as a failure, because
 * the plugin does not send those on a successful write and reading them as
 * success is how a broken write gets reported as a working tool.
 *
 * @param {{path: string, content: string, apiKey: string, origin?: string, fetchImpl?: typeof fetch}} target
 * @returns {Promise<{ok: boolean, status: number, url: string, reason: string|null}>}
 */
export async function writeVaultFile(target) {
  const { fetchImpl } = target;
  if (typeof fetchImpl !== 'function') {
    throw new CoreHardError('writeVaultFile needs an injected fetch implementation');
  }
  const request = buildVaultRequest(target);

  let response;
  try {
    response = await fetchImpl(request.url, {
      method: request.method,
      headers: request.headers,
      body: target.content,
      credentials: request.credentials,
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url: request.url,
      reason: `the request did not complete: ${error.message}`,
    };
  }

  if (response.status === VAULT_SUCCESS_STATUS) {
    return { ok: true, status: response.status, url: request.url, reason: null };
  }

  return {
    ok: false,
    status: response.status,
    url: request.url,
    reason:
      `status ${response.status} is not ${VAULT_SUCCESS_STATUS}; ` +
      'the vault did not accept the file',
  };
}