// Fixture 6 — Phase B case 6
// One answer containing a fenced code block. The 2026-10-05 measurement has
// zero fenced code blocks across all 87 answers (§1.5, "code block 0"), so this
// content is hand-authored to give spec section 7's "preserve the code block"
// requirement something to verify against.
//
// Contract reference: §1.5 — the body extractor returns `turn[4][0][0]`
// verbatim, so the fence must survive assembly byte for byte. This fixture also
// exercises the rest of the Markdown that the measurement confirmed complete:
// headings, bullet lists, numbered lists, bold, inline code, block math
// `\[...\]` and inline math `\(...\)`.
//
// The fence is written as ordinary string concatenation so that no escaping can
// alter the characters the fence is supposed to carry verbatim.

/**
 * @type {Array<{id: string, ts: number, kind: 'question' | 'answer', text: string}>}
 */
export default [
  {
    id: '00000000-0000-4000-8000-000000000024',
    ts: 1790653400,
    kind: 'question',
    text: '2강 9페이지에 있는 침투 깊이 계산 코드를 파이썬으로 다시 써줄래?',
  },
  {
    id: '00000000-0000-4000-8000-000000000025',
    ts: 1790653520,
    kind: 'answer',
    text: '## 침투 깊이 계산\n\n' +
      '광흡수 계수와 두께의 곱으로 침투 깊이를 구합니다.\n\n' +
      '1. 입력값을 정한다.\n' +
      '2. 아래 식으로 계산한다.\n' +
      '3. 단위를 확인한다.\n\n' +
      '계산식은 다음과 같습니다.\n\n' +
      '\\[\n' +
      '\\delta = \\frac{1}{\\alpha} \\ln\\left(\\frac{I_0}{I}\\right)\n' +
      '\\]\n\n' +
      '```python\n' +
      'import math\n\n' +
      '\n' +
      'def penetration_depth(alpha: float, i0: float, i: float) -> float:\n' +
      '    """Penetration depth from Beer-Lambert attenuation, in cm."""\n' +
      '    if alpha <= 0:\n' +
      '        raise ValueError("alpha must be positive")\n' +
      '    return math.log(i0 / i) / alpha\n\n' +
      '\n' +
      'depth = penetration_depth(alpha=1.0e4, i0=1.0, i=0.01)\n' +
      'print(f"depth = {depth:.4f} cm")\n' +
      '```\n\n' +
      '- `alpha`는 흡수 계수입니다.\n' +
      '- `ln`은 자연로그입니다.\n\n' +
      '두께는 \\(d\\) 로 두면 됩니다.',
  },
];