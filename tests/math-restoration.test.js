import { test, expect } from 'bun:test';
import { convertLatexDelimiters } from '../src/markdown-assembler.js';

test('restores safe operator entities only inside unprotected math', () => {
  const input = 'A $x &#43; y &#45; z &lt; q$ and ` $&#43;$ ` [x $&#43;$](url)\n';
  expect(convertLatexDelimiters(input)).toBe('A $x + y - z \\lt{} q$ and ` $&#43;$ ` [x $&#43;$](url)\n');
});


test('preserves ambiguous math and reports its saved line', async () => {
  const { diagnoseMath } = await import('../src/markdown-assembler.js');
  const input = 'heading\n$\\text{&#126;} x$\n$\\\\rho$\nValue(\\\\0\\text{ V}\\\\)\n';
  expect(convertLatexDelimiters(input)).toBe(input);
  expect(diagnoseMath(input)).toEqual([{line: 2, kind: 'tilde'}, {line: 3, kind: 'doubled-command'}, {line: 4, kind: 'missing-opener'}]);
});

test('entity variants and delimiters preserve units and literal newlines', () => {
  for (const nl of ['\n', '\r\n', '\r']) {
    const input = String.raw`\(x &#x2B; y &#045; z &#60; q\)` + nl + String.raw`$$1\text{ V} + 2\text{ eV}$$`;
    const expected = String.raw`$x + y - z \lt{} q$` + nl + String.raw`$$1\text{ V} + 2\text{ eV}$$`;
    expect(convertLatexDelimiters(input)).toBe(expected);
    expect(convertLatexDelimiters(expected)).toBe(expected);
  }
});

test('preserves code, links, raw HTML, fenced blocks and ambiguous row breaks', () => {
  const protectedParts = [
    '`$&#43;$`', '[a $&#43;$](https://example.test/`)', '<span title="$&#43;$">',
    '    $&#43;$', '~~~\n$&#43;$\n~~~', '> - ~~~\n>   $&#43;$\n>   ~~~',
    String.raw`$\substack{a\\rho}$`, String.raw`$\begin{aligned}a\\rho\end{aligned}$`,
    String.raw`$a\\rho$`, String.raw`Value(\\0\text{ V}\\)`,
  ];
  for (const source of protectedParts) {
    expect(convertLatexDelimiters(source)).toBe(source);
    expect(convertLatexDelimiters(convertLatexDelimiters(source))).toBe(source);
  }
});

test('does not pair across blocks or incompatible delimiter widths', () => {
  for (const input of [String.raw`\(x\\)`, 'start \\[\n~~~\n$&#43;$\n~~~\n\\]', '$x\n\n&#43;$']) {
    expect(convertLatexDelimiters(input)).toBe(input);
  }
});

test('preserves less-than entities in nested TeX text where operator mode is uncertain', () => {
  const input = String.raw`$\text{&lt;tag&gt;} + x &lt; y$`;
  expect(convertLatexDelimiters(input)).toBe(String.raw`$\text{&lt;tag&gt;} + x \lt{} y$`);
});

test('preserves entities following a TeX backslash and mixed delimiters remain idempotent', () => {
  const input = String.raw`$\&#43; + \&#45; + \&lt;$`;
  expect(convertLatexDelimiters(input)).toBe(input);
  for (const source of [String.raw`\(x $y$ z\)`, String.raw`\[a $b$ c\]`]) {
    const output = convertLatexDelimiters(source);
    expect(convertLatexDelimiters(output)).toBe(output);
  }
});

test('diagnoses preserved encoded operators in math without reporting protected code', async () => {
  const { diagnoseMath } = await import('../src/markdown-assembler.js');
  expect(diagnoseMath(String.raw`$\&#43;$` + '\n`$\\&#43;$`')).toEqual([{line:1,kind:'encoded-operator'}]);
});

test('preserves slash-delimited math with nested dollar delimiters', () => {
  for (const input of [String.raw`\(x $y$ z\)`, String.raw`\[a $$b$$ c\]`]) {
    expect(convertLatexDelimiters(input)).toBe(input);
  }
});

test('diagnoses mixed delimiter candidates without changing them', async () => {
  const { diagnoseMath } = await import('../src/markdown-assembler.js');
  expect(diagnoseMath(String.raw`\(x $y$ z\)`)).toContainEqual({line:1,kind:'mixed-delimiter'});
});

test('nested and mixed math candidates remain byte-identical, adjacent normal math still repairs', async () => {
  const { diagnoseMath } = await import('../src/markdown-assembler.js');
  for (const candidate of [String.raw`\(a \(b\) c\)`, String.raw`\[a \[b\] c\]`, String.raw`$\(x\)$`, '$a $$&#43;$$ b$', '$$a $&#43;$ b$$', String.raw`\(a \[b\] c\)`]) {
    const input = candidate + ' and $x &#43; y$';
    expect(convertLatexDelimiters(input)).toBe(candidate + ' and $x + y$');
    expect(diagnoseMath(input).some(x => x.line === 1)).toBe(true);
  }
});

