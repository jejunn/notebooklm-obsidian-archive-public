import { test, expect } from 'bun:test';
import { convertLatexDelimiters, convertAnswerLatexDelimiters } from '../src/markdown-assembler.js';

test('repairs a missing opener only for a parenthesized numeric unit wrapper', () => {
  const input = String.raw`Value (\\0\text{ V}\\) is small.`;
  const expected = String.raw`Value ($0\text{ V}$) is small.`;
  expect(convertAnswerLatexDelimiters(input)).toBe(expected);
  expect(convertLatexDelimiters(input)).toBe(input);
  expect(convertAnswerLatexDelimiters(expected)).toBe(expected);
});

test('preserves ambiguous numeric and protected contexts', () => {
  const samples = [
    String.raw`Value \\0\text{ V}\\) is small.`,
    String.raw`Value (\\0\text{ V}\\)`, // no surrounding sentence
    String.raw`Value (\\0\text{ uncertain units}\\) is small.`,
    String.raw`$x + (\\0\text{ V}\\)$`,
    String.raw`\(x + (\\0\text{ V}\\)\)`,
    String.raw`\verb|Value (\\0\text{ V}\\) is small.|`,
    '`' + String.raw`Value (\\0\text{ V}\\) is small.` + '`',
    String.raw`[Value (\\0\text{ V}\\) is small.](https://example.test)`,
    '```\n' + String.raw`Value (\\0\text{ V}\\) is small.` + '\n```',
  ];
  for (const s of samples) expect(convertAnswerLatexDelimiters(s)).toBe(s);
});

import { diagnoseSentenceSourceMarkers } from '../src/markdown-assembler.js';
test('preserves an ambiguous isolated marker between two sentences', () => {
  const s = 'A complete sentence ends here. [1] Another sentence follows here.';
  expect(diagnoseSentenceSourceMarkers(s)).toEqual([{line: 1, kind: 'ambiguous-source-marker'}]);
});
test('preserves numeric markers in protected or ambiguous structures', () => {
  const cases = [
    'A complete sentence ends here. [1] First item. [2] Second item.',
    'A complete sentence ends here. [1] First item.\n[2] Second item.',
    'A complete sentence ends here. [1] Another sentence follows here.\n\n[1]: https://example.test',
    '`A complete sentence ends here. [1] Another sentence follows here.`',
    '[A complete sentence ends here. [1] Another sentence follows here.](https://example.test)',
    '$A complete sentence ends here. [1] Another sentence follows here.$',
    '```\nA complete sentence ends here. [1] Another sentence follows here.\n```',
    'A complete sentence ends here.\n[1] Another sentence follows here.',
  ];
  for (const s of cases) expect(diagnoseSentenceSourceMarkers(s)).toEqual([]);
});

test('userscript and source agree for v3 answer transformations', async () => {
  const { readFileSync } = await import('node:fs');
  const vm = await import('node:vm');
  const bundle = readFileSync(new URL('../dist/nbm-archive.user.js', import.meta.url), 'utf8');
  const exposed = bundle.replace(/\}\)\(\);\s*$/, 'globalThis.testAnswer=convertAnswerLatexDelimiters;globalThis.testSentence=diagnoseSentenceSourceMarkers;})();');
  expect(exposed).not.toBe(bundle);
  const context = vm.createContext({console}); vm.runInContext(exposed, context);
  for (const s of [String.raw`Value (\\0\text{ V}\\) is small.`, String.raw`$x + (\\0\text{ V}\\)$`, 'A complete sentence ends here. [1] Another sentence follows here.', 'A complete sentence ends here. [1] First item.\n[2] Second item.', String.raw`\verb| ` + '`abc` ' + String.raw`Value (\\0\text{ V}\\) is small.|`, String.raw`\begin{verbatim}` + '\n' + String.raw`Value (\\0\text{ V}\\) is small.` + '\n' + String.raw`\end{verbatim}`]) {
    expect(context.testAnswer(s)).toBe(convertAnswerLatexDelimiters(s));
    expect(JSON.stringify(context.testSentence(s))).toBe(JSON.stringify(diagnoseSentenceSourceMarkers(s)));
  }
});

test('retains whole TeX verbatim owners across Markdown code and URI splits', () => {
  const inner = String.raw`Value (\\0\text{ V}\\) is small.`;
  for (const prefix of [String.raw`\verb| `, String.raw`\verb*| `]) {
    for (const split of ['`abc` ', '[label](https://example.test) ', '<span title="x"> ', 'https://example.test/path ']) {
      const source = prefix + split + inner + '|';
      expect(convertAnswerLatexDelimiters(source)).toBe(source);
    }
  }
});
test('retains literal environment contents across block and protected-source boundaries', () => {
  const inner = String.raw`Value (\\0\text{ V}\\) is small.`;
  for (const name of ['verbatim', 'verbatim*', 'Verbatim']) {
    const source = `\\begin{${name}}\n` + '`abc`\n\n' + inner + `\n\\end{${name}}`;
    expect(convertAnswerLatexDelimiters(source)).toBe(source);
  }
});

test('preserves a verbatim formula and continues transforming separate math on its line', () => {
  for (const formula of [String.raw`$\verb|&#43;|$`, String.raw`$\verb|literal| + &#43;$`]) {
    const s = formula + ' and $x &#43; y$';
    expect(convertAnswerLatexDelimiters(s)).toBe(formula + ' and $x + y$');
  }
});

test('source marker diagnostics respect verbatim owners spanning protected chunks', () => {
  const s = 'A complete sentence ends here. [1] Another sentence follows here.';
  for (const text of [String.raw`\verb|` + '`code` ' + s + '|', String.raw`\begin{verbatim}` + '\n' + s + '\n' + String.raw`\end{verbatim}`]) {
    expect(diagnoseSentenceSourceMarkers(text)).toEqual([]);
  }
});

test('protects a second literal environment opened after one closes on the same line', () => {
  const source = String.raw`\begin{verbatim}x\end{verbatim} \begin{verbatim}` + '\n\n' + String.raw`Value (\\0\text{ V}\\) is small.` + '\n' + String.raw`\end{verbatim}`;
  expect(convertAnswerLatexDelimiters(source)).toBe(source);
});

test('does not treat a doubled slash inside a verbatim environment as its end', () => {
  const source = String.raw`\begin{verbatim}` + '\n' + String.raw`\\end{verbatim}` + '\n\n' + String.raw`Value (\\0\text{ V}\\) is small.` + '\n' + String.raw`\end{verbatim}`;
  expect(convertAnswerLatexDelimiters(source)).toBe(source);
});

test('literal environments retain payloads through blank lines, alternate endings and EOF', () => {
  const inner = String.raw`Value (\\0\text{ V}\\) is small.`;
  for (const newline of ['\n', '\r\n', '\r']) {
    for (const name of ['verbatim', 'verbatim*', 'Verbatim']) {
      const start = `\\begin{${name}}`;
      const wrong = name === 'verbatim' ? String.raw`\end{verbatim*}` : String.raw`\end{verbatim}`;
      for (const suffix of ['', newline + `\\end{${name}}`]) {
        const input = start + newline + wrong + newline + newline + inner + suffix;
        expect(convertAnswerLatexDelimiters(input)).toBe(input);
      }
    }
  }
});
