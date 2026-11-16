// Markdown assembler — the output half of the archive tool.
//
// Contract reference: implementation-contract.md section 6.4 (frontmatter and
// body assembly), section 3.2 (empty-answer placeholder), section 5 (review
// session assembly), section 1.5 (the body arrives as Markdown already).
//
// Like the ingest core this module is pure: no network, no filesystem, no
// module-level mutable state, no argument mutation. The turn array it receives
// is the OLDEST-FIRST array the adapter hands over (contract 1.3).
//
// Two shapes are produced and they are deliberately different documents:
//   - assembleFirstArchive  — the whole file, frontmatter included
//   - assembleReviewSession — the `## 추가 질문` fragment appended to a file
// The delta rules D1..D6 that decide *whether* to append live in T4; this
// module only renders, so the renderer cannot quietly invent an append.

import { CoreHardError, runPageStateMachine } from './ingest-core.js';
import { stripSourceMarkers } from './citation-cleanup.js';
import MarkdownIt from './vendor/markdown-it/markdown-it.cjs';

/**
 * Fixed offset for rendering turn timestamps.
 *
 * Contract 3.2's example literal is `2026-09-28 17:14:57`, which is the fixture
 * 3 answer turn `1790583297` read at UTC+09:00. The archive must reproduce that
 * literal byte for byte regardless of where the userscript or the CLI runs, so
 * the wall clock is derived from a fixed offset rather than from the host time
 * zone. A host-local `toLocaleString` would print a different string on a
 * different machine and the placeholder would stop matching the original chat.
 */
export const DEFAULT_UT_OFFSET_MINUTES = 9 * 60;

/**
 * Render a unix second as `YYYY-MM-DD HH:mm:ss` at a fixed UTC offset.
 *
 * `new Date(ms).toISOString()` is UTC by definition, so shifting the epoch by
 * the offset and then reading the UTC fields yields the intended wall clock
 * without ever consulting the host zone.
 *
 * @param {number} ts unix seconds (contract 1.2)
 * @param {{offsetMinutes?: number}} [options]
 * @returns {string}
 */
export function formatTimestamp(ts, options = {}) {
  if (!Number.isInteger(ts)) {
    throw new CoreHardError(`ts is not an integer unix second: ${ts} (§1.2)`);
  }
  const offsetMinutes = options.offsetMinutes ?? DEFAULT_UT_OFFSET_MINUTES;
  if (!Number.isInteger(offsetMinutes)) {
    throw new CoreHardError(`offsetMinutes is not an integer: ${offsetMinutes}`);
  }
  const shifted = new Date((ts + offsetMinutes * 60) * 1000);
  return shifted.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Render a unix second as `YYYY-MM-DD` at a fixed UTC offset.
 *
 * Used for the `archived` frontmatter field (contract 6.4) and for the review
 * session's `### YYYY-MM-DD` heading (spec section 13.1).
 *
 * @param {number} ts unix seconds
 * @param {{offsetMinutes?: number}} [options]
 * @returns {string}
 */
export function formatDate(ts, options = {}) {
  return formatTimestamp(ts, options).slice(0, 10);
}

// ---------------------------------------------------------------------------
// LaTeX delimiters
// ---------------------------------------------------------------------------

// Contract 6.4: `\(...\)` becomes `$...$` and `\[...\]` becomes `$$...$$`.
// Obsidian renders dollar-delimited math, so the NotebookLM escaping is undone
// here rather than by the extractor (contract 1.5 returns the body verbatim).
//
// Inline code, fenced and indented code are NOT touched. Fixture 6 carries a Python fence
// whose source legitimately contains backslashes; rewriting delimiters inside
// it would corrupt code that the user came here to read. The display form is
// converted before the inline form because `\[` and `\(` are distinct, but the
// order is fixed anyway so a future edit cannot introduce an overlap.
// The parser supplies source-line ranges for nested Markdown code blocks.
// CommonMark block parsing takes precedence over prospective inline math.
const markdownBlocks = new MarkdownIt('commonmark');
// Capture the exact source positions consumed by the parser's own inline
// rules. This avoids reimplementing escape, link, HTML and backtick precedence.
const markdownInline = new MarkdownIt('commonmark');
for (const name of ['backticks', 'link', 'image', 'autolink', 'html_inline']) {
  const rule = markdownInline.inline.ruler.__rules__.find(entry => entry.name === name).fn;
  markdownInline.inline.ruler.at(name, (state, silent) => {
    const start = state.pos;
    const count = state.tokens.length;
    const result = rule(state, silent);
    const capture = state.env.inlineSourceRanges;
    if (result && !silent && capture && state.src === capture.source &&
        (name !== 'backticks' || state.tokens.slice(count).some(token => token.type === 'code_inline'))) {
      capture.ranges.push([start, state.pos]);
    }
    return result;
  });
}
// Recorded bodies use both single and doubled delimiter backslashes. Consume
// the whole delimiter and require equal widths at each end; otherwise a
// leftover backslash escapes the resulting dollar sign in Markdown. TeX inside
// the delimiters (including \\\\ line breaks) remains byte-identical.
const DISPLAY_MATH = /(?<!\\)(\\{1,2})\[([\s\S]*?)(?<!\\)\1\]/g;
const INLINE_MATH = /(?<!\\)(\\{1,2})\(([\s\S]*?)(?<!\\)\1\)/g;

/**
 * Convert LaTeX delimiters outside code fences.
 *
 * CommonMark block parsing identifies code and raw HTML source lines before
 * any math matching. These lines are emitted byte for byte; an opening math
 * delimiter cannot pair across a code block. Inline code is protected within
 * each remaining segment, including multiline spans.
 *
 * @param {string} text
 * @returns {string} the same text with `\(...\)` and `\[...\]` re-delimited
 */
export function diagnoseSentenceSourceMarkers(text) {
  const found = [];
  const references = new Set([...text.matchAll(/^[ \t]*\[(\d+)\]:/gm)].map(m => m[1]));
  // Share literal boundaries with the transform before resolving references.
  const referenceLines = text.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) ?? [];
  const literalLines = texLiteralLines(referenceLines);
  const referenceText = referenceLines.map((line, index) =>
    literalLines.has(index) ? line.replace(/[^\r\n]/g, ' ') : line).join('');
  const markdownEnv = {};
  markdownBlocks.parse(referenceText, markdownEnv);
  const realReferences = new Set(Object.keys(markdownEnv.references ?? {}));
  processMathBlocks(text, (part, base) => {
    const regions = mathRegions(part);
    const verbs = [...part.matchAll(/(?<!\\)\\verb\*?(?![A-Za-z])([^\r\n])[^\r\n]*?(?:\1|$)/gm)];
    const add = offset => {
      const line = (text.slice(0, base + offset).match(/\r\n|\r|\n/g) ?? []).length + 1;
      if (!found.some(item => item.line === line && item.kind === 'ambiguous-source-marker'))
        found.push({ line, kind: 'ambiguous-source-marker' });
    };
    // New candidates remain untouched by cleanup. Scan each occurrence,
    // independently of the paragraph-wide guard for sentence candidates.
    for (const match of part.matchAll(/\[([1-9]\d*)\]/g)) {
      const offset = match.index;
      const prefix = part.slice(0, offset).split(/\r\n|\r|\n/).at(-1);
      const suffix = part.slice(offset + match[0].length);
      const region = regions.find(r => offset >= r.start && offset < r.end);
      if (realReferences.has(match[1]) || verbs.some(v => offset >= v.index && offset < v.index + v[0].length)) continue;
      if (region) {
        const before = part.slice(region.start, offset);
        const after = part.slice(offset + match[0].length, region.end);
        if (/\\text\{[ \t]*$/.test(before) && /^\}[ \t]*(?:\${1,2}|\\{1,2}[)\]])$/.test(after)) add(offset);
        continue;
      }
      if (/(?:구간|범위|배열|좌표|벡터|인덱스|interval|range|array|indices?|vector|coordinates?|matrix)\s*[:=]?\s*$/i.test(prefix)) continue;
      const afterMath = regions.some(r => r.end === offset && !r.ambiguous && !r.unclosed);
      const compactIndex = /[\p{L}\p{N}_\])}]$/u.test(prefix);
      const beforeClose = !compactIndex && /\p{L}/u.test(prefix) && /^\)/.test(suffix);
      const beforeParticle = !compactIndex && /\p{L}/u.test(prefix) && /^(?:으로|로|은|는|이|가|을|를|의|에|와|과|에서|까지|부터)/u.test(suffix);
      if (afterMath || beforeClose || beforeParticle) add(offset);
    }
    return part.replace(/([.!?。])([ \t]+)\[([1-9]\d*)\]([ \t]+)(?=[A-Z가-힣])/gu, (whole, punctuation, before, number, after, offset) => {
      const absolute = base + offset;
      const lineStart = Math.max(text.lastIndexOf('\n', absolute - 1), text.lastIndexOf('\r', absolute - 1)) + 1;
      const beforeParagraph = text.slice(0, absolute).split(/\r?\n[ \t]*\r?\n/).at(-1);
      const afterParagraph = text.slice(absolute).split(/\r?\n[ \t]*\r?\n/)[0];
      const paragraph = beforeParagraph + afterParagraph;
      if (references.has(number) || [...paragraph.matchAll(/\[\d+(?:[,-]\s*\d+)*\]/g)].length !== 1) return whole;
      if (!/\p{L}.{5,}/u.test(text.slice(lineStart, absolute))) return whole;
      if (regions.some(region => region.start < offset + whole.length && region.end > offset) || verbs.some(v => v.index < offset + whole.length && v.index + v[0].length > offset)) return whole;
      add(offset);
      return whole;
    });
  }, true, markdownEnv.references ?? {});
  return found.sort((a, b) => a.line - b.line);
}

