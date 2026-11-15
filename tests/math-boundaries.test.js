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
