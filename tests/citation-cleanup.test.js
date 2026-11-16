import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { normalizeTurns } from '../src/adapter.js';
import { assembleFirstArchive, diagnoseSentenceSourceMarkers } from '../src/markdown-assembler.js';

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

test('hyphenated source ranges disappear at the existing cleanup boundaries', () => {
  const markdown = archive('설명 [1-3]. 다음 설명 [1-4]!\n정리 [4-6]\n| mechanism [1-3] | value |\nMore [1-3, 5].');
  expect(markdown).toContain('설명. 다음 설명!\n정리\n| mechanism | value |\nMore.');
});

test('hyphenated ranges retain the existing prose, math, code and link protections', () => {
  const body = '구간 [1-3]. 범위: [4-6].\n내핵 [1]으로 구성. Items [1-3] are selected.\n[1-3]\n$[1-3]$\n`[1-3]`\n```text\nValues [1-3].\n```\nSee [1-3](https://example.com). [[1-3]]';
  expect(archive(body, '출처 [1-3].')).toContain(body);
  expect(archive(body, '출처 [1-3].')).toContain('출처 [1-3].');
});

test('hyphenated reference links and ranges containing defined reference numbers stay intact', () => {
  const body = 'See [1-3].\n[1-3]: https://example.com\nOther [4-6].\n[5]: https://example.org';
  expect(archive(body)).toContain(body);
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


test('preserved ambiguous candidates report their actual lines', () => {
  const body = "Intro\nEnergy $E=mc^2$[1].\n(Explanation [2])\n설명 [3]으로 이어진다.\n$E=mc^2\\text{ [4]}$\nEnergy $x$[5]. 그리고 설명 [6]으로 이어진다.";
  expect(archive(body)).toContain(body);
  expect(diagnoseSentenceSourceMarkers(body)).toEqual([2, 3, 4, 5, 6].map(line => ({ line, kind: 'ambiguous-source-marker' })));
});

test('diagnostics protect problem numbers, indices, arrays, references and code', () => {
  const body = '문제 [4-36]을 푼다.\n$a[1]$와 $[1, 2]$\n배열 [1, 2]으로 구성.\nSee [1](https://example.com).\nReference [2]으로 설명.\n\n[2]: https://example.com\n`설명 [3]으로`\n```text\n설명 [4]으로\n```';
  expect(archive(body)).toContain(body);
  expect(diagnoseSentenceSourceMarkers(body)).toEqual([]);
});

test('compact indices are not source notices', () => {
  const body = 'Evaluate (values[2]).\nvalues[2]와 values[3]을 비교한다.';
  expect(archive(body)).toContain(body);
  expect(diagnoseSentenceSourceMarkers(body)).toEqual([]);
});

test('a reference-looking fenced example does not hide a math-adjacent candidate', () => {
  const body = '$x$[1].\n\n```md\n[1]: example\n```';
  expect(archive(body)).toContain(body);
  expect(diagnoseSentenceSourceMarkers(body)).toEqual([{line:1, kind:'ambiguous-source-marker'}]);
});

test('only valid, unprotected reference definitions suppress new candidates', () => {
  for (const suffix of ['[1]: no actual definition here', String.raw`\begin{verbatim}
[1]: example
\end{verbatim}`]) {
    const body = `$x$[1].\n\n${suffix}`;
    expect(diagnoseSentenceSourceMarkers(body)).toEqual([{line:1, kind:'ambiguous-source-marker'}]);
  }
  expect(diagnoseSentenceSourceMarkers('$x$[1].\n\n[1]: https://example.com')).toEqual([]);
});

test('chained and call indexing are not source notices', () => {
  const body = 'Evaluate (table[i][2]).\nEvaluate (values()[2]).\ntable[i][3]와 values()[4]을 비교한다.';
  expect(diagnoseSentenceSourceMarkers(body)).toEqual([]);
  expect(diagnoseSentenceSourceMarkers('Energy $x$[2].')).toEqual([{line:1, kind:'ambiguous-source-marker'}]);
});

test('escaped verbatim end does not expose a fake reference definition', () => {
  const body = String.raw`$x$[1].

\begin{verbatim}
\\end{verbatim}

[1]: https://example.com
\end{verbatim}`;
  expect(diagnoseSentenceSourceMarkers(body)).toEqual([{line:1, kind:'ambiguous-source-marker'}]);
  expect(archive(body)).toContain(body);
});

test('spaced chained subscripts are not source candidates while prose remains eligible', () => {
  expect(diagnoseSentenceSourceMarkers('Evaluate (table[i] [2]).')).toEqual([]);
  expect(diagnoseSentenceSourceMarkers('(Explanation [2])')).toEqual([{line:1,kind:'ambiguous-source-marker'}]);
});

test('nested and call indices with spacing are not source notices', () => {
  for (const input of ['Evaluate (table[index[0]] [2]).', 'Evaluate (values() [2]).', '다음 값은 table[index[0]] [2]와 같다.']) {
    expect(diagnoseSentenceSourceMarkers(input)).toEqual([]);
    expect(archive(input)).toContain(input);
  }
  for (const input of ['(Explanation [2])', '설명 [1]으로 이어진다.', 'Energy $x$[2].', String.raw`$x\text{ [2]}$`])
    expect(diagnoseSentenceSourceMarkers(input)).toEqual([{line:1,kind:'ambiguous-source-marker'}]);
});

test('physical lines and mixed sentence and math candidates deduplicate by line', () => {
  for (const nl of ['\n','\r\n','\r']) {
    const input = ['A complete sentence ends here. [1] Another sentence follows here. Energy $x$[2].','설명 [3]으로 이어진다.','`설명 [4]으로`', '문제 [4-36]'].join(nl);
    expect(diagnoseSentenceSourceMarkers(input)).toEqual([{line:1,kind:'ambiguous-source-marker'},{line:2,kind:'ambiguous-source-marker'}]);
  }
});
