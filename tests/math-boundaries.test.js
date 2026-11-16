import { expect, test } from 'bun:test';
import { convertLatexDelimiters, convertAnswerLatexDelimiters, diagnoseMath } from '../src/markdown-assembler.js';

const inside = String.raw`$\\rho &#43; 1$`;
const prose = String.raw`$\\Delta &#45; 2$`;
const repaired = String.raw`$\\Delta - 2$`;

test('nested code block containers and newline variants preserve exact bytes', () => {
  for (const nl of ['\n', '\r\n', '\r']) for (const [open, prefix, close] of [
    ['~~~~', '', '~~~~'], ['- > ~~~', '  > ', '  > ~~~'], ['> - > ~~~', '>   > ', '>   > ~~~'],
  ]) {
    const block = open + nl + prefix + inside + nl + close;
    const input = block + nl + nl + prose;
    const output = block + nl + nl + repaired;
    expect(convertLatexDelimiters(input)).toBe(output);
    expect(convertLatexDelimiters(output)).toBe(output);
    expect(diagnoseMath(block)).toEqual([]);
  }
});

test('parser inline boundaries preserve code after links, images, HTML and escaped backticks', () => {
  for (const prefix of ['[x](https://example.test/`)', '<https://example.test/`>', '<span title="`">x</span>', '![alt](https://example.test/`)', '[label](https://example.test/ "` title")']) {
    for (const [opener, closer] of [['`','`'], ['\\``','`'], ['\\```','``'], ['``','``']]) {
      const code = opener + inside + closer;
      const source = prefix + ' ' + code + ' and ' + prose;
      const output = prefix + ' ' + code + ' and ' + repaired;
      expect(Bun.markdown.html(code)).toContain('<code>');
      expect(convertLatexDelimiters(source)).toBe(output);
      expect(convertLatexDelimiters(output)).toBe(output);
    }
  }
});

test('block transitions, multiline code and mapping failures are conservative', () => {
  const code = '`first\n> ' + inside + '`';
  const input = '> [x][ref] ' + code + ' and ' + prose + '\n\n[ref]: https://example.test/`';
  expect(convertLatexDelimiters(input)).toBe('> [x][ref] ' + code + ' and ' + repaired + '\n\n[ref]: https://example.test/`');
  const bad = 'text\0`' + inside + '` and ' + prose;
  expect(convertLatexDelimiters(bad + '\n\n' + prose)).toBe(bad + '\n\n' + repaired);
  const fence = 'start \\[\n~~~\n' + inside + '\n~~~\n\\]';
  expect(convertLatexDelimiters(fence + '\n\n' + prose)).toBe(fence + '\n\n' + repaired);
  expect(convertLatexDelimiters('    ' + inside + '\n\n' + prose)).toBe('    ' + inside + '\n\n' + repaired);
});

test('answer repairs a whole simple doubled text command in one pass', () => {
  const expected = String.raw`$\text{OH}$`;
  for (const input of [String.raw`$\\text{OH}$`, String.raw`\(\\text{OH}\)`, String.raw`\\(\\text{OH}\\)`]) {
    expect(convertAnswerLatexDelimiters(input)).toBe(expected);
    expect(convertAnswerLatexDelimiters(expected)).toBe(expected);
    expect(convertLatexDelimiters(input)).toBe(String.raw`$\\text{OH}$`);
  }
  expect(convertAnswerLatexDelimiters(String.raw`A $\\text{OH}$ and \(\\text{Na}\) B`)).toBe(String.raw`A $\text{OH}$ and $\text{Na}$ B`);
});

test('answer preserves complex doubled commands and protected regions', () => {
  for (const input of [
    String.raw`$\text{OH}$`, String.raw`$\\text{}$`, String.raw`$\\frac{1}{2}$`, String.raw`$x + \\text{OH}$`,
    String.raw`$$\\text{OH}$$`, String.raw`$\\text{a{b}}$`, String.raw`$\\text{a\%b}$`,
    String.raw`$\\text{a%b}$`, String.raw`$\\text{a#b}$`, String.raw`$\\text{a_b}$`,
    '$\\\\text{a\nb}$', String.raw`$\begin{matrix}a\\text{OH}\end{matrix}$`,
    String.raw`$\begin{aligned}a&=b\\text{OH}\end{aligned}$`,
    String.raw`\verb|$\\text{OH}$|`, '`$\\\\text{OH}$`', '[x $\\\\text{OH}$](url)',
    '\\begin{verbatim}\n$\\\\text{OH}$\n\\end{verbatim}',
  ]) expect(convertAnswerLatexDelimiters(input)).toBe(input);
  expect(diagnoseMath(String.raw`$\\frac{1}{2}$`)).toContainEqual({line: 1, kind: 'doubled-command'});
});

