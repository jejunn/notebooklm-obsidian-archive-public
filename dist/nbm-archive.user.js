// ==UserScript==
// @name         nbm-archive
// @version      0.1.4
// @description  Archive one NotebookLM conversation into an Obsidian vault note
// @match        https://notebook.google.com/*
// @inject-into  content
// @run-at       document-idle
// @noframes
// @grant        none
// ==/UserScript==
// Choose course, lecture, and first/review mode in the archive dialog.
// The notebook URL supplies its ID; confirm the recent conversation candidate.
// Uncheck validation-only in the dialog to save to Obsidian.
// CONFIG starts at line 1768 of the bundle below.
// ---------------------------------------------------------------------------
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toCommonJS = (from) => {
    var entry = (__moduleCache ??= new WeakMap).get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function") {
      for (var key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(entry, key))
          __defProp(entry, key, {
            get: __accessProp.bind(from, key),
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
          });
    }
    __moduleCache.set(from, entry);
    return entry;
  };
  var __moduleCache;
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };

  // src/userscript-main.js
  var exports_userscript_main = {};
  __export(exports_userscript_main, {
    CONFIG: () => CONFIG,
    runArchive: () => runArchive,
    setConfig: () => setConfig
  });

  // src/ingest-core.js
  class CoreHardError extends Error {
    constructor(message) {
      super(message);
      this.name = "CoreHardError";
    }
  }
  function extractAnswerBody(wireAnswerPart) {
    if (!Array.isArray(wireAnswerPart)) {
      throw new CoreHardError("answer turn[4][0] is not an array; the wire path is broken (§1.4)");
    }
    const body = wireAnswerPart[0];
    if (typeof body !== "string") {
      throw new CoreHardError("answer turn[4][0][0] is not a string; the wire path is broken (§1.4)");
    }
    return body;
  }
  var PAGE_REFERENCE = /(\d+(?:\s*,\s*\d+)*)\s*페이지/g;
  var LECTURE_PREFIX = /^[\s]*(\d+)\s*강/;
  function toNumbers(digits) {
    return digits.split(",").map((part) => part.trim()).filter((part) => part.length > 0).map((part) => Number.parseInt(part, 10));
  }
  function extractPageReference(questionText) {
    if (typeof questionText !== "string") {
      throw new CoreHardError("question text is not a string (§1.4)");
    }
    const pages = [];
    PAGE_REFERENCE.lastIndex = 0;
    let match;
    while ((match = PAGE_REFERENCE.exec(questionText)) !== null) {
      pages.push(...toNumbers(match[1]));
      if (match.index === PAGE_REFERENCE.lastIndex) {
        PAGE_REFERENCE.lastIndex += 1;
      }
    }
    const lectureMatch = LECTURE_PREFIX.exec(questionText);
    return {
      page: pages.length > 0 ? pages[pages.length - 1] : null,
      pages,
      matchCount: pages.length,
      lecture: lectureMatch ? Number.parseInt(lectureMatch[1], 10) : null,
      multiPage: pages.length > 1
    };
  }
  function detectOtherLecture(questionText, selectedLecture) {
    const { lecture } = extractPageReference(questionText);
    if (lecture === null)
      return null;
    if (selectedLecture === null || selectedLecture === undefined)
      return null;
    return lecture === selectedLecture ? null : lecture;
  }
  function runPageStateMachine(turns, { initialPage = null, pageChoices = {} } = {}) {
    assertTurnArray(turns);
    const groups = [];
    const questions = [];
    const byTurnId = new Map;
    if (initialPage !== null && (!Number.isInteger(initialPage) || initialPage < 1)) {
      throw new CoreHardError("initial page must be a positive integer");
    }
    let currentPage = initialPage;
    let currentGroup = null;
    let pending = null;
    const openGroup = (page) => {
      const group = {
        page,
        unclassified: page === null,
        items: []
      };
      groups.push(group);
      currentGroup = group;
      return group;
    };
    for (const turn of turns) {
      if (turn.kind === "question") {
        const reference = extractPageReference(turn.text);
        let page = reference.page;
        if (Object.hasOwn(pageChoices, turn.id)) {
          const distinct = [...new Set(reference.pages)];
          if (distinct.length < 2 || !distinct.includes(pageChoices[turn.id])) {
            throw new CoreHardError("page choice must be one of the distinct referenced pages");
          }
          page = pageChoices[turn.id];
        }
        if (page !== null) {
          openGroup(page);
          currentPage = page;
        } else if (currentGroup === null || currentPage === null) {
          if (currentGroup === null)
            openGroup(currentPage);
        }
        pending = {
          question: turn,
          page: currentPage,
          inherited: reference.page === null,
          reference,
          answer: null
        };
        questions.push(pending);
        byTurnId.set(turn.id, pending);
        currentGroup.items.push(pending);
      } else {
        if (pending) {
          pending.answer = turn;
          byTurnId.set(turn.id, pending);
        }
      }
    }
    return { groups, questions, byTurnId };
  }
  var GRADE_ERROR = "error";
  var GRADE_WARNING = "warning";
  var GRADE_INFO = "info";
  function entry(grade, category, message, details = {}) {
    return { grade, category, message, ...details };
  }
  function validateStructure(turns) {
    assertTurnArray(turns);
    const entries = [];
    const ids = new Map;
    for (const turn of turns) {
      if (ids.has(turn.id)) {
        entries.push(entry(GRADE_ERROR, "duplicate turn id", `turn ID appears more than once in the list: ${turn.id}`, { turnId: turn.id }));
      } else {
        ids.set(turn.id, turn);
      }
    }
    let expected = "question";
    for (let i = 0;i < turns.length; i += 1) {
      if (turns[i].kind !== expected) {
        entries.push(entry(GRADE_ERROR, "alternation", `turn ${i} has kind ${turns[i].kind} where ${expected} was required; ` + "question and answer turns must alternate", { index: i, turnId: turns[i].id }));
      }
      expected = turns[i].kind === "question" ? "answer" : "question";
    }
    for (let i = 0;i < turns.length; i += 1) {
      if (turns[i].kind === "question" && turns[i + 1]?.kind !== "answer") {
        entries.push(entry(GRADE_ERROR, "unpaired question", `question at turn ${i} is not followed by an answer; the pair count is broken`, { index: i, turnId: turns[i].id }));
      }
    }
    const textCounts = new Map;
    for (const turn of turns) {
      if (turn.kind !== "question")
        continue;
      textCounts.set(turn.text, (textCounts.get(turn.text) ?? 0) + 1);
    }
    const repeated = [...textCounts.entries()].filter(([, n]) => n > 1);
    if (repeated.length > 0) {
      entries.push(entry(GRADE_INFO, "duplicate preserved", `repeated question text kept as separate turns: ${repeated.length}`, { questions: repeated.map(([text, count]) => ({ text, count })) }));
    }
    return entries;
  }
  function validatePages(turns, options = {}) {
    assertTurnArray(turns);
    const { selectedLecture = null, exhausted = null, limit = null } = options;
    const entries = [];
    const emptyAnswers = [];
    const multiPage = [];
    const otherLecture = [];
    const unclassified = [];
    const pageSet = new Set;
    for (let i = 0;i < turns.length; i += 1) {
      const turn = turns[i];
      if (turn.kind === "question") {
        const reference = extractPageReference(turn.text);
        if (reference.multiPage) {
          multiPage.push({ text: turn.text, ts: turn.ts, pages: reference.pages });
        }
        const other = detectOtherLecture(turn.text, selectedLecture);
        if (other !== null) {
          otherLecture.push({ text: turn.text, ts: turn.ts, lecture: other });
        }
      } else if (turn.text === "") {
        const question = findPrecedingQuestion(turns, i);
        emptyAnswers.push({
          questionText: question ? question.text : null,
          answerTs: turn.ts,
          answerTurnId: turn.id
        });
      }
    }
    const state = runPageStateMachine(turns, { pageChoices: options.pageChoices });
    for (const question of state.questions) {
      if (question.page === null) {
        unclassified.push({ text: question.question.text, ts: question.question.ts });
      } else {
        pageSet.add(question.page);
      }
    }
    if (multiPage.length > 0) {
      entries.push(entry(GRADE_WARNING, "multi-page reference", `multiple page references in one question: ${multiPage.length}`, { questions: multiPage.map((q) => ({ text: q.text, pages: q.pages })) }));
    }
    if (otherLecture.length > 0) {
      entries.push(entry(GRADE_WARNING, "other-lecture", `questions naming another lecture: ${otherLecture.length}`, {
        lecture: otherLecture[0].lecture,
        questions: otherLecture.map((q) => ({ text: q.text, ts: q.ts, lecture: q.lecture }))
      }));
    }
    if (unclassified.length > 0) {
      entries.push(entry(GRADE_WARNING, "unclassified", `unclassified questions: ${unclassified.length}`, { questions: unclassified }));
    }
    if (emptyAnswers.length > 0) {
      entries.push(entry(GRADE_WARNING, "empty answer", `empty answers: ${emptyAnswers.length}; the answer heading is kept`, { answers: emptyAnswers }));
    }
    if (exhausted === false) {
      entries.push(entry(GRADE_WARNING, "pagination", "not the whole conversation: a pagination token is still present", { limit }));
    } else if (exhausted === true) {
      entries.push(entry(GRADE_INFO, "pagination", "whole conversation confirmed", {
        turnCount: turns.length,
        limit
      }));
    }
    return {
      entries,
      counts: {
        turns: turns.length,
        questions: turns.filter((t) => t.kind === "question").length,
        answers: turns.filter((t) => t.kind === "answer").length,
        emptyAnswers: emptyAnswers.length,
        pages: pageSet.size,
        unclassified: unclassified.length,
        multiPage: multiPage.length,
        otherLecture: otherLecture.length
      }
    };
  }
  function validate(turns, options = {}) {
    assertTurnArray(turns);
    const structural = validateStructure(turns);
    const { entries: pageEntries, counts } = validatePages(turns, options);
    const entries = [...structural, ...pageEntries];
    const errors = entries.filter((e) => e.grade === GRADE_ERROR);
    const warnings = entries.filter((e) => e.grade === GRADE_WARNING);
    const infos = entries.filter((e) => e.grade === GRADE_INFO);
    return {
      saveBlocked: errors.length > 0,
      errors,
      warnings,
      infos,
      entries,
      counts,
      groups: runPageStateMachine(turns, { pageChoices: options.pageChoices }).groups,
      pairs: runPageStateMachine(turns, { pageChoices: options.pageChoices }).questions
    };
  }
  function assertTurnArray(turns) {
    if (!Array.isArray(turns)) {
      throw new CoreHardError("turns is not an array (§1.2)");
    }
    for (const turn of turns) {
      if (turn === null || typeof turn !== "object") {
        throw new CoreHardError("a turn is not an object (§1.2)");
      }
      if (typeof turn.id !== "string" || turn.id.length === 0) {
        throw new CoreHardError("a turn has no string id (§1.2)");
      }
      if (!Number.isInteger(turn.ts)) {
        throw new CoreHardError(`turn ${turn.id} has no integer ts (§1.2)`);
      }
      if (turn.kind !== "question" && turn.kind !== "answer") {
        throw new CoreHardError(`turn ${turn.id} has kind ${turn.kind} (§1.2)`);
      }
      if (typeof turn.text !== "string") {
        throw new CoreHardError(`turn ${turn.id} has non-string text (§1.2)`);
      }
    }
  }
  function findPrecedingQuestion(turns, index) {
    for (let i = index - 1;i >= 0; i -= 1) {
      if (turns[i].kind === "question")
        return turns[i];
    }
    return null;
  }

  // src/adapter.js
  class AdapterHardError extends CoreHardError {
    constructor(message) {
      super(message);
      this.name = "AdapterHardError";
    }
  }
  var RPC_ID = "khqZz";
  var RPC_PATH = "/_/LabsTailwindUi/data/batchexecute";
  var RPC_ORIGIN = "https://notebook.google.com";
  var DEFAULT_LIMIT = 200;
  var WIRE_KIND = Object.freeze({ 1: "question", 2: "answer" });
  var NEWEST_FIRST_HEAD = "answer";
  var XSSI_PREFIX = ")]}'";
  var FRAME_COUNT_OFFSET = 2;
  function stripXssiPrefix(text) {
    if (typeof text !== "string") {
      throw new AdapterHardError(`batchexecute response body is not a string: ${typeof text}`);
    }
    if (!text.startsWith(XSSI_PREFIX)) {
      throw new AdapterHardError(`batchexecute response does not start with the ${XSSI_PREFIX} guard prefix`);
    }
    return text.slice(XSSI_PREFIX.length);
  }
  function parseBatchExecuteFrames(text) {
    const body = stripXssiPrefix(text);
    const bytes = new TextEncoder().encode(body);
    const decoder = new TextDecoder("utf-8");
    const frames = [];
    let offset = 0;
    while (offset < bytes.length) {
      if (bytes[offset] === 10) {
        offset += 1;
        continue;
      }
      const headerEnd = bytes.indexOf(10, offset);
      if (headerEnd === -1) {
        throw new AdapterHardError("batchexecute frame is missing its length line; the envelope changed");
      }
      const header = decoder.decode(bytes.subarray(offset, headerEnd)).trim();
      if (!/^\d+$/.test(header)) {
        throw new AdapterHardError(`batchexecute frame header is not a length: ${JSON.stringify(header)}`);
      }
      const start = headerEnd + 1;
      const end = bytes.indexOf(10, start);
      const stop = end === -1 ? bytes.length : end;
      const payloadBytes = bytes.subarray(start, stop);
      const payload = decoder.decode(payloadBytes);
      const declared = Number.parseInt(header, 10);
      const utf16Units = payload.length;
      if (declared < utf16Units || declared > utf16Units + FRAME_COUNT_OFFSET) {
        throw new AdapterHardError(`batchexecute frame declares ${declared} but the payload has ` + `${utf16Units} UTF-16 units; the framing changed`);
      }
      try {
        frames.push(JSON.parse(payload));
      } catch (error) {
        throw new AdapterHardError(`batchexecute frame is not valid JSON: ${error.message}`);
      }
      offset = end === -1 ? bytes.length : end + 1;
    }
    return frames;
  }
  function extractRpcPayload(text, rpcId = RPC_ID) {
    for (const frame of parseBatchExecuteFrames(text)) {
      if (!Array.isArray(frame))
        continue;
      for (const entry of frame) {
        if (!Array.isArray(entry) || entry.length < 3)
          continue;
        if (entry[0] !== "wrb.fr" || entry[1] !== rpcId)
          continue;
        if (typeof entry[2] !== "string") {
          throw new AdapterHardError(`wrb.fr frame for ${rpcId} does not carry a string payload`);
        }
        return entry[2];
      }
    }
    throw new AdapterHardError(`no wrb.fr frame for rpcid ${rpcId} in the response`);
  }
  function parseRpcPayload(payload) {
    let parsed = payload;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch (error) {
        throw new AdapterHardError(`rpc payload is not valid JSON: ${error.message}`);
      }
    }
    if (!Array.isArray(parsed)) {
      throw new AdapterHardError("rpc payload is not an array");
    }
    if (parsed.length === 0) {
      throw new AdapterHardError("rpc payload is empty");
    }
    const turns = parsed[0];
    if (!Array.isArray(turns)) {
      throw new AdapterHardError("rpc payload[0] is not a turn array");
    }
    if (parsed.length === 1)
      return { turns, nextToken: null };
    const nextToken = parsed[1];
    if (typeof nextToken !== "string" || nextToken.length === 0) {
      throw new AdapterHardError(`rpc payload[1] is a next-page token but is not a non-empty string: ${typeof nextToken}`);
    }
    return { turns, nextToken };
  }
  function normalizeTurn(wireTurn, index = 0) {
    if (!Array.isArray(wireTurn)) {
      throw new AdapterHardError(`wire turn ${index} is not an array`);
    }
    const id = wireTurn[0];
    if (typeof id !== "string" || id.length === 0) {
      throw new AdapterHardError(`wire turn ${index} has no string id at turn[0]: ${JSON.stringify(id)}`);
    }
    const timestamp = wireTurn[1];
    if (!Array.isArray(timestamp) || !Number.isInteger(timestamp[0])) {
      throw new AdapterHardError(`turn ${index} id ${id}: turn[1] is not [unix_seconds, nanoseconds]`);
    }
    const roleCode = wireTurn[2];
    const kind = WIRE_KIND[roleCode];
    if (kind === undefined) {
      throw new AdapterHardError(`turn ${index} id ${id}: turn[2] is ${JSON.stringify(roleCode)}, not 1 (question) or 2 (answer)`);
    }
    let text;
    if (kind === "question") {
      text = wireTurn[3];
      if (typeof text !== "string") {
        throw new AdapterHardError(`turn ${index} id ${id}: a question has a non-string turn[3]: ${typeof text}`);
      }
    } else {
      text = extractAnswerBody(wireTurn[4]?.[0]);
    }
    return { id, ts: timestamp[0], kind, text };
  }
  function normalizeTurns(wireTurns) {
    if (!Array.isArray(wireTurns)) {
      throw new AdapterHardError("wire turn array is not an array");
    }
    if (wireTurns.length === 0) {
      throw new AdapterHardError("wire turn array is empty");
    }
    const newestFirst = wireTurns.map((turn, index) => normalizeTurn(turn, index));
    const seen = new Set;
    for (const turn of newestFirst) {
      if (seen.has(turn.id)) {
        throw new AdapterHardError(`turn id ${turn.id} appears more than once in the list`);
      }
      seen.add(turn.id);
    }
    let expected = NEWEST_FIRST_HEAD;
    for (let i = 0;i < newestFirst.length; i += 1) {
      if (newestFirst[i].kind !== expected) {
        throw new AdapterHardError(`newest-first turn ${i} id ${newestFirst[i].id} is ${newestFirst[i].kind} ` + `where ${expected} was required; the wire array must alternate`);
      }
      expected = expected === "question" ? "answer" : "question";
    }
    if (newestFirst.length % 2 !== 0) {
      throw new AdapterHardError(`wire turn array has ${newestFirst.length} turns, an odd count that leaves a question with no answer`);
    }
    return newestFirst.reverse();
  }
  function buildFReq({ conversationId, limit = DEFAULT_LIMIT }) {
    if (typeof conversationId !== "string" || conversationId.length === 0) {
      throw new AdapterHardError("f.req needs a conversation id");
    }
    if (!Number.isInteger(limit) || limit < DEFAULT_LIMIT) {
      throw new AdapterHardError(`first limit must be ${DEFAULT_LIMIT} or more (contract 4); got ${limit}`);
    }
    const inner = JSON.stringify([[], null, null, conversationId, limit]);
    return JSON.stringify([[["khqZz", inner, null, "generic"]]]);
  }
  function buildRequestUrl({
    notebookId,
    sid,
    authuser = 1,
    hl = "en",
    rt = "c",
    rpcId = RPC_ID
  }) {
    if (typeof notebookId !== "string" || notebookId.length === 0) {
      throw new AdapterHardError("the request needs a notebook id for source-path");
    }
    if (typeof sid !== "string" || sid.length === 0) {
      throw new AdapterHardError("the request needs f.sid, extracted from the page DOM");
    }
    const query = new URLSearchParams({
      rpcids: rpcId,
      "source-path": `/notebook/${notebookId}`,
      "f.sid": sid,
      hl,
      rt,
      authuser: String(authuser)
    });
    return `${RPC_ORIGIN}${RPC_PATH}?${query.toString()}`;
  }
  function buildPageRequest(options) {
    const { limit = DEFAULT_LIMIT, conversationId, at } = options;
    if (typeof at !== "string" || at.length === 0) {
      throw new AdapterHardError("the request needs the at token from the page DOM");
    }
    const fReq = buildFReq({ conversationId, limit });
    return {
      url: buildRequestUrl(options),
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({ "f.req": fReq, at }).toString()
    };
  }
  function formatPaginationLine({ turnCount, pageCount, limit, exhausted }) {
    if (!Number.isInteger(turnCount) || turnCount < 0) {
      throw new AdapterHardError(`turnCount must be a non-negative integer: ${turnCount}`);
    }
    if (!Number.isInteger(pageCount) || pageCount < 1) {
      throw new AdapterHardError(`pageCount must be at least 1: ${pageCount}`);
    }
    const tail = exhausted ? "토큰 소진 확인됨" : "토큰 소진 확인 안 됨 — 전체 조회 아님";
    return `조회: ${turnCount} turn (${pageCount}페이지, limit=${limit}, ${tail})`;
  }

  // src/browser-tokens.js
  var KNOWN_AT_KEYS = ["SNlM0e"];
  var KNOWN_SID_KEYS = ["FdrFJe"];
  var UNUSABLE_VALUES = new Set(["", "null", "undefined", "true", "false", "{}", "[]"]);
  function extractWizField(html, key) {
    const patterns = [
      new RegExp('"' + key + '"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"'),
      new RegExp("'" + key + "'\\s*:\\s*'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'"),
      new RegExp("&quot;" + key + "&quot;\\s*:\\s*&quot;((?:(?!&quot;).)*)&quot;")
    ];
    for (let i = 0;i < patterns.length; i++) {
      const match = html.match(patterns[i]);
      if (!match)
        continue;
      if (i === 0)
        return decodeJsonString(match[1]);
      if (i === 1)
        return match[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
      return decodeHtmlEntities(match[1]);
    }
    return null;
  }
  function decodeJsonString(raw) {
    try {
      return JSON.parse('"' + raw + '"');
    } catch {
      return null;
    }
  }
  function decodeHtmlEntities(raw) {
    const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };
    return raw.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, entity) => {
      const lower = entity.toLowerCase();
      if (lower[0] === "#") {
        const code = lower[1] === "x" ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      return named[lower] ?? whole;
    });
  }
  function listWizCandidates(html, { minLength = 8, maxLength = 128 } = {}) {
    const found = new Map;
    const pattern = /"([A-Za-z_$][\w$]{2,40})"\s*:\s*"([^"\\]{1,400})"/g;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const key = match[1];
      const value = decodeJsonString(match[2]);
      if (value === null)
        continue;
      if (UNUSABLE_VALUES.has(value))
        continue;
      if (value.length < minLength || value.length > maxLength)
        continue;
      if (/[\s<>{}\[\]]/.test(value))
        continue;
      if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value))
        continue;
      if (value.startsWith("/") && value.includes("/"))
        continue;
      if (!found.has(key))
        found.set(key, value);
    }
    return [...found].map(([key, value]) => ({ key, value }));
  }
  function readAuthTokens(html, { knownOnly = false } = {}) {
    const at = firstPresent(html, KNOWN_AT_KEYS);
    const sid = firstPresent(html, KNOWN_SID_KEYS);
    const result = {
      at: at.value,
      sid: sid.value,
      source: {
        at: at.source,
        sid: sid.source
      },
      candidates: []
    };
    if (knownOnly)
      return result;
    if (!at.value || !sid.value) {
      result.candidates = listWizCandidates(html);
    }
    return result;
  }
  function firstPresent(html, keys) {
    for (const key of keys) {
      const value = extractWizField(html, key);
      if (value)
        return { value, source: "known:" + key };
    }
    return { value: null, source: "missing" };
  }
  function readAuthUser(href) {
    try {
      return new URL(href).searchParams.get("authuser");
    } catch {
      return null;
    }
  }
  function redactSecrets(text, secrets = []) {
    let out = String(text);
    for (const secret of secrets) {
      if (!secret)
        continue;
      out = out.split(secret).join("[REDACTED]");
      out = out.split(encodeURIComponent(secret)).join("[REDACTED]");
    }
    return out.replace(/([?&](?:f\.sid|at)=)[^&\s]*/g, "$1[REDACTED]");
  }

  // src/userscript-entry.js
  var CONTENT_TYPE = "application/x-www-form-urlencoded;charset=UTF-8";
  var REQUEST_TIMEOUT_MS = 30000;
  function readPageAuth(html, href) {
    const tokens = readAuthTokens(html);
    const authuser = readAuthUser(href);
    return {
      at: tokens.at,
      sid: tokens.sid,
      candidates: tokens.candidates,
      authuser,
      secrets: [tokens.at, tokens.sid].filter(Boolean)
    };
  }
  function classifyStatus(status) {
    if (status === 401 || status === 403)
      return "AUTH_FAILURE";
    if (status === 400)
      return "REQUEST_FORMAT_ERROR";
    return "HTTP_FAILURE";
  }
  async function postOnce(fetchImpl, { request, rpcId = RPC_ID, signal }) {
    let response;
    try {
      response = await fetchImpl(request.url, {
        method: request.method,
        credentials: "include",
        headers: request.headers,
        body: request.body,
        signal: signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      throw new AdapterHardError(`fetch failed: ${error?.message || error}`);
    }
    if (!response.ok) {
      throw new AdapterHardError(`${classifyStatus(response.status)}: batchexecute returned HTTP ${response.status}`);
    }
    const payload = extractRpcPayload(await response.text(), rpcId);
    return parseRpcPayload(payload);
  }
  async function collectConversation({
    html,
    href,
    notebookId,
    conversationId,
    rpcId = RPC_ID,
    limit = DEFAULT_LIMIT,
    fetchImpl,
    signal
  }) {
    const page = readPageAuth(html, href);
    if (!page.at || !page.sid) {
      const missing = [!page.at && "at", !page.sid && "f.sid"].filter(Boolean).join(" and ");
      throw new AdapterHardError(`TOKEN_EXTRACTION_FAILED: no ${missing} token found in the page` + (page.candidates.length ? `; discovery candidates were ${page.candidates.map((c) => c.key).join(", ")}` : ""));
    }
    const request = buildPageRequest({
      conversationId,
      notebookId,
      sid: page.sid,
      at: page.at,
      limit,
      authuser: page.authuser
    });
    const { turns: wireTurns, nextToken } = await postOnce(fetchImpl, { request, rpcId, signal });
    const turns = normalizeTurns(wireTurns);
    return {
      turns,
      exhausted: nextToken === null,
      nextPageTokenPresent: nextToken !== null,
      limit,
      paginationLine: formatPaginationLine({
        turnCount: turns.length,
        pageCount: 1,
        limit,
        exhausted: nextToken === null
      }),
      secrets: page.secrets
    };
  }
  function describeFailure(error, secrets = []) {
    const message = String(error?.message || error);
    const verdict = ["TOKEN_EXTRACTION_FAILED", "AUTH_FAILURE", "REQUEST_FORMAT_ERROR", "HTTP_FAILURE"].find((code) => message.includes(code)) ?? "FETCH_OR_PARSE_FAILED";
    return { verdict, detail: redactSecrets(message, secrets) };
  }

  // src/citation-cleanup.js
  var FENCE = /^([ \t]*)(`{3,}|~{3,})([^\n]*)$/;
  var PROTECTED = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)|(?<![\\$])(\${1,2})(?!\$)(?:(?!\n[ \t]*\n)[\s\S])*?(?<![\\$])\2(?!\$)/g;
  var MARKER = /[ \t]+\[([1-9]\d*(?:-[1-9]\d*)?(?:, +[1-9]\d*(?:-[1-9]\d*)?)*)\](?=[.,:;!?。]|[ \t]*(?:\n|$|\|))/g;
  var RANGE_LABEL = /(?:구간|범위|배열|좌표|벡터|인덱스|interval|range|array|indices?|vector|coordinates?|matrix)\s*[:=]?\s*$/i;
  function stripSourceMarkers(text) {
    const references = new Set([...text.matchAll(/^[ \t]*\[(\d+(?:-\d+)?)\]:/gm)].map((match) => match[1]));
    const lines = text.split(`
`);
    const output = [];
    let buffer = [];
    let fence = null;
    const flush = () => {
      if (buffer.length)
        output.push(cleanSegment(buffer.join(`
`), references));
      buffer = [];
    };
    for (const line of lines) {
      const match = FENCE.exec(line);
      if (fence) {
        output.push(line);
        if (match && match[2][0] === fence.char && match[2].length >= fence.width && !match[3].trim())
          fence = null;
      } else if (match) {
        flush();
        fence = { char: match[2][0], width: match[2].length };
        output.push(line);
      } else {
        buffer.push(line);
      }
    }
    flush();
    return output.join(`
`);
  }
  function cleanSegment(text, references) {
    const prose = (part, offset) => part.replace(MARKER, (whole, numbers, index) => {
      const prefix = text.slice(0, offset + index).split(`
`).at(-1);
      if (!/\p{L}/u.test(prefix) || prefix.trimEnd().endsWith("]") || RANGE_LABEL.test(prefix))
        return whole;
      if (numbers.split(/, +/).some((label) => {
        if (references.has(label))
          return true;
        if (!label.includes("-"))
          return false;
        const [start, end] = label.split("-").map(Number);
        return [...references].some((number) => /^\d+$/.test(number) && Number(number) >= start && Number(number) <= end);
      }))
        return whole;
      return "";
    });
    let output = "";
    let cursor = 0;
    for (const match of text.matchAll(PROTECTED)) {
      output += prose(text.slice(cursor, match.index), cursor);
      output += match[2] ? match[0].replace(/[ \t]*\\quad[ \t]+\[[1-9]\d*(?:, +[1-9]\d*)*\](?=[ \t]*\${1,2}$)/, "") : match[0];
      cursor = match.index + match[0].length;
    }
    return output + prose(text.slice(cursor), cursor);
  }

  // src/markdown-assembler.js
  var DEFAULT_UT_OFFSET_MINUTES = 9 * 60;
  function formatTimestamp(ts, options = {}) {
    if (!Number.isInteger(ts)) {
      throw new CoreHardError(`ts is not an integer unix second: ${ts} (§1.2)`);
    }
    const offsetMinutes = options.offsetMinutes ?? DEFAULT_UT_OFFSET_MINUTES;
    if (!Number.isInteger(offsetMinutes)) {
      throw new CoreHardError(`offsetMinutes is not an integer: ${offsetMinutes}`);
    }
    const shifted = new Date((ts + offsetMinutes * 60) * 1000);
    return shifted.toISOString().slice(0, 19).replace("T", " ");
  }
  var FENCE2 = /^([ \t]*)(`{3,}|~{3,})([^\n]*)$/;
  var DISPLAY_MATH = /(?<!\\)(\\{1,2})\[([\s\S]*?)(?<!\\)\1\]/g;
  var INLINE_MATH = /(?<!\\)(\\{1,2})\(([\s\S]*?)(?<!\\)\1\)/g;
  var INLINE_CODE = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g;
  function convertLatexDelimiters(text) {
    if (typeof text !== "string") {
      throw new CoreHardError("text is not a string (§1.2)");
    }
    const lines = text.split(`
`);
    const segments = [];
    let buffer = [];
    let fenced = false;
    let fenceChar = null;
    const flush = () => {
      if (buffer.length > 0) {
        segments.push({ fenced, text: buffer.join(`
`) });
        buffer = [];
      }
    };
    for (const line of lines) {
      const match = FENCE2.exec(line);
      if (!fenced && match) {
        flush();
        fenced = true;
        fenceChar = match[2][0];
        buffer.push(line);
        continue;
      }
      if (fenced) {
        buffer.push(line);
        if (match && match[2].length >= 3 && match[2][0] === fenceChar && match[3].trim() === "") {
          flush();
          fenced = false;
          fenceChar = null;
        }
        continue;
      }
      buffer.push(line);
    }
    flush();
    return segments.map((s) => s.fenced ? s.text : convertSegment(s.text)).join(`
`);
  }
  function convertSegment(segment) {
    let converted = "";
    let cursor = 0;
    for (const match of segment.matchAll(INLINE_CODE)) {
      converted += convertMath(segment.slice(cursor, match.index)) + match[0];
      cursor = match.index + match[0].length;
    }
    return converted + convertMath(segment.slice(cursor));
  }
  function convertMath(text) {
    return text.replace(DISPLAY_MATH, (_, _slashes, body) => `$$${body}$$`).replace(INLINE_MATH, (_, _slashes, body) => `$${body}$`);
  }
  var CONTROL_CHAR = /[\u0000-\u001F\u007F]/;
  var PLAIN_UNSAFE = /^[-?:,[\]{}#&*!|>'"%@`]|^$|^\s|\s$|:\s|\s#|["']|^(true|false|yes|no|on|off|null|~)$/i;
  var NUMERIC_LIKE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
  function yamlScalar(value) {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new CoreHardError(`frontmatter value is not a finite number: ${value}`);
      }
      return String(value);
    }
    if (typeof value === "boolean")
      return value ? "true" : "false";
    if (typeof value !== "string") {
      throw new CoreHardError(`frontmatter value is not a scalar: ${value}`);
    }
    if (PLAIN_UNSAFE.test(value) || NUMERIC_LIKE.test(value) || CONTROL_CHAR.test(value)) {
      return quoteYamlString(value);
    }
    return value;
  }
  function quoteYamlString(value) {
    const escaped = value.replace(/[\\"\u0000-\u001F\u007F]/g, (character) => {
      switch (character) {
        case "\\":
          return "\\\\";
        case '"':
          return "\\\"";
        case `
`:
          return "\\n";
        case "\r":
          return "\\r";
        case "\t":
          return "\\t";
        case "\b":
          return "\\b";
        case "\f":
          return "\\f";
        case "\x00":
          return "\\0";
        default:
          return `\\x${character.charCodeAt(0).toString(16).padStart(2, "0")}`;
      }
    });
    return `"${escaped}"`;
  }
  function renderFrontmatter(meta) {
    const { course, lecture, conversationId, archivedDate, turns } = meta;
    if (typeof course !== "string" || course.length === 0) {
      throw new CoreHardError("frontmatter course is missing (contract 6.4, §9)");
    }
    if (!Number.isInteger(lecture)) {
      throw new CoreHardError("frontmatter lecture must be the number the user confirmed (contract 6.4, §9)");
    }
    if (typeof conversationId !== "string" || conversationId.length === 0) {
      throw new CoreHardError("frontmatter conversation id is missing (contract 6.1)");
    }
    if (typeof archivedDate !== "string" || archivedDate.length === 0) {
      throw new CoreHardError("frontmatter archive date is missing (contract 6.4)");
    }
    if (!Array.isArray(turns) || turns.length === 0) {
      throw new CoreHardError("a first archive has no turns (contract 6.4)");
    }
    const firstTurn = turns[0];
    const lastTurn = turns[turns.length - 1];
    if (typeof firstTurn?.id !== "string" || typeof lastTurn?.id !== "string") {
      throw new CoreHardError("a turn has no string id (contract 1.2)");
    }
    const lines = [
      "type: notebooklm-study",
      `course: ${yamlScalar(course)}`,
      `lecture: ${yamlScalar(lecture)}`,
      `archived: ${yamlScalar(archivedDate)}`,
      `archive_turns: ${yamlScalar(turns.length)}`,
      `archive_first_turn: ${quoteYamlString(firstTurn.id)}`,
      `archive_last_turn: ${quoteYamlString(lastTurn.id)}`,
      `archive_conversation: ${quoteYamlString(conversationId)}`
    ];
    return ["---", ...lines, "---"].join(`
`);
  }
  function renderEmptyAnswerPlaceholder(answerTs, options = {}) {
    return `> (이 답변 기록이 비어 있습니다 — ${formatTimestamp(answerTs, options)})`;
  }
  function renderPair(pair, options) {
    const { questionHeading, answerHeading, offsetMinutes = DEFAULT_UT_OFFSET_MINUTES } = options;
    const lines = [questionHeading, convertLatexDelimiters(pair.question.text)];
    if (pair.answer !== null && pair.answer !== undefined) {
      lines.push("", answerHeading);
      lines.push(pair.answer.text === "" ? renderEmptyAnswerPlaceholder(pair.answer.ts, { offsetMinutes }) : stripSourceMarkers(convertLatexDelimiters(pair.answer.text)));
    }
    return lines.join(`
`);
  }
  function joinBlocks(blocks) {
    return blocks.join(`

`);
  }
  function renderPageHeading(page, placement) {
    const marker = placement === "review" ? "####" : "##";
    if (page === null || page === undefined) {
      if (placement !== "review") {
        throw new CoreHardError("a first archive does not render a heading for an unclassified group (contract 2.6)");
      }
      return `${marker} 페이지 미지정`;
    }
    return `${marker} ${page}페이지`;
  }
  function assembleFirstArchive(turns, meta) {
    const offsetMinutes = meta.offsetMinutes ?? DEFAULT_UT_OFFSET_MINUTES;
    const { groups } = runPageStateMachine(turns, { pageChoices: meta.pageChoices });
    const archivedDate = meta.archivedDate ?? meta.archived;
    const blocks = [
      renderFrontmatter({ ...meta, archivedDate, turns }),
      `# ${meta.lecture}강`
    ];
    for (const group of groups) {
      if (!(group.page === null && group.unclassified)) {
        blocks.push(renderPageHeading(group.page, "first"));
      }
      for (const pair of group.items) {
        blocks.push(renderPair(pair, { questionHeading: "### Q", answerHeading: "### A", offsetMinutes }));
      }
    }
    return `${joinBlocks(blocks)}
`;
  }
  function assembleReviewSession(turns, options) {
    const offsetMinutes = options.offsetMinutes ?? DEFAULT_UT_OFFSET_MINUTES;
    const includeSection = options.includeSection ?? true;
    const includeDate = options.includeDate ?? true;
    const date = options.date;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new CoreHardError(`review session date must be YYYY-MM-DD: ${date} (spec 13.1)`);
    }
    const { groups } = runPageStateMachine(turns, { initialPage: options.initialPage ?? null, pageChoices: options.pageChoices });
    const blocks = [];
    if (includeSection)
      blocks.push("## 추가 질문");
    if (includeDate)
      blocks.push(`### ${date}`);
    for (const group of groups) {
      blocks.push(renderPageHeading(group.page, "review"));
      for (const pair of group.items) {
        blocks.push(renderPair(pair, { questionHeading: "##### Q", answerHeading: "##### A", offsetMinutes }));
      }
    }
    return `${joinBlocks(blocks)}
`;
  }

  // src/validation-output.js
  var BULLET = "•";
  var MARKER2 = Object.freeze({
    [GRADE_ERROR]: "✖",
    [GRADE_WARNING]: "⚠",
    [GRADE_INFO]: "·"
  });
  function firstLineOf(text) {
    if (typeof text !== "string")
      return "";
    for (const line of text.split(`
`)) {
      const trimmed = line.trim();
      if (trimmed.length > 0)
        return trimmed;
    }
    return "";
  }
  function bullet(marker, text, ts = null, options = {}) {
    const line = text.length > 0 ? text : "(빈 줄)";
    const prefix = marker.length > 0 ? `${marker} ${BULLET}` : BULLET;
    if (ts === null || ts === undefined) {
      return `${prefix} ${line}`;
    }
    return `${prefix} ${line} (${formatTimestamp(ts, options)})`;
  }
  function renderEntryBody(entry, options) {
    switch (entry.category) {
      case "unclassified":
        return (entry.questions ?? []).map((q) => bullet("", firstLineOf(q.text)));
      case "other-lecture":
        return (entry.questions ?? []).map((q) => bullet("", firstLineOf(q.text), q.ts, options));
      case "empty answer":
        return (entry.answers ?? []).map((a) => bullet("", firstLineOf(a.questionText), a.answerTs, options));
      case "multi-page reference":
        return (entry.questions ?? []).map((q) => bullet("", firstLineOf(q.text)));
      case "duplicate preserved":
        return (entry.questions ?? []).map((q) => bullet("", `${firstLineOf(q.text)} (${q.count}건)`, null, options));
      default:
        return [];
    }
  }
  function renderEntryHeader(entry) {
    switch (entry.category) {
      case "unclassified":
        return `⚠ 미분류 질문 ${countOf(entry.questions)}개`;
      case "other-lecture":
        return `⚠ 다른 강의 질문 ${countOf(entry.questions)}건 포함 (${lectureList(entry)})`;
      case "empty answer":
        return `⚠ 빈 답변 ${countOf(entry.answers)}건 (raw 응답에서 실제로 비어 있었음)`;
      case "multi-page reference":
        return `⚠ 복수 페이지 참조 ${countOf(entry.questions)}건`;
      case "duplicate preserved":
        return `· 중복 질문 ${countOf(entry.questions)}쌍 — 합치지 않고 모두 보존함`;
      default:
        return `${MARKER2[entry.grade] ?? MARKER2[GRADE_INFO]} ${entry.message}`;
    }
  }
  function countOf(list) {
    return Array.isArray(list) ? list.length : 0;
  }
  function lectureList(entry) {
    const numbers = [];
    for (const question of entry.questions ?? []) {
      if (Number.isInteger(question.lecture) && !numbers.includes(question.lecture)) {
        numbers.push(question.lecture);
      }
    }
    if (numbers.length === 0 && Number.isInteger(entry.lecture))
      numbers.push(entry.lecture);
    return numbers.map((n) => `${n}강`).join(", ");
  }
  function renderValidationBlock(result, options = {}) {
    if (!result || !Array.isArray(result.entries)) {
      throw new CoreHardError("renderValidationBlock needs the result of validate()");
    }
    const entries = [...result.entries, ...options.extraEntries ?? []];
    const counts = result.counts ?? {};
    const lines = ["저장 전 검증", ""];
    if (typeof options.course === "string" && options.course.length > 0) {
      lines.push(`과목: ${options.course}`);
    }
    if (Number.isInteger(options.lecture)) {
      lines.push(`강의: ${options.lecture}강`);
    }
    if (typeof options.filePath === "string" && options.filePath.length > 0) {
      lines.push(`파일: ${options.filePath}`);
    }
    if (options.pagination) {
      lines.push(formatPaginationLine(options.pagination));
    }
    lines.push(`질문: ${counts.questions ?? 0}`);
    lines.push(`답변: ${counts.answers ?? 0}`);
    lines.push(`빈 답변: ${counts.emptyAnswers ?? 0}`);
    lines.push(`감지된 페이지: ${counts.pages ?? 0}개`);
    lines.push(`미분류 질문: ${counts.unclassified ?? 0}개`);
    const { errors, warnings, infos } = partitionEntries(entries);
    if (errors.length > 0) {
      lines.push("");
      for (const entry of errors) {
        lines.push(`${MARKER2[GRADE_ERROR]} 오류 — ${entry.message}`);
        lines.push(...renderEntryBody(entry, options));
      }
    }
    if (warnings.length > 0) {
      lines.push("");
      for (const entry of warnings) {
        lines.push(renderEntryHeader(entry));
        lines.push(...renderEntryBody(entry, options));
      }
    }
    if (infos.length > 0) {
      lines.push("");
      for (const entry of infos) {
        lines.push(renderEntryHeader(entry));
        lines.push(...renderEntryBody(entry, options));
      }
    }
    lines.push("");
    lines.push(options.dryRun ? "검증만 실행: Obsidian에 파일을 저장하지 않습니다." : "실제 저장 모드");
    lines.push(`검증 결과: ${errors.length > 0 ? "차단" : warnings.length > 0 ? "주의" : "통과"} — error ${errors.length}건, warning ${warnings.length}건, info ${infos.length}건`);
    if (!options.dryRun)
      lines.push(renderSaveDecision(errors.length, warnings.length, infos.length));
    return lines.join(`
`);
  }
  function renderSaveDecision(errorCount, warningCount, infoCount) {
    const tally = `error ${errorCount}건, warning ${warningCount}건, info ${infoCount}건`;
    if (errorCount > 0) {
      return `저장: 차단 — ${tally}. error가 있어서 파일을 쓰지 않습니다`;
    }
    return `저장: 진행 — ${tally}. error만 저장을 막습니다`;
  }
  function partitionEntries(entries) {
    const errors = [];
    const warnings = [];
    const infos = [];
    for (const entry of entries) {
      if (entry.grade === GRADE_ERROR)
        errors.push(entry);
      else if (entry.grade === GRADE_WARNING)
        warnings.push(entry);
      else if (entry.grade === GRADE_INFO)
        infos.push(entry);
      else
        errors.push({ ...entry, grade: GRADE_ERROR, message: `알 수 없는 등급: ${entry.grade}` });
    }
    return { errors, warnings, infos };
  }
  function isSaveBlocked(result, extraEntries = []) {
    if (!result || typeof result !== "object") {
      throw new CoreHardError("isSaveBlocked needs a validation result");
    }
    if ((result.errors ?? []).some((entry) => entry.grade === GRADE_ERROR)) {
      return true;
    }
    return partitionEntries(extraEntries).errors.length > 0;
  }
  async function runValidationPipeline(request) {
    if (!request || typeof request !== "object") {
      throw new CoreHardError("runValidationPipeline needs a request object");
    }
    const { turns, write = null } = request;
    const result = validate(turns, {
      selectedLecture: request.selectedLecture,
      exhausted: request.exhausted,
      limit: request.limit,
      pageChoices: request.pageChoices
    });
    const block = renderValidationBlock(result, {
      course: request.course,
      lecture: request.lecture,
      filePath: request.filePath,
      pagination: request.pagination,
      offsetMinutes: request.offsetMinutes,
      extraEntries: request.extraEntries,
      dryRun: request.dryRun
    });
    if (isSaveBlocked(result, request.extraEntries)) {
      return {
        saveBlocked: true,
        block,
        result,
        writeAttempted: false,
        writeResult: null,
        reason: "grade error가 있어 저장을 시도하지 않았습니다"
      };
    }
    if (typeof write !== "function") {
      throw new CoreHardError("runValidationPipeline needs a write function when the validation passes");
    }
    const context = { result, block, turns, request };
    if (request.beforeWrite && !await request.beforeWrite(context)) {
      return {
        saveBlocked: false,
        block,
        result,
        writeAttempted: false,
        writeResult: null,
        reason: "사용자가 저장을 취소했습니다"
      };
    }
    const writeResult = await write(context);
    return {
      saveBlocked: false,
      block,
      result,
      writeAttempted: true,
      writeResult,
      reason: null
    };
  }

  // src/delta-rules.js
  var FENCE3 = /^---[ \t]*\r?\n/;
  function parseFrontmatter(content) {
    if (content === null || content === undefined) {
      return { present: false, fields: {}, order: [] };
    }
    if (typeof content !== "string") {
      throw new CoreHardError("existing file content is not a string (§1.4)");
    }
    if (!FENCE3.test(content)) {
      return { present: false, fields: {}, order: [] };
    }
    const rest = content.slice(FENCE3.exec(content)[0].length);
    const end = /^---[ \t]*(\r?\n|$)/m.exec(rest);
    if (!end) {
      throw new CoreHardError("frontmatter opens but never closes; the file is broken (§1.4)");
    }
    const body = rest.slice(0, end.index);
    const fields = {};
    const order = [];
    for (const line of body.split(`
`)) {
      if (line.trim() === "")
        continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)[ \t]*:[ \t]*(.*)$/.exec(line);
      if (!match) {
        throw new CoreHardError(`frontmatter line is not a scalar field: ${line}`);
      }
      fields[match[1]] = parseYamlScalar(match[2]);
      order.push(match[1]);
    }
    return { present: true, fields, order };
  }
  function parseYamlScalar(raw) {
    const trimmed = raw.replace(/\r$/, "");
    if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1).replace(/\\([\\"nrtbf0]|x[0-9a-fA-F]{2})/g, (match, escape) => {
        switch (escape) {
          case "\\":
            return "\\";
          case '"':
            return '"';
          case "n":
            return `
`;
          case "r":
            return "\r";
          case "t":
            return "\t";
          case "b":
            return "\b";
          case "f":
            return "\f";
          case "0":
            return "\x00";
          default:
            return String.fromCharCode(Number.parseInt(escape.slice(1), 16));
        }
      });
    }
    return trimmed.trim();
  }
  var SECTION_HEADING = /^##[ \t]+추가[ \t]+질문[ \t]*\r?$/m;
  var SESSION_HEADING = /^###[ \t]+(\d{4}-\d{2}-\d{2})[ \t]*\r?$/gm;
  function hasAdditionalQuestionsSection(content) {
    if (typeof content !== "string")
      return false;
    return SECTION_HEADING.test(content);
  }
  function hasSessionDateHeading(content, date) {
    if (typeof content !== "string")
      return false;
    SESSION_HEADING.lastIndex = 0;
    let match;
    while ((match = SESSION_HEADING.exec(content)) !== null) {
      if (match[1] === date)
        return true;
    }
    return false;
  }
  var CONFLICT_OPTIONS = Object.freeze([
    { id: "append-review", label: "복습 추가 → '추가 질문' 영역에 넣기", isDefault: false },
    { id: "new-file", label: "새 파일로 저장", isDefault: false },
    { id: "overwrite", label: "덮어쓰기", isDefault: false },
    { id: "cancel", label: "취소", isDefault: true }
  ]);

  // src/save-mode.js
  var SAVE_MODES = ["first", "review"];
  var fail = (reason) => {
    throw new CoreHardError(reason);
  };
  var blocked = (reason) => ({ action: "blocked", write: false, reason, newTurns: [] });
  function readMetadata(content, request) {
    const { fields, order } = parseFrontmatter(content);
    for (const key of ["archive_conversation", "archive_last_turn", "archive_turns", "course", "lecture"]) {
      if (order.filter((k) => k === key).length !== 1 || !fields[key])
        fail(`missing or duplicate ${key}`);
    }
    if (fields.course !== request.course || fields.lecture !== String(request.lecture))
      fail("target metadata differs");
    if (order.filter((k) => k === "archive_review_sessions").length > 1)
      fail("duplicate review ledger");
    let sessions = [];
    if (fields.archive_review_sessions !== undefined) {
      try {
        sessions = JSON.parse(fields.archive_review_sessions);
      } catch {
        fail("broken review ledger");
      }
    }
    if (!Array.isArray(sessions))
      fail("review ledger must be a list");
    const seen = new Set;
    for (const session of sessions) {
      if (!session || typeof session.conversationId !== "string" || !session.conversationId || typeof session.lastTurnId !== "string" || !session.lastTurnId || !Number.isInteger(session.turnCount) || session.turnCount < 2 || seen.has(session.conversationId))
        fail("invalid review anchor");
      seen.add(session.conversationId);
    }
    return { fields, sessions };
  }
  function planModeSave(request) {
    const { mode, existingContent, turns, conversationId } = request;
    if (!SAVE_MODES.includes(mode))
      fail("choose first or review explicitly");
    if (typeof conversationId !== "string" || !conversationId)
      fail("conversation ID is required");
    if (!turns.length || validateStructure(turns).some((e) => e.grade === "error"))
      fail("invalid conversation structure");
    const base = { ...request, newTurns: [], write: false };
    if (mode === "first") {
      if (existingContent !== null && existingContent !== undefined)
        return { ...base, ...blocked("파일이 이미 있습니다. 처음 저장은 기존 파일을 덮어쓰지 않습니다. 복습 추가를 선택하세요.") };
      return { ...base, action: "first-archive", write: true };
    }
    if (existingContent === null || existingContent === undefined)
      return { ...base, ...blocked("복습을 추가할 기존 파일이 없습니다. 처음 저장을 선택하세요.") };
    const { fields, sessions } = readMetadata(existingContent, request);
    const saved = sessions.find((s) => s.conversationId === conversationId);
    const anchorId = saved?.lastTurnId ?? (fields.archive_conversation === conversationId ? fields.archive_last_turn : null);
    let position = -1;
    if (anchorId !== null) {
      position = turns.findIndex((t) => t.id === anchorId);
      if (position === -1)
        return { ...base, ...blocked("이미 저장한 대화의 마지막 메시지를 찾을 수 없습니다. 중복 방지를 위해 저장을 중단했습니다.") };
    }
    const newTurns = turns.slice(position + 1);
    if (!newTurns.length)
      return { ...base, action: "noop", sessions };
    if (validateStructure(newTurns).some((e) => e.grade === "error"))
      fail("anchor splits a question/answer pair");
    const initialPage = position >= 0 ? runPageStateMachine(turns.slice(0, position + 1), { pageChoices: request.pageChoices }).groups.at(-1)?.page ?? null : null;
    return {
      ...base,
      action: "append",
      write: true,
      newTurns,
      sessions,
      newConversation: anchorId === null,
      anchor: { turnId: anchorId, position: position + 1 },
      initialPage
    };
  }
  function renderModeSave(plan, options) {
    if (!plan.write)
      return null;
    if (plan.action === "first-archive")
      return assembleFirstArchive(plan.turns, {
        ...options,
        conversationId: plan.conversationId,
        archivedDate: options.date
      });
    const hasSection = hasAdditionalQuestionsSection(plan.existingContent);
    const fragment = assembleReviewSession(plan.newTurns, {
      ...options,
      initialPage: plan.initialPage,
      includeSection: !hasSection,
      includeDate: !hasSessionDateHeading(plan.existingContent, options.date)
    });
    const content = plan.existingContent + (hasSection ? `

` : `

---

`) + fragment;
    const sessions = plan.sessions.filter((s) => s.conversationId !== plan.conversationId);
    sessions.push({ conversationId: plan.conversationId, lastTurnId: plan.newTurns.at(-1).id, turnCount: plan.turns.length });
    const end = content.indexOf(`
---`, 4);
    let header = content.slice(0, end);
    const line = `archive_review_sessions: ${yamlScalar(JSON.stringify(sessions))}`;
    header = /^archive_review_sessions[ \t]*:/m.test(header) ? header.replace(/^archive_review_sessions[ \t]*:.*$/m, () => line) : header + `
` + line;
    return header + content.slice(end);
  }

  // src/vault-writer.js
  var VAULT_ORIGIN = "https://127.0.0.1:27125";
  var VAULT_SUCCESS_STATUS = 204;
  function buildVaultUrl(vaultPath, origin = VAULT_ORIGIN) {
    if (typeof vaultPath !== "string" || vaultPath.trim().length === 0) {
      throw new CoreHardError("the vault path is empty");
    }
    const trimmed = vaultPath.trim().replace(/^\/+/, "").replace(/^vault\//, "");
    if (trimmed.length === 0) {
      throw new CoreHardError("the vault path is empty after stripping the prefix");
    }
    const encoded = trimmed.split("/").map((segment) => encodeURIComponent(segment)).join("/");
    return `${origin.replace(/\/+$/, "")}/vault/${encoded}`;
  }
  function buildVaultRequest({ path, content, apiKey, origin = VAULT_ORIGIN }) {
    if (typeof content !== "string") {
      throw new CoreHardError("the file content must be a string");
    }
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      throw new CoreHardError("the vault write needs the plugin API key");
    }
    return {
      url: buildVaultUrl(path, origin),
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "text/markdown"
      },
      credentials: "omit"
    };
  }
  async function writeVaultFile(target) {
    const { fetchImpl } = target;
    if (typeof fetchImpl !== "function") {
      throw new CoreHardError("writeVaultFile needs an injected fetch implementation");
    }
    const request = buildVaultRequest(target);
    let response;
    try {
      response = await fetchImpl(request.url, {
        method: request.method,
        headers: request.headers,
        body: target.content,
        credentials: request.credentials
      });
    } catch (error) {
      return {
        ok: false,
        status: 0,
        url: request.url,
        reason: `the request did not complete: ${error.message}`
      };
    }
    if (response.status === VAULT_SUCCESS_STATUS) {
      return { ok: true, status: response.status, url: request.url, reason: null };
    }
    return {
      ok: false,
      status: response.status,
      url: request.url,
      reason: `status ${response.status} is not ${VAULT_SUCCESS_STATUS}; ` + "the vault did not accept the file"
    };
  }

  // src/archive-save.js
  async function readVaultFile({ path, apiKey, origin, fetchImpl }) {
    const url = buildVaultUrl(path, origin);
    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "text/markdown" },
        credentials: "omit",
        cache: "no-store"
      });
      if (response.status === 404)
        return { ok: true, content: null, status: 404, url };
      if (response.status !== 200)
        return { ok: false, status: response.status, url, reason: `vault read status ${response.status}` };
      const content = await response.text();
      if (typeof content !== "string")
        throw new Error("non-text response");
      return { ok: true, content, status: 200, url };
    } catch {
      return { ok: false, status: 0, url, reason: `vault read did not complete — Obsidian 파일 조회 연결이 완료되지 않았습니다.
` + "Obsidian 실행, HTTPS 주소·포트와 인증서의 주소 일치, macOS CA 인증서 신뢰, " + "Userscripts의 NotebookLM 및 로컬 API 사이트 접근 허용을 확인하세요." };
    }
  }
  async function saveArchive(options) {
    const initial = await readVaultFile(options);
    if (!initial.ok)
      return initial;
    let plan;
    let content;
    try {
      plan = planModeSave({ ...options, existingContent: initial.content, targetPath: options.path });
      if (plan.action === "noop")
        return {
          ok: true,
          status: 0,
          url: initial.url,
          action: "noop",
          newTurnCount: 0,
          reason: "추가할 새 질문 없음; 기존 파일 유지"
        };
      if (!plan.write)
        return { ok: false, status: 0, url: initial.url, action: "blocked", reason: plan.reason };
      content = renderModeSave(plan, options);
    } catch {
      return {
        ok: false,
        status: 0,
        url: initial.url,
        action: "blocked",
        reason: "기존 노트의 메타데이터 또는 추가할 질문 구조를 확인할 수 없어 저장을 중단했습니다."
      };
    }
    const newTurnCount = plan.action === "append" ? plan.newTurns.length : options.turns.length;
    const message = plan.action === "append" ? `복습 추가: ${options.path}
${plan.newConversation ? "새 복습 대화 전체를 추가합니다." : "이미 저장한 대화의 신규 질문만 추가합니다."}
기존 본문 유지, 신규 ${newTurnCount} turn을 추가 질문에 저장합니다.
저장할까요?` : `${options.path}
새 파일에 ${newTurnCount} turn을 저장합니다.
저장할까요?`;
    if (!options.confirm(message))
      return {
        ok: false,
        status: 0,
        url: initial.url,
        action: "cancelled",
        reason: "save preview cancelled"
      };
    const latest = await readVaultFile(options);
    if (!latest.ok)
      return latest;
    if (latest.content !== initial.content)
      return {
        ok: false,
        status: 0,
        url: initial.url,
        action: "blocked",
        reason: "target changed during preview; rerun without overwriting edits"
      };
    return { ...await writeVaultFile({ ...options, content }), action: plan.action, newTurnCount };
  }

  // src/conversation-selection.js
  function notebookIdFromUrl(href) {
    const url = new URL(href);
    const match = /^\/notebook\/([^/]+)\/?$/.exec(url.pathname);
    if (url.origin !== "https://notebook.google.com" || !match)
      throw new AdapterHardError("NotebookLM 노트북 화면에서 실행하세요.");
    return decodeURIComponent(match[1]);
  }
  async function findConversationCandidate({ html, href, notebookId, fetchImpl }) {
    const auth = readPageAuth(html, href);
    if (!auth.at || !auth.sid)
      throw new AdapterHardError("TOKEN_EXTRACTION_FAILED: page auth missing");
    const rpcId = "hPTbtc";
    const inner = JSON.stringify([[], null, notebookId, 1]);
    const body = new URLSearchParams({ "f.req": JSON.stringify([[[rpcId, inner, null, "generic"]]]), at: auth.at }).toString();
    let response;
    try {
      response = await fetchImpl(buildRequestUrl({ notebookId, sid: auth.sid, authuser: auth.authuser, rpcId }), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": CONTENT_TYPE },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch {
      throw new AdapterHardError("conversation candidate request did not complete");
    }
    if (!response.ok)
      throw new AdapterHardError(`${classifyStatus(response.status)}: conversation lookup failed`);
    let parsed;
    try {
      parsed = JSON.parse(extractRpcPayload(await response.text(), rpcId));
    } catch {
      throw new AdapterHardError("conversation candidate response changed");
    }
    const id = parsed?.[0]?.[0]?.[0];
    const row = parsed?.[0]?.[0];
    const timestamp = (value) => Array.isArray(value) && value.length === 2 && value.every(Number.isInteger);
    const knownRow = Array.isArray(row) && (row.length === 1 || row.length === 3 && timestamp(row[1]) && timestamp(row[2]));
    if (!Array.isArray(parsed) || parsed.length !== 1 || !Array.isArray(parsed[0]) || parsed[0].length !== 1 || !knownRow || typeof id !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
      throw new AdapterHardError("대화 후보를 확인하지 못했습니다. 질문이 있는 대화에서 다시 실행하세요.");
    }
    return id;
  }

  // src/archive-options.js
  function validCourseName(course) {
    return Boolean(course) && course !== "." && course !== ".." && !/[\\/\u0000-\u001f]/.test(course);
  }
  function courseFromNotebookTitle(title) {
    const match = String(title ?? "").match(/^\s*\[([^\[\]]+)\][^\[\]]*$/);
    const course = match?.[1].trim() ?? "";
    return validCourseName(course) ? course : "";
  }
  function validateSaveOptions(options) {
    const course = String(options.course ?? "").trim();
    const lecture = Number(options.lecture);
    if (!SAVE_MODES.includes(options.mode))
      throw new Error("처음 저장 또는 복습 추가를 선택하세요.");
    if (!validCourseName(course))
      throw new Error("과목명을 입력하세요. 경로 구분자나 줄바꿈은 넣을 수 없습니다.");
    if (!Number.isSafeInteger(lecture) || lecture < 1)
      throw new Error("강의 번호는 1 이상의 정수로 입력하세요.");
    return { mode: options.mode, course, lecture, dryRun: Boolean(options.dryRun) };
  }
  function requestSaveOptions(document2, defaults) {
    return new Promise((resolve) => {
      const dialog = document2.createElement("dialog");
      dialog.setAttribute("aria-label", "NotebookLM 아카이브");
      dialog.style.cssText = "max-width:420px;width:calc(100% - 48px);padding:24px;border:1px solid #bbb;border-radius:12px;background:#fff;color:#222;z-index:2147483647;font:15px system-ui;";
      dialog.innerHTML = `<form style="display:grid;gap:16px">
      <h2 style="font-size:20px;margin:0">NotebookLM 아카이브</h2>
      <p style="margin:0">현재 과목과 저장할 강의를 확인하세요.</p>
      <label>과목명 <input name="course" required placeholder="노트북 제목의 [과목명] 또는 직접 입력" style="display:block;width:95%;margin-top:6px;padding:8px"></label>
      <label>강의 번호 <input name="lecture" type="number" min="1" step="1" required placeholder="저장할 강의 번호를 직접 입력" style="display:block;width:95%;margin-top:6px;padding:8px"></label>
      <label><input name="dryRun" type="checkbox"> 검증만 실행 (Obsidian에 저장하지 않음)</label>
      <p role="alert" style="color:#b00020;margin:0"></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="submit" value="first" style="padding:9px">처음 저장</button>
        <button type="submit" value="review" style="padding:9px">복습 추가</button>
        <button type="button" style="padding:9px">취소</button>
      </div>
      <p style="font-size:13px;margin:0">처음 저장은 새 강의 파일을 만듭니다. 복습 추가는 기존 강의 끝에 질문을 덧붙입니다.</p>
    </form>`;
      const form = dialog.querySelector("form");
      form.elements.course.value = courseFromNotebookTitle(document2.title);
      form.elements.lecture.value = "";
      form.elements.dryRun.checked = defaults.dryRun;
      const finish = (value) => {
        dialog.close();
        dialog.remove();
        resolve(value);
      };
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        try {
          finish(validateSaveOptions({
            mode: event.submitter?.value,
            course: form.elements.course.value,
            lecture: form.elements.lecture.value,
            dryRun: form.elements.dryRun.checked
          }));
        } catch (error) {
          dialog.querySelector("[role=alert]").textContent = error.message;
        }
      });
      dialog.querySelector("[type=button]").addEventListener("click", () => finish(null));
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finish(null);
      });
      document2.body.appendChild(dialog);
      dialog.showModal();
    });
  }
  function requestPageChoices(document2, questions) {
    if (!questions.length)
      return Promise.resolve({});
    return new Promise((resolve) => {
      const dialog = document2.createElement("dialog");
      dialog.setAttribute("aria-label", "대표 페이지 선택");
      dialog.style.cssText = "max-width:720px;width:calc(100% - 48px);max-height:85vh;overflow:auto;padding:24px;border:1px solid #bbb;border-radius:12px;background:#fff;color:#222;z-index:2147483647;font:15px system-ui;";
      const form = document2.createElement("form");
      const heading = document2.createElement("h2");
      heading.textContent = "복수 페이지 질문의 대표 페이지 선택";
      form.appendChild(heading);
      const help = document2.createElement("p");
      help.textContent = "각 질문을 묶을 페이지를 선택하세요. 첫 번째로 언급된 페이지가 기본 선택입니다.";
      form.appendChild(help);
      const selects = [];
      for (const question of questions) {
        const section = document2.createElement("section");
        const text = document2.createElement("pre");
        text.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;";
        text.textContent = `질문: ${question.text}`;
        section.appendChild(text);
        const details = document2.createElement("details");
        const summary = document2.createElement("summary");
        summary.textContent = "답변 보기";
        details.appendChild(summary);
        const answer = document2.createElement("pre");
        answer.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;";
        answer.textContent = question.answer ?? "(답변 없음)";
        details.appendChild(answer);
        section.appendChild(details);
        const label = document2.createElement("label");
        label.textContent = "대표 페이지: ";
        const select = document2.createElement("select");
        for (const page of question.pages) {
          const option = document2.createElement("option");
          option.value = String(page);
          option.textContent = `${page}페이지`;
          select.appendChild(option);
        }
        label.appendChild(select);
        section.appendChild(label);
        form.appendChild(section);
        selects.push(select);
      }
      const submit = document2.createElement("button");
      submit.type = "submit";
      submit.textContent = "선택 완료";
      form.appendChild(submit);
      const cancel = document2.createElement("button");
      cancel.type = "button";
      cancel.textContent = "취소";
      form.appendChild(cancel);
      const finish = (value) => {
        dialog.close();
        dialog.remove();
        resolve(value);
      };
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const choices = Object.create(null);
        questions.forEach((q, i) => {
          choices[q.id] = Number(selects[i].value);
        });
        finish(choices);
      });
      cancel.addEventListener("click", () => finish(null));
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finish(null);
      });
      dialog.appendChild(form);
      document2.body.appendChild(dialog);
      dialog.showModal();
    });
  }

  // src/userscript-main.js
  var CONFIG = {
    notebookId: "00000000-0000-4000-8000-000000000004",
    conversationId: "00000000-0000-4000-8000-000000000002",
    course: "",
    lecture: null,
    limit: 400,
    sourceLabel: "",
    vaultOrigin: VAULT_ORIGIN,
    dryRun: true
  };
  function setConfig(overrides = {}) {
    Object.assign(CONFIG, overrides);
    return CONFIG;
  }
  var REQUIRED = ["notebookId", "course"];
  function missingConfig(config) {
    const missing = REQUIRED.filter((key) => !config[key]);
    if (config.conversationId !== null && !config.conversationId)
      missing.push("conversationId");
    if (!Number.isInteger(config.lecture) || config.lecture < 1)
      missing.push("lecture");
    if (!Number.isInteger(config.limit) || config.limit < 200)
      missing.push("limit(>=200)");
    return missing;
  }
  function report(value) {
    const line = JSON.stringify(value);
    console.log("[nbm-archive] " + line);
    return line;
  }
  async function runArchive({
    html,
    href,
    fetchImpl = fetch,
    confirm = typeof window === "undefined" ? () => false : window.confirm.bind(window),
    promptForApiKey = typeof window === "undefined" ? () => null : window.prompt.bind(window),
    notify = typeof window === "undefined" ? () => {} : window.alert.bind(window),
    mode,
    resolvePages = typeof document === "undefined" ? async () => null : (questions) => requestPageChoices(document, questions),
    notebookId = CONFIG.notebookId,
    conversationId = CONFIG.conversationId,
    course = CONFIG.course,
    lecture = CONFIG.lecture,
    dryRun = CONFIG.dryRun,
    now = new Date
  }) {
    const cfg = { ...CONFIG, mode, notebookId, conversationId, course, lecture, dryRun };
    const missing = missingConfig(cfg);
    if (missing.length > 0) {
      return report({ step: "CONFIG", verdict: "CONFIG_INCOMPLETE", missing });
    }
    try {
      Object.assign(cfg, validateSaveOptions(cfg));
    } catch (error) {
      notify(error.message);
      return report({ step: "CONFIG", verdict: "CONFIG_INCOMPLETE" });
    }
    const candidate = cfg.conversationId === null;
    if (candidate) {
      try {
        cfg.conversationId = await findConversationCandidate({ html, href, notebookId: cfg.notebookId, fetchImpl });
      } catch (error) {
        notify("대화를 조회하지 못했습니다. 질문이 있는 NotebookLM 화면에서 다시 실행하세요.");
        return report({ step: "COLLECT", verdict: "CONVERSATION_LOOKUP_FAILED", detail: error.message });
      }
    }
    const collected = await collectConversation({
      html,
      href,
      notebookId: cfg.notebookId,
      conversationId: cfg.conversationId,
      limit: cfg.limit,
      fetchImpl
    }).catch((error) => {
      const out = describeFailure(error, []);
      report({ step: "COLLECT", ...out });
      return null;
    });
    if (collected === null)
      return null;
    report({
      step: "COLLECT",
      turnCount: collected.turns.length,
      exhausted: collected.exhausted,
      nextPageTokenPresent: collected.nextPageTokenPresent,
      pagination: collected.paginationLine
    });
    if (!collected.exhausted) {
      notify(`조회 한도 ${cfg.limit}개 안에 대화 전체를 가져오지 못했습니다.
일부 내용만 저장하지 않도록 저장을 중단했습니다.
Obsidian에는 저장하지 않았습니다. 긴 대화 처리는 별도 개선이 필요합니다.`);
      return report({
        step: "PARTIAL",
        verdict: "PAGINATION_UNPROVEN",
        turnCount: collected.turns.length,
        detail: "a next-page token came back and the page-2 request shape is unproven " + "(the one recorded attempt used token_param_index: 1 and repeated all " + "100 rows of page 1). Nothing was written."
      });
    }
    const ambiguous = collected.turns.flatMap((turn, index) => {
      if (turn.kind !== "question")
        return [];
      const pages = [...new Set(extractPageReference(turn.text).pages)];
      if (pages.length < 2)
        return [];
      const next = collected.turns[index + 1];
      return [{ id: turn.id, text: turn.text, answer: next?.kind === "answer" ? next.text : null, pages }];
    });
    let pageChoices = {};
    if (ambiguous.length) {
      pageChoices = await resolvePages(ambiguous);
      if (pageChoices === null)
        return report({ step: "CANCELLED", verdict: "CANCELLED", reason: "page selection cancelled" });
      if (!pageChoices || typeof pageChoices !== "object" || ambiguous.some((q) => !Object.hasOwn(pageChoices, q.id) || !q.pages.includes(pageChoices[q.id]))) {
        notify("대표 페이지 선택이 올바르지 않아 저장을 중단했습니다.");
        return report({ step: "BLOCKED", verdict: "INVALID_PAGE_SELECTION" });
      }
    }
    const vaultPath = `${cfg.course}/${cfg.lecture}강.md`;
    let approved = false;
    const pipeline = await runValidationPipeline({
      turns: collected.turns,
      pageChoices,
      dryRun: cfg.dryRun,
      course: cfg.course,
      lecture: cfg.lecture,
      selectedLecture: cfg.lecture,
      filePath: vaultPath,
      pagination: {
        turnCount: collected.turns.length,
        pageCount: 1,
        limit: cfg.limit,
        exhausted: collected.exhausted
      },
      exhausted: collected.exhausted,
      limit: cfg.limit,
      beforeWrite: ({ result, block }) => {
        report({
          step: "VALIDATION",
          saveBlocked: false,
          writeAttempted: false,
          errors: result.errors.length,
          warnings: result.warnings.length,
          infos: result.infos.length,
          counts: result.counts,
          reason: null
        });
        const questions = collected.turns.filter((turn) => turn.kind === "question");
        const preview = `저장 방식: ${cfg.mode === "first" ? "처음 저장" : "복습 추가"}
` + (candidate ? `최근 대화 후보를 조회했습니다. 지금 저장하려는 대화인지 아래 질문을 확인하세요.
` : "") + `시작 질문: ${questions[0]?.text.slice(0, 160) ?? "(없음)"}
` + `마지막 질문: ${questions.at(-1)?.text.slice(0, 160) ?? "(없음)"}

`;
        approved = confirm(preview + block);
        return approved;
      },
      write: async () => {
        if (cfg.dryRun) {
          return { ok: true, status: 0, url: null, reason: "dryRun: nothing was written" };
        }
        const apiKey = promptForApiKey("Obsidian Local REST API key");
        if (!apiKey) {
          return { ok: false, status: 0, url: null, reason: "no API key was given" };
        }
        return saveArchive({
          mode: cfg.mode,
          path: vaultPath,
          turns: collected.turns,
          pageChoices,
          course: cfg.course,
          lecture: cfg.lecture,
          conversationId: cfg.conversationId,
          date: formatTimestamp(Math.floor(now.getTime() / 1000)).slice(0, 10),
          apiKey,
          origin: cfg.vaultOrigin,
          fetchImpl,
          confirm
        });
      }
    });
    if (pipeline.saveBlocked) {
      report({
        step: "VALIDATION",
        saveBlocked: pipeline.saveBlocked,
        writeAttempted: pipeline.writeAttempted,
        errors: pipeline.result.errors.length,
        warnings: pipeline.result.warnings.length,
        infos: pipeline.result.infos.length,
        counts: pipeline.result.counts,
        reason: pipeline.reason
      });
      confirm(pipeline.block);
      return report({ step: "BLOCKED", writeResult: null });
    }
    if (!approved) {
      return report({ step: "CANCELLED", verdict: "CANCELLED", writeResult: pipeline.writeResult });
    }
    const action = pipeline.writeResult?.action;
    const step = action === "noop" ? "NOOP" : action === "cancelled" ? "CANCELLED" : pipeline.writeResult?.ok ? "DONE" : "BLOCKED";
    if (step !== "CANCELLED")
      notify(step === "NOOP" ? "추가할 새 질문이 없습니다. 기존 파일을 유지했습니다." : step === "BLOCKED" ? `저장하지 않았습니다.
${pipeline.writeResult?.reason ?? "저장 조건을 확인하세요."}` : cfg.dryRun ? "검증을 완료했습니다. 검증만 실행하여 Obsidian에는 저장하지 않았습니다." : `${vaultPath}
${cfg.mode === "first" ? "처음 저장" : "복습 추가"}를 완료했습니다.`);
    return report({ step, writeResult: pipeline.writeResult });
  }
  function boot() {
    if (typeof document === "undefined")
      return;
    if (!document.body)
      return;
    if (location.pathname.indexOf("/notebook/") === -1)
      return;
    const onCsp = (event) => {
      if (String(event.blockedURI).includes("/_/LabsTailwindUi/data/batchexecute")) {
        report({
          step: "CSP",
          directive: event.effectiveDirective,
          disposition: event.disposition
        });
      }
    };
    document.addEventListener("securitypolicyviolation", onCsp);
    const button = document.createElement("button");
    button.textContent = "NotebookLM archive";
    button.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:10px 14px;" + "border-radius:8px;border:1px solid #888;background:#fff;color:#111;cursor:pointer;";
    const start = async () => {
      if (button.disabled)
        return;
      button.disabled = true;
      try {
        const options = await requestSaveOptions(document, CONFIG);
        if (options)
          await runArchive({
            ...options,
            html: document.documentElement.outerHTML,
            href: location.href,
            notebookId: notebookIdFromUrl(location.href),
            conversationId: null
          });
      } catch {
        window.alert("아카이브 실행을 완료하지 못했습니다. 다시 시도하세요.");
      } finally {
        button.disabled = false;
      }
    };
    button.addEventListener("click", start);
    document.body.appendChild(button);
    window.__nbmArchive = start;
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})();
