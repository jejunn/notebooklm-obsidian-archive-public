// Remove unlinked NotebookLM source labels from rendered answers only.
// Numeric brackets are ambiguous: preserve code, math, links, explicit ranges,
// standalone labels and mid-sentence uses. This is a conservative formatting
// rule, not a semantic classifier or a change to the verbatim ingest core.
const FENCE = /^([ \t]*)(`{3,}|~{3,})([^\n]*)$/;
// Math cannot pair across a blank paragraph. An unmatched inline $$ in the
// recorded prose must not hide a whole section until an unrelated equation.
const PROTECTED = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)|(?<![\\$])(\${1,2})(?!\$)(?:(?!\n[ \t]*\n)[\s\S])*?(?<![\\$])\2(?!\$)/g;
const MARKER = /[ \t]+\[([1-9]\d*(?:-[1-9]\d*)?(?:, +[1-9]\d*(?:-[1-9]\d*)?)*)\](?=[.,:;!?。]|[ \t]*(?:\n|$|\|))/g;
const RANGE_LABEL = /(?:구간|범위|배열|좌표|벡터|인덱스|interval|range|array|indices?|vector|coordinates?|matrix)\s*[:=]?\s*$/i;

export function stripSourceMarkers(text) {
  // Numeric reference-link definitions mean these labels have a destination.
  const references = new Set([...text.matchAll(/^[ \t]*\[(\d+(?:-\d+)?)\]:/gm)].map(match => match[1]));
  const lines = text.split('\n');
  const output = [];
  let buffer = [];
  let fence = null;
  const flush = () => {
    if (buffer.length) output.push(cleanSegment(buffer.join('\n'), references));
    buffer = [];
  };
  for (const line of lines) {
    const match = FENCE.exec(line);
    if (fence) {
      output.push(line);
      if (match && match[2][0] === fence.char && match[2].length >= fence.width && !match[3].trim()) fence = null;
    } else if (match) {
      flush();
      fence = { char: match[2][0], width: match[2].length };
      output.push(line);
    } else {
      buffer.push(line);
    }
  }
  flush();
  return output.join('\n');
}

function cleanSegment(text, references) {
  const prose = (part, offset) => part.replace(MARKER, (whole, numbers, index) => {
    const prefix = text.slice(0, offset + index).split('\n').at(-1);
    if (!/\p{L}/u.test(prefix) || prefix.trimEnd().endsWith(']') || RANGE_LABEL.test(prefix)) return whole;
    if (numbers.split(/, +/).some(label => {
      if (references.has(label)) return true;
      if (!label.includes('-')) return false;
      // A range can include a linked number between its endpoints. Check the
      // definitions rather than expanding a potentially very large range.
      const [start, end] = label.split('-').map(Number);
      return [...references].some(number => /^\d+$/.test(number) && Number(number) >= start && Number(number) <= end);
    })) return whole;
    return '';
  });
  let output = '';
  let cursor = 0;
  for (const match of text.matchAll(PROTECTED)) {
    output += prose(text.slice(cursor, match.index), cursor);
    // Three reviewed equations use a \quad-separated source label immediately
    // before the closing math delimiter. Other numeric brackets in math stay.
    output += match[2]
      ? match[0].replace(/[ \t]*\\quad[ \t]+\[[1-9]\d*(?:, +[1-9]\d*)*\](?=[ \t]*\${1,2}$)/, '')
      : match[0];
    cursor = match.index + match[0].length;
  }
  return output + prose(text.slice(cursor), cursor);
}