test('adjacent mixed delimiters recover at the next complete math line', () => {
  const input = String.raw`$x\]
\(y$
$z &#43; w$`;
  const output = String.raw`$x\]
\(y$
$z + w$`;
  expect(diagnoseMath(input)).toEqual([
    {line:1, kind:'mixed-delimiter'}, {line:2, kind:'mixed-delimiter'},
    {line:3, kind:'encoded-operator'},
  ]);
  expect(convertAnswerLatexDelimiters(input)).toBe(output);
  expect(convertAnswerLatexDelimiters(output)).toBe(output);
});

test('multiline math owners retain row breaks, comments and ambiguous nested content', () => {
  const matrix = String.raw`\[\begin{matrix} a\\]
% $z &#43; w$
b\end{matrix}\]`;
  expect(convertLatexDelimiters(matrix)).toBe(matrix);
  expect(convertAnswerLatexDelimiters(matrix)).toBe(matrix);
  expect(diagnoseMath(matrix)).toEqual([]);
  const ambiguous = String.raw`\[a\)
$\\text{OH}$
b\]`;
  expect(convertLatexDelimiters(ambiguous)).toBe(ambiguous);
  expect(convertAnswerLatexDelimiters(ambiguous)).toBe(ambiguous);
  expect(diagnoseMath(ambiguous)).toEqual([{line:1, kind:'mixed-delimiter'}]);
});

test('recovery handles trailing punctuation, formatting and particles without swallowing healthy math', () => {
  for (const [first, second] of [[String.raw`$x\].`, String.raw`\(y$.`], [String.raw`$x\]**`, String.raw`\(y$는`]]) {
    const input = `${first}\n${second}\n$z &#43; w$`;
    expect(diagnoseMath(input)).toEqual([{line:1, kind:'mixed-delimiter'}, {line:2, kind:'mixed-delimiter'}, {line:3, kind:'encoded-operator'}]);
    expect(convertAnswerLatexDelimiters(input)).toBe(`${first}\n${second}\n$z + w$`);
    expect(convertLatexDelimiters(input)).toBe(`${first}\n${second}\n$z + w$`);
  }
});

test('closed display math preserves comments and answer commands in all supported delimiters', () => {
  for (const [open, close] of [['$$', '$$'], [String.raw`\[`, String.raw`\]`], [String.raw`\\[`, String.raw`\\]`]]) {
    for (const comment of [String.raw`% $z &#43; w$`, String.raw`% $\\text{OH}$`]) {
      const input = `${open}\\begin{matrix} a\\\\]\n${comment}\nb\\end{matrix}${close}`;
      expect(convertLatexDelimiters(input)).toBe(input);
      expect(convertAnswerLatexDelimiters(input)).toBe(input);
      expect(diagnoseMath(input)).toEqual([]);
    }
  }
});

test('inline math owners retain same-line closers and braced row breaks', () => {
  const inline = String.raw`$x\] &#43; y$
$z &#43; w$`;
  const output = String.raw`$x\] &#43; y$
$z + w$`;
  expect(diagnoseMath(inline)).toEqual([{line:1, kind:'mixed-delimiter'}, {line:2, kind:'encoded-operator'}]);
  expect(convertLatexDelimiters(inline)).toBe(output);
  expect(convertAnswerLatexDelimiters(inline)).toBe(output);
  for (const comment of [String.raw`% $z &#43; w$`, String.raw`% $\\text{OH}$`]) {
    const input = String.raw`$x_{\substack{a\\]` + '\n' + comment + '\n' + String.raw`b}}$`;
    expect(convertLatexDelimiters(input)).toBe(input);
    expect(convertAnswerLatexDelimiters(input)).toBe(input);
    expect(diagnoseMath(input)).toEqual([]);
  }
});

test('row breaks before right parentheses and brackets keep owned TeX comments intact', () => {
  for (const glyph of [')', ']']) for (const comment of [String.raw`% $z &#43; w$`, String.raw`% $\\text{OH}$`]) {
    for (const [start, end] of [[String.raw`$x_{\substack{a`, String.raw`b}}$`], [String.raw`$\begin{matrix} a`, String.raw`b\end{matrix}$`]]) {
      const input = start + '\\\\' + glyph + '\n' + comment + '\n' + end;
      expect(convertLatexDelimiters(input)).toBe(input);
      expect(convertAnswerLatexDelimiters(input)).toBe(input);
      expect(diagnoseMath(input)).toEqual([]);
    }
  }
  expect(convertLatexDelimiters(String.raw`\\(x\\)`)).toBe('$x$');
  expect(convertLatexDelimiters(String.raw`\(x\)`)).toBe('$x$');
});