test('TeX verbatim preserves entities and delimiter characters', () => {
  for (const formula of [String.raw`$\verb|&#43;|$`, String.raw`$\verb|&lt;|$`, String.raw`$\verb+&#45;+$`, String.raw`$\verb*|$\( &#43;|$`, String.raw`$\verb|&#43;$`]) {
    expect(convertLatexDelimiters(formula + ' and $x &#43; y$')).toBe(formula + ' and $x + y$');
  }
});

test('unclosed and mismatched explicit delimiters are diagnosed without touching protected or ordinary text', async () => {
  const { diagnoseMath } = await import('../src/markdown-assembler.js');
  for (const candidate of [String.raw`\(a\] b\)`, String.raw`\(x\\)`, String.raw`\(x &#126;`, '$x &#126;', String.raw`x \)`, '\\(x\ny']) {
    expect(convertLatexDelimiters(candidate)).toBe(candidate);
    expect(diagnoseMath(candidate).some(x => x.line === 1 || x.line === 2)).toBe(true);
  }
  for (const safe of ['ordinary (x)', 'cost $5', '`\\(x &#126;`', '[\\(x &#126;](url)', '<span title="\\(x &#126;">', '```\n\\(x &#126;\n```']) expect(diagnoseMath(safe)).toEqual([]);
});

test('verbatim commands with whitespace or math-marker delimiters remain literal', () => {
  for (const formula of [String.raw`$\verb &#43; $`, '$\\verb\t&#45;\t$', String.raw`$\verb$&#43;$$`, String.raw`$\verb|$\( &#43;|$`]) {
    const input = formula + ' and $x &#43; y$';
    expect(convertLatexDelimiters(input)).toBe(formula + ' and $x + y$');
  }
  const malformed = String.raw`$\verb &#43;$` + '\n\n$x &#43; y$';
  expect(convertLatexDelimiters(malformed)).toBe(String.raw`$\verb &#43;$` + '\n\n$x + y$');
});

test('entities in all braced or unbalanced TeX contexts remain intact and are diagnosed', async () => {
  const { diagnoseMath } = await import('../src/markdown-assembler.js');
  for (const formula of [String.raw`$\url{https://example.test/&#43;}$`, String.raw`$\href{https://example.test/&#45;}{x}$`, String.raw`$\text{&#43;} + x$`, String.raw`$\custom{&#45;}$`, String.raw`$x { &#43;$`, String.raw`$x } &#45;$`]) {
    const output = convertLatexDelimiters(formula + ' and $x &#43; y$');
    expect(output).toBe(formula + ' and $x + y$');
    if (formula.includes('https://')) expect(diagnoseMath(output)).toEqual([]);
    else expect(diagnoseMath(output)).toContainEqual({line:1,kind:'encoded-operator'});
    expect(convertLatexDelimiters(output)).toBe(output);
  }
  expect(convertLatexDelimiters(String.raw`$\{x\} &#43; y$`)).toBe(String.raw`$\{x\} + y$`);
});

test('normal math, escaped braces, units and row breaks remain usable', () => {
  for (const [input, expected] of [
    [String.raw`$\{x\} &#43; 2\text{ V}$`, String.raw`$\{x\} + 2\text{ V}$`],
    [String.raw`$\begin{aligned}x\\y\end{aligned} &#45; z$`, String.raw`$\begin{aligned}x\\y\end{aligned} - z$`],
    [String.raw`$\verbatim &#43; 1$`, String.raw`$\verbatim + 1$`],
    [String.raw`$\text{1\{2\}} &#43; 3$`, String.raw`$\text{1\{2\}} + 3$`],
  ]) expect(convertLatexDelimiters(input)).toBe(expected);
});

test('reports verbatim formulas containing retained encoded operators without logging content', async () => {
  const { diagnoseMath } = await import('../src/markdown-assembler.js');
  expect(diagnoseMath(String.raw`$\verb|literal| + &#43;$`)).toContainEqual({line:1,kind:'verbatim'});
  expect(diagnoseMath(String.raw`$\verb|literal|$`)).toEqual([]);
});

test('unsupported dollar widths are preserved and diagnosed alongside supported math', async () => {
  const { diagnoseMath } = await import('../src/markdown-assembler.js');
  for (const width of [3, 4, 5, 8]) {
    const marker = '$'.repeat(width);
    const candidate = marker + 'x &#43; y' + marker;
    const input = candidate + ' and $x &#43; y$ and \\(z &#45; 1\\)';
    const expected = candidate + ' and $x + y$ and $z - 1$';
    expect(convertLatexDelimiters(input)).toBe(expected);
    expect(convertLatexDelimiters(expected)).toBe(expected);
    expect(diagnoseMath(expected)).toContainEqual({line:1,kind:'mixed-delimiter'});
  }
  for (const candidate of ['$$$x &#43;$$', '$$x &#43;$$$', '$$$x$$$$']) {
    expect(convertLatexDelimiters(candidate)).toBe(candidate);
    expect(diagnoseMath(candidate)).toContainEqual({line:1,kind:'mixed-delimiter'});
  }
  for (const protectedText of ['`$$$x$$$`', '[x $$$x$$$](url)', '<span title="$$$x$$$">', '~~~\n$$$x$$$\n~~~']) {
    expect(convertLatexDelimiters(protectedText)).toBe(protectedText);
    expect(diagnoseMath(protectedText)).toEqual([]);
  }
});