export function convertLatexDelimiters(text) {
  return processMathBlocks(text, part => convertMath(part));
}

export function convertAnswerLatexDelimiters(text) {
  return processMathBlocks(text, part => convertMath(part, true), true);
}

// Return whole lines owned by literal environments, including unclosed ones.
function texLiteralLines(lines) {
  const literalLines = new Set();
  let environment = null;
  for (let line = 0; line < lines.length; line += 1) {
    let cursor = 0;
    let owned = environment !== null;
    const startPattern = /(?<!\\)\\begin\s*\{(verbatim\*?|Verbatim\*?)\}/g;
    while (cursor < lines[line].length) {
      if (environment) {
        const end = `\\end{${environment}}`;
        let index = lines[line].indexOf(end, cursor);
        while (index > 0 && lines[line][index - 1] === '\\') index = lines[line].indexOf(end, index + end.length);
        if (index < 0) break;
        cursor = index + end.length;
        environment = null;
      } else {
        startPattern.lastIndex = cursor;
        const start = startPattern.exec(lines[line]);
        if (!start) break;
        owned = true;
        environment = start[1];
        cursor = startPattern.lastIndex;
      }
    }
    if (owned) literalLines.add(line);
  }
  return literalLines;
}

function processMathBlocks(text, processor, protectLiteral = false, referenceOverride = null) {
  if (typeof text !== 'string') {
    throw new CoreHardError('text is not a string (§1.2)');
  }
  // Keep each original line ending: the parser normalizes CR and CRLF.
  const lines = text.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) ?? [];
  const protectedLines = new Set();
  const inlineBlocks = new Map();
  if (protectLiteral) for (const line of texLiteralLines(lines)) protectedLines.add(line);
  const env = {};
  for (const token of markdownBlocks.parse(text, env)) {
    if (!token.map) continue;
    if (token.type === 'fence' || token.type === 'code_block' || token.type === 'html_block') {
      for (let line = token.map[0]; line < token.map[1]; line += 1) protectedLines.add(line);
    } else if (token.type === 'inline') {
      for (let line = token.map[0]; line < token.map[1]; line += 1) inlineBlocks.set(line, token);
    }
  }

  if (referenceOverride !== null) env.references = referenceOverride;
  const output = [];
  let prose = [];
  let currentBlock = null;
  let sourceOffset = 0;
  let proseOffset = 0;
  const flush = () => {
    if (prose.length) output.push(convertSegment(prose, currentBlock, env, processor, proseOffset, protectLiteral));
    prose = [];
  };
  for (let line = 0; line < lines.length; line += 1) {
    const block = inlineBlocks.get(line);
    if (protectedLines.has(line) || block === undefined) {
      flush();
      currentBlock = null;
      output.push(lines[line]);
    } else {
      if (block !== currentBlock) flush();
      currentBlock = block;
      if (!prose.length) proseOffset = sourceOffset;
      prose.push(lines[line]);
    }
    sourceOffset += lines[line].length;
  }
  flush();
  return output.join('');
}

