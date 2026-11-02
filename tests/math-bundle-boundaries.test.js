import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { convertLatexDelimiters, diagnoseMath } from '../src/markdown-assembler.js';

test('userscript preserves unsupported dollar widths with source-equivalent diagnostics', () => {
  const bundle = readFileSync(new URL('../dist/nbm-archive.user.js', import.meta.url), 'utf8');
  const exposed = bundle.replace(/\}\)\(\);\s*$/, 'globalThis.testConvert=convertLatexDelimiters; globalThis.testDiagnose=diagnoseMath;})();');
  expect(exposed).not.toBe(bundle);
  const context = vm.createContext({console});
  vm.runInContext(exposed, context);
  for (const width of [3, 4, 5, 8]) {
    const delimiter = '$'.repeat(width);
    const source = delimiter + 'x &#43; y' + delimiter + ' and $x &#43; y$';
    const expected = delimiter + 'x &#43; y' + delimiter + ' and $x + y$';
    expect(context.testConvert(source)).toBe(expected);
    expect(JSON.stringify(context.testDiagnose(expected))).toBe(JSON.stringify(diagnoseMath(expected)));
    expect(convertLatexDelimiters(source)).toBe(expected);
  }
});

test('userscript and source agree on v2 candidates and literal tilde', () => {
  const bundle = readFileSync(new URL('../dist/nbm-archive.user.js', import.meta.url), 'utf8');
  const exposed = bundle.replace(/\}\)\(\);\s*$/, 'globalThis.testConvert=convertLatexDelimiters; globalThis.testDiagnose=diagnoseMath;})();');
  const context = vm.createContext({console});
  vm.runInContext(exposed, context);
  for (const source of [String.raw`$&#126;1\text{ eV}$`, String.raw`$\\tau$`, String.raw`\\\(x\\\)`, String.raw`(5\\%)`, String.raw`$\begin{aligned}a\\rho\end{aligned}$`, String.raw`$\verb|\\%|$`, String.raw`https://example.test/$&#126;$`, String.raw`$ftp://example.test/&#126;$`, String.raw`mailto:a@example.test/$&#126;$`, '$x % \\\\tau\n y$', '$x % $ $&#126;$\n y$', '$x % https://example.test/$\n$&#126;$', '$x % $ $\\\\tau$\n y$']) {
    const result = convertLatexDelimiters(source);
    expect(context.testConvert(source)).toBe(result);
    expect(context.testConvert(result)).toBe(result);
    expect(JSON.stringify(context.testDiagnose(result))).toBe(JSON.stringify(diagnoseMath(result)));
  }
});