test('nested environment ownership survives closed inner scopes and ignores fake commands', () => {
  for (const inner of ['matrix', 'aligned']) for (const glyph of [')', ']']) for (const comment of [String.raw`% $z &#43; w$`, String.raw`% $\\text{OH}$`]) {
    const input = String.raw`$\begin{matrix} \begin{` + inner + String.raw`} a \end{` + inner + String.raw`}\\` + glyph + '\n' + comment + '\n' + String.raw`b\end{matrix}$`;
    expect(convertLatexDelimiters(input)).toBe(input);
    expect(convertAnswerLatexDelimiters(input)).toBe(input);
    expect(diagnoseMath(input)).toEqual([]);
  }
  const fake = String.raw`$\begin{matrix} \text{\end{matrix}} \verb|\end{matrix}|
% \end{matrix}
\\)
% $z &#43; w$
b\end{matrix}$`;
  expect(convertAnswerLatexDelimiters(fake)).toBe(fake);
  expect(diagnoseMath(fake)).toEqual([]);
  const literal = String.raw`$\begin{matrix} \begin{verbatim}\end{matrix}\end{verbatim}\\)
% $z &#43; w$
b\end{matrix}$`;
  expect(convertLatexDelimiters(literal)).toBe(literal);
  expect(diagnoseMath(literal)).toEqual([]);
});

test('unmatched environment ends cannot claim unrelated following math', () => {
  for (const prefix of [String.raw`$\begin{matrix} \end{aligned}\\)`, String.raw`$\text{\begin{matrix}}\\)`, String.raw`$\\begin{matrix}\\)`]) {
    const input = prefix + '\n$z &#43; w$';
    expect(convertAnswerLatexDelimiters(input)).toBe(prefix + '\n$z + w$');
  }
});

test('environment row ownership preserves physical newline formats', () => {
  for (const nl of ['\n', '\r', '\r\n']) for (const glyph of [')', ']']) for (const comment of [String.raw`% $z &#43; w$`, String.raw`% $\\text{OH}$`]) {
    for (const inner of ['', String.raw`\begin{matrix} a \end{matrix}`]) {
      const input = [String.raw`$\begin{matrix} ` + (inner || 'a') + '\\\\' + glyph, comment, String.raw`b\end{matrix}$`].join(nl);
      expect(convertLatexDelimiters(input)).toBe(input);
      expect(convertAnswerLatexDelimiters(input)).toBe(input);
      expect(diagnoseMath(input)).toEqual([]);
    }
  }
});

test('real whitespace-only physical lines stop environment ownership', () => {
  for (const [first, second, spaces] of [['\r\n','\r\n',''], ['\r\n','\r',' \t'], ['\r','\n','\t'], ['\n','\r\n',' ']]) {
    const input = String.raw`$\begin{matrix} a\\)` + first + spaces + second + String.raw`$z &#43; w$` + first + String.raw`\end{matrix}$`;
    expect(convertAnswerLatexDelimiters(input)).toContain('$z + w$');
  }
});

test('comment and verb payload braces do not claim real doubled closers', () => {
  for (const nl of ['\n','\r\n','\r']) for (const [open, close] of [[String.raw`\\(`, String.raw`\\)`], [String.raw`\\[`, String.raw`\\]`]]) {
    for (const content of [String.raw`a % {`, String.raw`a \verb|{|`, String.raw`a \% text % {`]) {
      const first = [open + content, 'b' + close, '$z &#43; w$'].join(nl);
      const expected = first.replace('&#43;', '+');
      expect(convertLatexDelimiters(first)).toBe(expected);
      expect(convertAnswerLatexDelimiters(first)).toBe(expected);
      expect(diagnoseMath(first)).toContainEqual({line:3,kind:'encoded-operator'});
    }
  }
});

test('literal closing braces do not release genuinely braced rows', () => {
  for (const nl of ['\n','\r\n','\r']) for (const glyph of [')',']']) for (const content of [String.raw`a % }`, String.raw`a \verb|}|`]) {
    const input = [String.raw`$x_{\substack{` + content, '\\\\' + glyph, '% $z &#43; w$', String.raw`b}}$`].join(nl);
    expect(convertLatexDelimiters(input)).toBe(input);
    expect(convertAnswerLatexDelimiters(input)).toBe(input);
    expect(diagnoseMath(input)).toEqual([]);
  }
});

test('literal environments do not hide doubled closers from following math', () => {
  for (const nl of ['\n','\r\n','\r']) for (const [open,close] of [[String.raw`\\(`,String.raw`\\)`],[String.raw`\\[`,String.raw`\\]`]]) {
    const input = [open + 'a',String.raw`\begin{verbatim}`,'{',String.raw`\end{verbatim}`,'b' + close,'$z &#43; w$'].join(nl);
    const marker = open.endsWith('(') ? '$' : '$$';
    const expected = [marker + 'a',String.raw`\begin{verbatim}`,'{',String.raw`\end{verbatim}`,'b' + marker,'$z + w$'].join(nl);
    expect(convertLatexDelimiters(input)).toBe(expected);
    expect(diagnoseMath(input)).toContainEqual({line:6,kind:'encoded-operator'});
  }
});
