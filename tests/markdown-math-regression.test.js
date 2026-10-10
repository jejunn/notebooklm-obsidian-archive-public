import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { normalizeTurns } from '../src/adapter.js';
import { assembleFirstArchive, convertLatexDelimiters } from '../src/markdown-assembler.js';

test('synthetic doubled inline delimiters produce usable Obsidian math', () => {
  expect(convertLatexDelimiters(String.raw`광흡수계수 \\(\alpha\\)`)).toBe(String.raw`광흡수계수 $\alpha$`);
});

test('doubled display delimiters leave no escaped dollars around the equation', () => {
  expect(convertLatexDelimiters(String.raw`\\[I(x) = I_0 \exp(-\alpha x)\\]`))
    .toBe(String.raw`$$I(x) = I_0 \exp(-\alpha x)$$`);
});

test('single and doubled delimiters can coexist without changing TeX line breaks', () => {
  expect(convertLatexDelimiters(String.raw`\(x\) と \\(y\\) と \\[\begin{aligned}x&=1\\y&=2\end{aligned}\\]`))
    .toBe(String.raw`$x$ と $y$ と $$\begin{aligned}x&=1\\y&=2\end{aligned}$$`);
});

test('inline code examples retain their delimiters while nearby math is converted', () => {
  const source = 'code: `' + String.raw`\\(x\\)` + '`, math: ' + String.raw`\\(y\\)`;
  expect(convertLatexDelimiters(source))
    .toBe('code: `' + String.raw`\\(x\\)` + '`, math: $y$');
});

test('doubled delimiters in fenced source stay byte-identical', () => {
  const source = '```python\n' + String.raw`value = "\\(x\\)"` + '\n```';
  expect(convertLatexDelimiters(source)).toBe(source);
});

test('unmatched delimiter widths do not create a partial math expression', () => {
  const source = String.raw`\\(x\)`;
  expect(convertLatexDelimiters(source)).toBe(source);
});

test('a literal escaped currency dollar is preserved', () => {
  expect(convertLatexDelimiters(String.raw`가격 \$5, 수식 \\(x\\)`)).toBe(String.raw`가격 \$5, 수식 $x$`);
});

test('the synthetic full archive preserves table math without escaped dollar delimiters', () => {
  const wire = JSON.parse(readFileSync(new URL('../fixtures/rpc/conversation.json', import.meta.url), 'utf8'))[0];
  const markdown = assembleFirstArchive(normalizeTurns(wire), {
    course: '예제 과목', lecture: 2,
    conversationId: '00000000-0000-4000-8000-000000000002', archivedDate: '2026-10-10',
  });
  expect(markdown.includes(String.raw`\$\alpha\$`)).toBe(false);
  expect(markdown.includes(String.raw`$\alpha$`)).toBe(true);
  expect(markdown.includes(String.raw`$\rightarrow$`)).toBe(true);
  expect((markdown.match(/^### Q$/gm) ?? []).length).toBe(87);
  expect((markdown.match(/^### A$/gm) ?? []).length).toBe(87);
});