/**
 * Convert the delimiters inside one segment that is known not to be in a fence.
 *
 * The replacement is a function, not a string, so a `$` inside the math body is
 * never read as a `$`-substitution pattern. Display math is converted first, and
 * both forms run over the whole segment, so a `\[` on one line and its `\]` on
 * another still pair up.
 *
 * @param {string} segment
 * @returns {string}
 */
function convertSegment(lines, token, env, processor, baseOffset, protectLiteral) {
  const segment = lines.join('');
  const contentLines = token.content.split('\n');
  const offsets = [];
  let base = 0;
  // Block parsing removes container prefixes and can normalize tabs. Map only
  // unambiguous exact source text; otherwise leave the entire block untouched.
  if (contentLines.length > lines.length) return segment;
  for (let i = 0; i < contentLines.length; i += 1) {
    const raw = lines[i].replace(/(?:\r\n|\r|\n)$/, '');
    const content = contentLines[i];
    const index = content ? raw.indexOf(content) : raw.length;
    if (index < 0 || (content && index !== raw.lastIndexOf(content))) return segment;
    for (let j = 0; j < content.length; j += 1) offsets.push(base + index + j);
    if (i + 1 < contentLines.length) offsets.push(base + raw.length);
    base += lines[i].length;
  }

  const capture = { source: token.content, ranges: [] };
  markdownInline.inline.parse(token.content, markdownInline, { ...env, inlineSourceRanges: capture }, []);
  const ranges = capture.ranges.map(([start, end]) => [offsets[start], offsets[end - 1] + 1]);
  // Protect complete raw URI spans before math tokenization, including any
  // dollar or slash delimiters that happen to occur in a URI. Require an
  // explicit scheme and authority marker (or mailto) to avoid treating prose as a URL.
  const uriRanges = [];
  for (const match of segment.matchAll(/(?<![A-Za-z0-9+.-])(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/|mailto:)[^\s<>]+/gi)) {
    uriRanges.push([match.index, match.index + match[0].length]);
  }
  // Preserve a comment-containing math region as a whole even when a URI
  // appears within the comment. Mask URIs in place to retain source offsets
  // while preventing URI dollar characters from becoming math tokens.
  const literalRanges = protectLiteral
    ? [...segment.matchAll(/(?<!\\)\\verb\*?(?![A-Za-z])([^\r\n])[^\r\n]*?(?:\1|$)/gm)].map(match => [match.index, match.index + match[0].length])
    : [];
  let masked = segment;
  for (const [start, end] of [...ranges, ...uriRanges, ...literalRanges]) masked = masked.slice(0, start) + ' '.repeat(end - start) + masked.slice(end);
  for (const region of mathRegions(masked)) {
    if (region.hasComment || literalRanges.some(([start, end]) => start < region.end && end > region.start)) ranges.push([region.start, region.end]);
  }
  ranges.push(...uriRanges, ...literalRanges);
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let converted = '';
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start < cursor) {
      if (end > cursor) converted += segment.slice(cursor, end);
      cursor = Math.max(cursor, end);
      continue;
    }
    converted += processor(segment.slice(cursor, start), baseOffset + cursor) + segment.slice(start, end);
    cursor = end;
  }
  return converted + processor(segment.slice(cursor), baseOffset + cursor);
}

// Return the width of one physical line ending; CRLF is indivisible.
function lineEndingWidth(text, offset) {
  if (text[offset] === '\r') return text[offset + 1] === '\n' ? 2 : 1;
  return text[offset] === '\n' ? 1 : 0;
}

function blankLineAfter(text, offset) {
  const width = lineEndingWidth(text, offset);
  if (!width) return false;
  let next = offset + width;
  while (text[next] === ' ' || text[next] === '\t') next += 1;
  return lineEndingWidth(text, next) > 0;
}

function beforeBlankLine(text) {
  for (let i = 0; i < text.length;) {
    const width = lineEndingWidth(text, i);
    if (width && blankLineAfter(text, i)) return text.slice(0, i);
    i += width || 1;
  }
  return text;
}

// A row is owned only by an environment open at the row whose nesting
// closes in order before another math delimiter or paragraph boundary.
function hasClosingTexEnvironment(text, start, row) {
  const scopes = [];
  let depth = 0;
  let rowDepth = 0;
  for (let i = start; i < text.length;) {
    if (i === row) {
      rowDepth = scopes.length;
      if (!rowDepth) return false;
    }
    const lineWidth = lineEndingWidth(text, i);
    if (i > row && (text[i] === '$' || (lineWidth && blankLineAfter(text, i)))) return false;
    if (lineWidth) { i += lineWidth; continue; }
    if (text[i] === '%') {
      const end = text.slice(i).search(/[\r\n]/);
      i = end < 0 ? text.length : i + end;
      continue;
    }
    if (text[i] === '\\') {
      if (text[i + 1] === '\\') { i += 2; continue; }
      const verb = /^\\verb\*?(?![A-Za-z])([^\r\n])/.exec(text.slice(i));
      if (verb) {
        const end = text.indexOf(verb[1], i + verb[0].length);
        const lineEnd = text.slice(i + verb[0].length).search(/[\r\n]/);
        if (end < 0 || (lineEnd >= 0 && end >= i + verb[0].length + lineEnd)) return false;
        i = end + 1;
        continue;
      }
      const command = /^\\(begin|end)\s*\{([^{}]+)\}/.exec(text.slice(i));
      if (command && depth === 0) {
        if (command[1] === 'begin' && /^(?:verbatim\*?|Verbatim\*?)$/.test(command[2])) {
          const end = `\\end{${command[2]}}`;
          let index = text.indexOf(end, i + command[0].length);
          while (index > 0 && text[index - 1] === '\\') index = text.indexOf(end, index + end.length);
          if (index < 0 || (i < row && index >= row)) return false;
          i = index + end.length;
          continue;
        }
        if (command[1] === 'begin') scopes.push(command[2]);
        else {
          if (scopes.at(-1) !== command[2]) return false;
          scopes.pop();
          if (rowDepth && scopes.length < rowDepth) return true;
        }
        i += command[0].length;
        continue;
      }
      if (i > row && /[\[\]()]/.test(text[i + 1] || '')) return false;
      i += Math.min(2, text.length - i);
      continue;
    }
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') depth = Math.max(0, depth - 1);
    i += 1;
  }
  return false;
}

