import { expect, test } from 'bun:test';
import { convertLatexDelimiters, diagnoseMath } from '../src/markdown-assembler.js';

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
