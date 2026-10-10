import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { normalizeTurns } from '../src/adapter.js';
import { assembleFirstArchive } from '../src/markdown-assembler.js';

function archive(answer, question = '페이지 설명') {
  return assembleFirstArchive([
    { id: 'q', ts: 1790583290, kind: 'question', text: question },
    { id: 'a', ts: 1790583297, kind: 'answer', text: answer },
  ], { course: 'test', lecture: 2, conversationId: 'conversation', archivedDate: '2026-10-10' });
}

test('unlinked source markers disappear at sentence and table cell endings', () => {
  const markdown = archive('Solar cells absorb light [1, 2].\nDetails [3]:\n| mechanism [2] | value |');
  expect(markdown).toContain('Solar cells absorb light.\nDetails:\n| mechanism | value |');
});

test('question text remains verbatim even when it asks about a bracketed source', () => {
  expect(archive('Explanation [1].', 'What does [1] mean?')).toContain('What does [1] mean?');
});

test('math intervals, indices, vectors and TeX units are preserved', () => {
  const body = String.raw`$x \in [0, 1]$, $[1, 2]$, $a[1]$, $$\left[\text{A/cm}^2\right]$$`;
  expect(archive(body)).toContain(body);
});

test('fenced and inline code retain numeric brackets', () => {
  const body = '```js\nconst values = [1, 2];\nconsole.log(values[1]);\n```\nUse `values[1]` [2].';
  expect(archive(body)).toContain('```js\nconst values = [1, 2];\nconsole.log(values[1]);\n```\nUse `values[1]`.');
});

test('explicit prose intervals and compact arrays stay intact', () => {
  expect(archive('구간 [1, 2]. 범위: [1, 3]. array [1, 2]. values [1,2].'))
    .toContain('구간 [1, 2]. 범위: [1, 3]. array [1, 2]. values [1,2].');
});

test('Markdown links, reference links, definitions and wiki links stay intact', () => {
  const body = '[1](https://example.com) [label] [2]. [[3]]\n[2]: https://example.com\nSee [2].';
  expect(archive(body)).toContain(body);
});

test('standalone labels and unknown mid-sentence numeric brackets are preserved', () => {
  const body = '[1]\nItems [1, 2] are selected.\nValue [0].';
  expect(archive(body)).toContain(body);
});

test('an unmatched empty math delimiter cannot swallow citations in later paragraphs', () => {
  expect(archive('Broken $$ and $[1, 2]$ text [1].\n\n$$x=1$$'))
    .toContain('Broken $$ and $[1, 2]$ text.\n\n$$x=1$$');
});

test('the observed trailing TeX source annotation is removed without touching equation content', () => {
  expect(archive(String.raw`$$D_p = \frac{\mu_p k T}{q}\quad (\text{Einstein Relation})\quad [1]$$`))
    .toContain(String.raw`$$D_p = \frac{\mu_p k T}{q}\quad (\text{Einstein Relation})$$`);
});

test('synthetic archive removes the reviewed source markers without losing turns or math', () => {
  const wire = JSON.parse(readFileSync(new URL('../fixtures/rpc/conversation.json', import.meta.url), 'utf8'))[0];
  const markdown = assembleFirstArchive(normalizeTurns(wire), {
    course: '예제 과목', lecture: 2, conversationId: '00000000-0000-4000-8000-000000000002', archivedDate: '2026-10-10',
  });
  expect((markdown.match(/\[[1-9]\d*(?:, +[1-9]\d*)*\]/g) ?? []).length).toBe(0);
  expect((markdown.match(/^### Q$/gm) ?? []).length).toBe(87);
  expect((markdown.match(/^### A$/gm) ?? []).length).toBe(87);
  expect(markdown.includes(String.raw`$\alpha$`)).toBe(true);
  expect(markdown.includes(String.raw`\left[\text{A/cm}^2\right]`)).toBe(true);
});