// Find complete delimiter regions before changing any bytes. Nested or mixed
// pairs are ambiguous and remain untouched. Verbatim contents are opaque.
function mathRegions(text) {
  const token = /(?<!\\)(\\+)([\[\]()])|(?<!\\)(\$+)/g;
  const regions = [];
  let stack = [];
  let start = 0;
  let ambiguous = false;
  let hasVerb = false;
  let hasComment = false;
  let match;
  while ((match = token.exec(text))) {
    // A TeX verbatim region can contain delimiter-looking characters. Skip it
    // only if its delimiter closes on the same line; otherwise fail closed.
    if (stack.length) {
      // Interpret comments only after an opening math token. A comment hides
      // delimiter tokens until the next physical line, but verbatim payloads
      // and escaped percent signs are opaque while searching for it.
      let skippedComment = false;
      for (let i = stack.at(-1).after; i < match.index; i += 1) {
        if (text[i] === '\\') {
          const verb = /^\\verb\*?(?![A-Za-z])/.exec(text.slice(i));
          if (verb) {
            const pos = i + verb[0].length;
            const delimiter = text[pos];
            const end = delimiter && !/[\r\n]/.test(delimiter) ? text.indexOf(delimiter, pos + 1) : -1;
            const lineEnd = text.slice(pos + 1).search(/[\r\n]/);
            if (end >= 0 && (lineEnd < 0 || end < pos + 1 + lineEnd)) { i = end; continue; }
          }
          i += 1;
        } else if (text[i] === '%') {
          hasComment = true;
          const offset = text.slice(i).search(/[\r\n]/);
          const next = offset < 0 ? text.length : i + offset + 1;
          token.lastIndex = next;
          stack.at(-1).after = next;
          skippedComment = true;
          break;
        }
      }
      if (skippedComment) continue;
      const prefix = text.slice(stack.at(-1).after, match.index + 1);
      const verbs = [...prefix.matchAll(/(?<!\\)\\verb\*?(?![A-Za-z])/g)];
      const verb = verbs.at(-1);
      if (verb) {
        hasVerb = true;
        const delimiterIndex = stack.at(-1).after + verb.index + verb[0].length;
        const delimiter = text[delimiterIndex];
        const begin = delimiterIndex + 1;
        const end = delimiter && delimiter !== '\n' && delimiter !== '\r' ? text.indexOf(delimiter, begin) : -1;
        const newline = text.slice(begin).search(/[\r\n]/);
        if (end >= 0 && (newline < 0 || end < begin + newline) && match.index <= end) {
          token.lastIndex = end + 1;
          stack.at(-1).after = end + 1;
          continue;
        }
      }
    }
    const slash = match[1];
    const glyph = match[2];
    const dollar = match[3];
    const isOpen = slash && (glyph === '(' || glyph === '[');
    const type = dollar || slash + (glyph === '(' || glyph === ')' ? '()' : '[]');
    if (!stack.length) {
      if (slash && !isOpen) {
        regions.push({start:match.index, end:token.lastIndex, ambiguous:true, orphan:true});
        continue;
      }
      start = match.index;
      ambiguous = false;
      hasVerb = false;
      hasComment = false;
      stack.push({type, after:token.lastIndex});
      continue;
    }
    const top = stack.at(-1);
    // A double slash within a braced TeX argument is a row break; the
    // following bracket or parenthesis is content rather than the delimiter.
    let braceDepth = 0;
    const ownedPrefix = text.slice(start, match.index);
    for (let i = 0; i < ownedPrefix.length; i += 1) {
      if (ownedPrefix[i] === '%') {
        const end = ownedPrefix.slice(i).search(/[\r\n]/);
        if (end < 0) break;
        i += end - 1;
        continue;
      }
      if (ownedPrefix[i] === '\\') {
        const verb = /^\\verb\*?(?![A-Za-z])([^\r\n])/.exec(ownedPrefix.slice(i));
        if (verb) {
          const begin = i + verb[0].length;
          const end = ownedPrefix.indexOf(verb[1], begin);
          const lineEnd = ownedPrefix.slice(begin).search(/[\r\n]/);
          if (end >= 0 && (lineEnd < 0 || end < begin + lineEnd)) { i = end; continue; }
        }
        i += 1;
        continue;
      }
      if (ownedPrefix[i] === '{') braceDepth += 1;
      else if (ownedPrefix[i] === '}') braceDepth = Math.max(0, braceDepth - 1);
    }
    if (braceDepth > 0 && slash === '\\\\' && (glyph === ']' || glyph === ')')) {
      top.after = token.lastIndex;
      continue;
    }
    // In a TeX environment, a double slash can be a row break followed by
    // a literal bracket or parenthesis, even when it resembles a closer.
    if (slash === '\\\\' && (glyph === ']' || glyph === ')') &&
        hasClosingTexEnvironment(text, start, match.index)) {
      top.after = token.lastIndex;
      continue;
    }
    // Recover after a mismatched closer at the end of its opening line.
    // Otherwise an invalid line can consume unrelated math on following lines.
    const mismatchedCloser = (slash && !isOpen && top.type !== type) ||
      (dollar && top.type !== type && top.type !== '$' && top.type !== '$$');
    // An explicit display owner with its own later closing delimiter keeps
    // ambiguous contents together; otherwise recover on the physical line.
    const remaining = beforeBlankLine(text.slice(token.lastIndex));
    const displayOwnerCloses = (top.type === '$$' && /(?<![\\$])\$\$(?!\$)/.test(remaining)) ||
      (/^\\{1,2}\[\]$/.test(top.type) &&
      new RegExp(`(?<!\\\\)${'\\\\'.repeat(top.type.length - 2)}\\]`).test(remaining));
    const sameLine = remaining.split(/[\r\n]/, 1)[0];
    const sameLineOwnerCloses = top.type === '$' ? /(?<![\\$])\$(?!\$)/.test(sameLine) :
      /^\\{1,2}\(\)$/.test(top.type) &&
      new RegExp(`(?<!\\\\)${'\\\\'.repeat(top.type.length - 2)}\\)`).test(sameLine);
    if (stack.length === 1 && mismatchedCloser && !displayOwnerCloses && !sameLineOwnerCloses &&
        !/[\r\n]/.test(text.slice(start, match.index))) {
      regions.push({start, end:token.lastIndex, ambiguous:true});
      stack = [];
      continue;
    }
    if ((dollar && top.type === type) || (slash && !isOpen && top.type === type)) {
      stack.pop();
      if (!stack.length) {
        regions.push({start, end:token.lastIndex, ambiguous, hasVerb, hasComment, type});
      } else stack.at(-1).after = token.lastIndex;
    } else if (slash && !isOpen) {
      ambiguous = true;
      top.after = token.lastIndex;
    } else {
      ambiguous = true;
      stack.push({type, after:token.lastIndex});
    }
  }
  if (stack.length) regions.push({start, end:text.length, ambiguous:true, unclosed:true, hasComment,
    explicit:stack.some(x => x.type !== '$' && x.type !== '$$')});
  return regions;
}

