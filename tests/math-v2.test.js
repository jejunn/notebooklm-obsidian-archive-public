import { test, expect } from 'bun:test';
import { convertLatexDelimiters as convert, diagnoseMath as diagnose } from '../src/markdown-assembler.js';

test('numeric tilde entity becomes a literal glyph in top level math only', () => {
  for (const entity of ['&#126;', '&#00126;', '&#x7e;', '&#X007E;']) {
    const input = `$${entity}1\\text{ eV}$`;
    const output = String.raw`$\text{\char"007E}1\text{ eV}$`;
    expect(convert(input)).toBe(output);
    expect(convert(output)).toBe(output);
  }
  expect(convert(String.raw`$5\% &#126;1$`)).toBe(String.raw`$5\% \text{\char"007E}1$`);
  for (const input of [String.raw`$\text{&#126;}$`, String.raw`$\url{https://example.test/&#126;}$`, String.raw`$https://example.test/&#126;$`, String.raw`$\verb|&#126;|$`, '`$&#126;$`', '[x $&#126;$](url)', '$&tilde;$', '$~$', '$x % &#126;\ny$']) expect(convert(input)).toBe(input);
});

test('general doubled control candidates and unsupported delimiter widths are located without repair', () => {
  for (const input of [String.raw`$\\tau_r$`, String.raw`$\\text{x}$`, String.raw`$\\frac{1}{2}$`, String.raw`$\\propto x$`]) {
    expect(convert(input)).toBe(input);
    expect(diagnose(input)).toContainEqual({line:1,kind:'doubled-command'});
  }
  for (const input of [String.raw`\\\(x\\\)`, String.raw`\\\[x\\\]`]) {
    expect(convert(input)).toBe(input);
    expect(diagnose(input)).toContainEqual({line:1,kind:'mixed-delimiter'});
  }
  expect(diagnose(String.raw`(5\\%)`)).toContainEqual({line:1,kind:'escaped-percent'});
});

test('protected spans and identifiable row breaks are not diagnosed as doubled controls', () => {
  for (const input of [String.raw`$\begin{aligned}a&=b\\rho&=c\end{aligned}$`, String.raw`$\substack{a\\rho}$`, String.raw`$\verb|\\tau \\%|$`, String.raw`$\url{https://example.test/\\tau}$`, String.raw`$https://example.test/\\tau$`, '`$\\tau$`', '[x \\\%](url)', '<span title="\\\\%">', 'https://example.test/\\\\%', String.raw`\verb|\\%|`, String.raw`\url{https://example.test/\\%}`]) {
    expect(diagnose(input).filter(x => ['doubled-command','escaped-percent'].includes(x.kind))).toEqual([]);
  }
});

test('raw URI spans stay opaque across math delimiters and schemes', () => {
  const inputs = [String.raw`https://example.test/$&#126;$`, String.raw`$ftp://example.test/&#126;$`, String.raw`ftp://example.test/$&#126;$`, String.raw`custom+v1://example.test/$&#126;$`, String.raw`mailto:a@example.test/$&#126;$`, String.raw`https://example.test/$\\tau$`, String.raw`https://example.test/\\%`];
  for (const input of inputs) {
    expect(convert(input)).toBe(input);
    expect(diagnose(input)).toEqual([]);
    const adjacent = input + ' and $&#126;1$';
    expect(convert(adjacent)).toBe(input + String.raw` and $\text{\char"007E}1$`);
  }
  for (const protectedText of ['`https://example.test/$&#126;$`', '<span title="https://example.test/$&#126;$">']) {
    expect(convert(protectedText)).toBe(protectedText);
    expect(diagnose(protectedText)).toEqual([]);
  }
});

test('doubled commands in TeX comments are not diagnosed and escaped percent is not a comment', () => {
  const comment = '$x % \\\\tau\n y$';
  expect(convert(comment)).toBe(comment);
  expect(diagnose(comment)).toEqual([]);
  expect(diagnose(String.raw`$x \% \\tau$`)).toContainEqual({line:1,kind:'doubled-command'});
});

test('math tokenizer ignores delimiters inside TeX comments and preserves the formula', () => {
  const comments = [
    '$x % $ $&#126;$\n y$',
    '$x % $ $\\\\tau$\n y$',
    '$x % \\\\(z\\\\) &#126;\n y$',
    '$x % \\[z\\] \\\\tau\n y$',
    '$x % $ ignored\n y &#126;$',
    '$x % https://example.test/a $&#126;$\n y$',
    String.raw`$\text{x % $ &#126;` + '\n' + String.raw` y}$`,
  ];
  for (const input of comments) {
    expect(convert(input)).toBe(input);
    expect(diagnose(input)).toEqual([]);
    expect(convert(input + ' and $&#126;1$')).toBe(input + String.raw` and $\text{\char"007E}1$`);
  }
  const uriComment = '$x % https://example.test/$\n$&#126;$';
  expect(convert(uriComment)).toBe(uriComment);
  expect(diagnose(uriComment)).toEqual([]);
  expect(convert(String.raw`$x \% &#126;$`)).toBe(String.raw`$x \% \text{\char"007E}$`);
  expect(convert('prose % and $&#126;$')).toBe(String.raw`prose % and $\text{\char"007E}$`);
  const verb = String.raw`$\verb|% $ &#126;|$`;
  expect(convert(verb)).toBe(verb);
  expect(diagnose(verb)).toEqual([]);
});