function convertMath(text, repairMissingOpener = false) {
  // A malformed opener can be recovered only when the complete candidate is
  // a numeric quantity enclosed by prose parentheses and the orphan closer
  // belongs to no existing math region. All other orphan syntax stays intact.
  const regions = mathRegions(text);
  const verbs = [...text.matchAll(/(?<!\\)\\verb\*?(?![A-Za-z])([^\r\n])[^\r\n]*?(?:\1|$)/gm)];
  const pattern = /\((\\\\)([+-]?(?:\d+(?:\.\d+)?|\.\d+))(\\text\{ [A-Za-zµΩ]{1,4}\})(\\\\\))(?=[^\r\n]*\p{L})/gu;
  if (repairMissingOpener) text = text.replace(pattern, (whole, slash, number, unit, closer, offset) => {
    if (verbs.some(v => v.index < offset + whole.length && v.index + v[0].length > offset)) return whole;
    const closeStart = offset + whole.length - closer.length;
    const owner = regions.find(region => region.start <= closeStart && region.end > closeStart);
    if (!owner?.orphan || owner.start !== closeStart || regions.some(region => region.start < closeStart && region.end > offset)) return whole;
    if (!/\p{L}/u.test(text.slice(0, offset).split(/\r\n|\r|\n/).at(-1))) return whole;
    return `($${number}${unit}$)`;
  });
  let result = '';
  let cursor = 0;
  for (const region of mathRegions(text)) {
    result += text.slice(cursor, region.start);
    const original = text.slice(region.start, region.end);
    if (region.ambiguous || region.hasVerb || region.hasComment) result += original;
    else if (region.type === '$' || region.type === '$$') result += convertDollarMath(original, repairMissingOpener);
    else if (/^\\{1,2}(?:\(\)|\[\])$/.test(region.type)) {
      const width = region.type.length - 2;
      const marker = region.type.endsWith('[]') ? '$$' : '$';
      result += convertDollarMath(marker + original.slice(width + 1, -(width + 1)) + marker, repairMissingOpener);
    } else result += original;
    cursor = region.end;
  }
  return result + text.slice(cursor);
}

function convertDollarMath(text, repairSimpleText = false) {
  if (repairSimpleText) text = text.replace(/^\$\\\\text\{([^\\{}%#$&_\^~\r\n]+)\}\$$/, (_match, content) => `$\\text{${content}}$`);
  return text.replace(/(?<![\\$])(\${1,2})(?!\$)(?:(?!\n[ \t]*\n)[\s\S])*?(?<![\\$])\1(?!\$)/g, (math) => {
    // Unknown macro arguments and unbalanced braces are not operator context.
    let depth = 0;
    let balanced = true;
    for (let i = 0; i < math.length; i += 1) {
      if (math[i] === '\\') { i += 1; continue; }
      // TeX comments make subsequent tokens opaque through the line ending.
      if (math[i] === '%') return math;
      if (math[i] === '{') depth += 1;
      else if (math[i] === '}') depth -= 1;
      if (depth < 0) balanced = false;
    }
    if (depth !== 0 || !balanced) return math;
    let result = math.replace(/(?<!\\)&(?:#(?:0*43|x0*2b|0*45|x0*2d)|lt|#0*60|#x0*3c|#0*126|#x0*7e);/gi, (entity, offset, source) => {
      let level = 0;
      for (let i = 0; i < offset; i += 1) {
        if (source[i] === '\\') { i += 1; continue; }
        if (source[i] === '{') level += 1;
        else if (source[i] === '}') level -= 1;
      }
      if (level !== 0 || /\b(?:https?:\/\/|mailto:)[^\s<>$]*$/i.test(source.slice(0, offset))) return entity;
      if (/^&#(?:0*126|x0*7e);$/i.test(entity)) return '\\text{\\char"007E}';
      if (/^&#(?:0*43|x0*2b);$/i.test(entity)) return '+';
      if (/^&#(?:0*45|x0*2d);$/i.test(entity)) return '-';
      return '\\lt{}';
    });
    return result;
  });
}

/** Return source line numbers for ambiguous candidates, without note content. */
export function diagnoseMath(text) {
  const found = [];
  const add = (offset, kind) => {
    const line = (text.slice(0, offset).match(/\r\n|\r|\n/g) ?? []).length + 1;
    if (!found.some(item => item.line === line && item.kind === kind)) found.push({ line, kind });
  };
  processMathBlocks(text, (part, base) => {
    // Mask raw URLs without changing offsets; parser-owned Markdown links are already protected.
    const scan = part
      .replace(/(?<!\\)\\verb\*?(?![A-Za-z])([^\r\n])[^\r\n]*?(?:\1|$)/gm, m => ' '.repeat(m.length))
      .replace(/\b(?:https?:\/\/|mailto:)[^\s<>]*/gi, m => ' '.repeat(m.length));
    const regions = mathRegions(part);
    for (const match of scan.matchAll(/(?<!\\)\\\\%(?![A-Za-z])/g)) {
      if (!regions.some(region => match.index >= region.start && match.index < region.end)) add(base + match.index, 'escaped-percent');
    }
    // Detect the narrow absent-opener case before generic orphan closers.
    for (const match of part.matchAll(/(?<!\\)\\\\\d[^\r\n]*?(?<!\\)\\\\\)/g)) add(base + match.index, 'missing-opener');
    for (const region of regions) {
      if (region.orphan) {
        const line = (text.slice(0, base + region.start).match(/\r\n|\r|\n/g) ?? []).length + 1;
        if (found.some(item => item.line === line && item.kind === 'missing-opener')) continue;
      }
      const value = part.slice(region.start, region.end);
      // A TeX comment can contain arbitrary apparent commands and delimiters.
      // Suppress this region's diagnostics when its structure is uncertain.
      let comment = false;
      for (let i = 0; i < value.length; i += 1) {
        if (value[i] === '\\') i += 1;
        else if (value[i] === '%') { comment = true; break; }
      }
      if (comment || region.hasComment) continue;
      if (region.ambiguous) {
        if (!region.unclosed || region.explicit || /&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(value))
          add(base + region.start, 'mixed-delimiter');
        continue;
      }
      if (region.type && ((/^\$+$/.test(region.type) && region.type.length > 2) || /^\\{3,}/.test(region.type))) {
        add(base + region.start, 'mixed-delimiter');
        continue;
      }
      if (region.hasVerb) {
        if (/&(?:#(?:0*43|x0*2b|0*45|x0*2d|0*60|x0*3c)|lt);/i.test(value)) add(base + region.start, 'verbatim');
        continue;
      }
      for (const match of value.matchAll(/&#(?:0*43|x0*2b|0*45|x0*2d);/gi)) add(base + region.start + match.index, 'encoded-operator');
      for (const match of value.matchAll(/&(?:lt|#0*60|#x0*3c);/gi)) add(base + region.start + match.index, 'less-than');
      for (const match of value.matchAll(/&(?:#0*126|#x0*7e|tilde);/gi)) add(base + region.start + match.index, 'tilde');
      // A row break in an explicit environment or a braced argument is ambiguous;
      // avoid presenting identifiable row constructs as broken commands.
      if (!/\\begin\s*\{/.test(value)) {
        const candidate = scan.slice(region.start, region.end);
        let depth = 0;
        for (let i = 0; i < candidate.length; i += 1) {
          if (candidate[i] === '\\') {
            if (depth === 0 && candidate[i + 1] === '\\' && /[A-Za-z]/.test(candidate[i + 2] || '')) add(base + region.start + i, 'doubled-command');
            i += 1;
          } else if (candidate[i] === '{') depth += 1;
          else if (candidate[i] === '}') depth = Math.max(0, depth - 1);
        }
      }
    }
    return part;
  });
  return found.sort((a, b) => a.line - b.line);
}

// ---------------------------------------------------------------------------
// YAML frontmatter
// ---------------------------------------------------------------------------

// Quote a scalar only when a plain one would change meaning: an empty value, a
// leading YAML indicator character, a `: ` or ` #` sequence inside, edge
// whitespace, an embedded quote character, a control character (a newline in
// the middle of a course name would break the block into two lines and make the
// file unreadable by this tool's own parseFrontmatter), or a bare type keyword
// that would parse as a boolean or null.
const CONTROL_CHAR = /[\u0000-\u001F\u007F]/;
const PLAIN_UNSAFE =
  /^[-?:,[\]{}#&*!|>'"%@`]|^$|^\s|\s$|:\s|\s#|["']|^(true|false|yes|no|on|off|null|~)$/i;
const NUMERIC_LIKE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

/**
 * Render one YAML scalar for the frontmatter block.
 *
 * @param {string|number|boolean} value
 * @returns {string}
 */
export function yamlScalar(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new CoreHardError(`frontmatter value is not a finite number: ${value}`);
    }
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value !== 'string') {
    throw new CoreHardError(`frontmatter value is not a scalar: ${value}`);
  }
  if (PLAIN_UNSAFE.test(value) || NUMERIC_LIKE.test(value) || CONTROL_CHAR.test(value)) {
    return quoteYamlString(value);
  }
  return value;
}

/**
 * Quote a string unconditionally, escaping every character that would otherwise
 * end the scalar or the physical line.
 *
 * A backslash and a double quote are escaped as themselves. A control character
 * is escaped with its YAML two-character form so the scalar stays on ONE
 * physical line: `course` is user-supplied and user-confirmed (contract 9), and
 * a pasted course name carrying a newline would otherwise be written raw and
 * make the block unreadable to this tool's own parseFrontmatter, which keys
 * D1..D6 on those fields. Escaping keeps the value lossless — `parseYamlScalar`
 * in the delta rules decodes these same two-character forms.
 *
 * Turn IDs and the conversation ID go through here rather than through
 * `yamlScalar`: they are opaque wire values that may begin with a digit or a
 * hyphen, and the contract's own frontmatter example quotes all three.
 *
 * @param {string} value
 * @returns {string}
 */
function quoteYamlString(value) {
  const escaped = value.replace(/[\\"\u0000-\u001F\u007F]/g, (character) => {
    switch (character) {
      case '\\':
        return '\\\\';
      case '"':
        return '\\"';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\t':
        return '\\t';
      case '\b':
        return '\\b';
      case '\f':
        return '\\f';
      case '\0':
        return '\\0';
      default:
        return `\\x${character.charCodeAt(0).toString(16).padStart(2, '0')}`;
    }
  });
  return `"${escaped}"`;
}

/**
 * Build the frontmatter block for a first archive (contract 6.4).
 *
 * The eight fields are fixed and no Dataview query is emitted: the document has
 * to behave normally in Obsidian with no plugin installed (spec section 8).
 *
 * `archive_turns` is the TURN count, not the pair count — the recorded value
 * for the measured run is 174 = 87 questions + 87 answers, and the delta rules
 * key on turn IDs rather than counts anyway (contract 5).
 *
 * @param {{course: string, lecture: number, conversationId: string, archivedDate: string, turns: Array<object>}} meta
 * @returns {string} the `---` delimited YAML block, without a trailing newline
 */
export function renderFrontmatter(meta) {
  const { course, lecture, conversationId, archivedDate, turns } = meta;
  if (typeof course !== 'string' || course.length === 0) {
    throw new CoreHardError('frontmatter course is missing (contract 6.4, §9)');
  }
  if (!Number.isInteger(lecture)) {
    throw new CoreHardError('frontmatter lecture must be the number the user confirmed (contract 6.4, §9)');
  }
  if (typeof conversationId !== 'string' || conversationId.length === 0) {
    throw new CoreHardError('frontmatter conversation id is missing (contract 6.1)');
  }
  if (typeof archivedDate !== 'string' || archivedDate.length === 0) {
    throw new CoreHardError('frontmatter archive date is missing (contract 6.4)');
  }
  if (!Array.isArray(turns) || turns.length === 0) {
    throw new CoreHardError('a first archive has no turns (contract 6.4)');
  }

  // Turn IDs are always quoted: they are opaque strings that may begin with a
  // digit or a hyphen, and the contract's own example quotes them.
  const firstTurn = turns[0];
  const lastTurn = turns[turns.length - 1];
  if (typeof firstTurn?.id !== 'string' || typeof lastTurn?.id !== 'string') {
    throw new CoreHardError('a turn has no string id (contract 1.2)');
  }

  const lines = [
    'type: notebooklm-study',
    `course: ${yamlScalar(course)}`,
    `lecture: ${yamlScalar(lecture)}`,
    `archived: ${yamlScalar(archivedDate)}`,
    `archive_turns: ${yamlScalar(turns.length)}`,
    `archive_first_turn: ${quoteYamlString(firstTurn.id)}`,
    `archive_last_turn: ${quoteYamlString(lastTurn.id)}`,
    `archive_conversation: ${quoteYamlString(conversationId)}`,
  ];
  return ['---', ...lines, '---'].join('\n');
}

// ---------------------------------------------------------------------------
// Body blocks
// ---------------------------------------------------------------------------

/**
 * The empty-answer placeholder (contract 3.2, spec section 6).
 *
 * The line is byte-identical to the contract's example:
 * `> (이 답변 기록이 비어 있습니다 — 2026-09-28 17:14:57)`.
 *
 * The timestamp is the ANSWER turn's `ts`, never the question's (contract 3.1),
 * so a later comparison against the original chat lands on the right turn.
 *
 * @param {number} answerTs
 * @param {{offsetMinutes?: number}} [options]
 * @returns {string}
 */
export function renderEmptyAnswerPlaceholder(answerTs, options = {}) {
  return `> (이 답변 기록이 비어 있습니다 — ${formatTimestamp(answerTs, options)})`;
}

/**
 * Render one question/answer pair under the given heading depth.
 *
 * Contract 3.1 and 3.2: the answer heading is NEVER omitted. An empty answer
 * body fills the body slot with the placeholder line; dropping the heading
 * instead would leave a hole in the Obsidian outline that page-level navigation
 * depends on (spec section 6, section 18).
 *
 * A question with no answer turn at all renders no answer heading. That is not
 * the empty-answer case: the answer turn exists and its body is empty. A
 * missing answer means the alternation structure is broken, which the core
 * already reports as grade `error` and blocks on save (contract 1.4, 3.3).
 *
 * @param {{question: object, answer: object|null}} pair
 * @param {{questionHeading: string, answerHeading: string, offsetMinutes?: number}} options
 * @returns {string[]} markdown lines
 */
function renderPair(pair, options) {
  const { questionHeading, answerHeading, offsetMinutes = DEFAULT_UT_OFFSET_MINUTES } = options;

  // One block per pair, so the body sits directly under its heading. That is
  // how the contract's own rendered examples read (sections 3.2 and 6.4):
  // `### Q` then the question text on the next line, no blank line between.
  const lines = [questionHeading, convertLatexDelimiters(pair.question.text)];

  if (pair.answer !== null && pair.answer !== undefined) {
    lines.push('', answerHeading);
    lines.push(
      pair.answer.text === ''
        ? renderEmptyAnswerPlaceholder(pair.answer.ts, { offsetMinutes })
        : stripSourceMarkers(convertAnswerLatexDelimiters(pair.answer.text))
    );
  }

  return lines.join('\n');
}

/**
 * Join blocks with one blank line between them, which is what the contract's
 * rendered examples show throughout sections 3.2 and 6.4.
 *
 * @param {string[]} blocks
 * @returns {string}
 */
function joinBlocks(blocks) {
  return blocks.join('\n\n');
}

/**
 * The page-group heading text.
 *
 * First archive uses `## N페이지`; a review session nests one level deeper as
 * `#### N페이지` (contract 6.4, spec section 13.1). A review question with no
 * page gets `#### 페이지 미지정` (spec section 13.2) — a page number is never
 * invented for it (contract 2.6).
 *
 * @param {number|null} page
 * @param {{depth: 'first'|'review'}} placement
 * @returns {string}
 */
export function renderPageHeading(page, placement) {
  const marker = placement === 'review' ? '####' : '##';
  if (page === null || page === undefined) {
    // Contract 2.6: the unclassified group has NO heading in a first archive,
    // and `#### 페이지 미지정` in a review session. The caller handles the
    // first-archive case by passing null and skipping the heading.
    if (placement !== 'review') {
      throw new CoreHardError('a first archive does not render a heading for an unclassified group (contract 2.6)');
    }
    return `${marker} 페이지 미지정`;
  }
  return `${marker} ${page}페이지`;
}

// ---------------------------------------------------------------------------
// First archive
// ---------------------------------------------------------------------------

/**
 * Assemble the complete file for a first archive (contract 6.4, spec section 6).
 *
 * Heading depth:
 *   `# N강`      lecture, from the lecture number the user confirmed (§9)
 *   `## N페이지` page group
 *   `### Q` / `### A`
 *
 * Page groups come straight from the core's state machine, so conversation
 * order is preserved and a revisited page opens its heading again
 * (contract 2.2). Unclassified questions are rendered under the lecture
 * heading with NO page-group heading — contract 2.6 says a first archive
 * creates no heading for them — but they are still rendered, because dropping
 * turns would break the "nothing lost" success criterion (spec section 18).
 *
 * @param {Array<object>} turns oldest-first normalized turns
 * @param {{course: string, lecture: number, conversationId: string, archived?: string, archivedDate?: string, offsetMinutes?: number}} meta
 * @returns {string} the whole file
 */
export function assembleFirstArchive(turns, meta) {
  const offsetMinutes = meta.offsetMinutes ?? DEFAULT_UT_OFFSET_MINUTES;
  const { groups } = runPageStateMachine(turns, { pageChoices: meta.pageChoices });
  const archivedDate = meta.archivedDate ?? meta.archived;

  const blocks = [
    renderFrontmatter({ ...meta, archivedDate, turns }),
    `# ${meta.lecture}강`,
  ];

  for (const group of groups) {
    // Contract 2.6: an unclassified group gets no heading on the first archive.
    if (!(group.page === null && group.unclassified)) {
      blocks.push(renderPageHeading(group.page, 'first'));
    }
    for (const pair of group.items) {
      blocks.push(renderPair(pair, { questionHeading: '### Q', answerHeading: '### A', offsetMinutes }));
    }
  }

  return `${joinBlocks(blocks)}\n`;
}

// ---------------------------------------------------------------------------
// Review session
// ---------------------------------------------------------------------------

/**
 * Assemble the `## 추가 질문` fragment for a review session (spec section 13.1,
 * contract section 5).
 *
 * Heading depth:
 *   `## 추가 질문`  the section, placed at the END of the file
 *   `### YYYY-MM-DD` the session date
 *   `#### N페이지`   page group, nested so an existing `## 23페이지` is untouched
 *   `##### Q` / `##### A`
 *
 * Two rules are load-bearing and are enforced by construction here:
 *   - No reclassification. The fragment never mentions an existing `## N페이지`
 *     heading, so the same page number can legitimately exist twice in the file
 *     (spec 13.1). The decision of whether the file already has a
 *     `## 추가 질문` section belongs to the delta rules (D6) in T4.
 *   - Conversation order is kept. Groups are not sorted by page (spec 13.1).
 *
 * `includeSection` and `includeDate` are additive options used by the delta
 * rules in T4: D6 creates the `## 추가 질문` section only when the file does
 * not already have one, and design spec 13.4 reuses an existing
 * `### YYYY-MM-DD` heading instead of opening a second one. Both default to
 * true, so the standalone fragment is unchanged.
 *
 * @param {Array<object>} turns oldest-first normalized turns, the new turns only
 * @param {{date: string, offsetMinutes?: number, includeSection?: boolean, includeDate?: boolean}} options `date` is `YYYY-MM-DD`
 * @returns {string} the section fragment, ending with a newline
 */
export function assembleReviewSession(turns, options) {
  const offsetMinutes = options.offsetMinutes ?? DEFAULT_UT_OFFSET_MINUTES;
  const includeSection = options.includeSection ?? true;
  const includeDate = options.includeDate ?? true;
  const date = options.date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new CoreHardError(`review session date must be YYYY-MM-DD: ${date} (spec 13.1)`);
  }

  const { groups } = runPageStateMachine(turns, { initialPage: options.initialPage ?? null, pageChoices: options.pageChoices });

  const blocks = [];
  if (includeSection) blocks.push('## 추가 질문');
  if (includeDate) blocks.push(`### ${date}`);

  for (const group of groups) {
    blocks.push(renderPageHeading(group.page, 'review'));
    for (const pair of group.items) {
      blocks.push(renderPair(pair, { questionHeading: '##### Q', answerHeading: '##### A', offsetMinutes }));
    }
  }

  return `${joinBlocks(blocks)}\n`;
}

/**
 * Append a review-session fragment after the existing file content.
 *
 * The existing content is returned with its own bytes intact. Nothing in the
 * existing body is rewritten, moved or reclassified; the only thing added is a
 * horizontal rule from the spec's rendering (spec 13.1) and the fragment
 * itself.
 *
 * Whether to call this at all is the delta decision, and it is not made here
 * (contract 5, T4).
 *
 * @param {string} existingContent the current file text
 * @param {string} fragment the output of `assembleReviewSession`
 * @returns {string} existingContent followed by the fragment
 */
export function appendReviewSession(existingContent, fragment) {
  if (typeof existingContent !== 'string') {
    throw new CoreHardError('existing file content is not a string');
  }
  if (typeof fragment !== 'string') {
    throw new CoreHardError('review session fragment is not a string');
  }
  if (existingContent.length === 0) {
    return fragment;
  }
  const base = existingContent.replace(/\n+$/, '');
  return `${base}\n\n---\n\n${fragment}`;
}
