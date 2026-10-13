import { expect, test } from 'bun:test';
import { requestSaveOptions, validateSaveOptions } from '../src/archive-options.js';

// Only the browser's DOM boundary is replaced; the real dialog setup and
// submit handler run so stale CONFIG values cannot silently fill the fields.
function dialogPage(title) {
  const elements = { course: { value: '' }, lecture: { value: '' }, dryRun: { checked: false } };
  const listeners = {};
  const alert = { textContent: '' };
  const form = { elements, addEventListener: (type, handler) => { listeners[type] = handler; } };
  const dialog = {
    style: {}, setAttribute() {}, addEventListener() {}, showModal() {}, close() {}, remove() {},
    querySelector(selector) {
      if (selector === 'form') return form;
      if (selector === '[role=alert]') return alert;
      if (selector === '[type=button]') return { addEventListener() {} };
      throw new Error(`Unexpected selector: ${selector}`);
    },
  };
  return { document: { title, createElement: () => dialog, body: { appendChild() {} } },
    elements, alert, submit: () => listeners.submit({ preventDefault() {}, submitter: { value: 'first' } }) };
}

const legacyDefaults = { course: '태양전지공학', lecture: 2, dryRun: true };

test('dialog uses the bracketed notebook course instead of a configured course', () => {
  for (const [title, course] of [
    ['[화성암석학] 강의자료 - Gemini Notebook', '화성암석학'],
    ['  [ 태양전지공학 ] 강의자료 - NotebookLM', '태양전지공학'],
  ]) {
    const page = dialogPage(title);
    requestSaveOptions(page.document, legacyDefaults);
    expect(page.elements.course.value).toBe(course);
    expect(page.elements.dryRun.checked).toBe(true);
  }
});

test('missing, malformed, ambiguous, or unsafe notebook courses leave the field blank', () => {
  for (const title of [undefined, '', '강의자료 - Gemini Notebook', '[] 강의자료', '[ ] 강의자료',
    '[화성암석학 강의자료', '[2026][화성암석학] 강의자료', '[[화성암석학]] 강의자료',
    '[화성암석학/실험] 강의자료', '[..] 강의자료']) {
    const page = dialogPage(title);
    requestSaveOptions(page.document, legacyDefaults);
    expect(page.elements.course.value).toBe('');
  }
});

test('each dialog opens with a blank lecture and requires manual entry before saving', async () => {
  const page = dialogPage('[화성암석학] 강의자료');
  const result = requestSaveOptions(page.document, legacyDefaults);
  expect(page.elements.lecture.value).toBe('');
  page.submit();
  expect(page.alert.textContent).toContain('강의 번호');
  page.elements.lecture.value = '3';
  page.submit();
  expect(await result).toEqual({ mode: 'first', course: '화성암석학', lecture: 3, dryRun: true });

  page.document.title = '[구조지질학] 강의자료';
  requestSaveOptions(page.document, legacyDefaults);
  expect(page.elements.course.value).toBe('구조지질학');
  expect(page.elements.lecture.value).toBe('');
});
test('two explicit modes accept a confirmed course and positive lecture', () => {
  for(const mode of ['first','review']) expect(validateSaveOptions({mode,course:' 예제 과목 ',lecture:'2',dryRun:false})).toEqual({mode,course:'예제 과목',lecture:2,dryRun:false});
});
test('unsafe folder names and incomplete selections are rejected', () => {
  for(const course of ['','..','../other','foo/bar','foo\\bar','foo\nbar']) {
    expect(()=>validateSaveOptions({mode:'first',course,lecture:2})).toThrow();
  }
  for(const lecture of ['',0,-1,1.5,'abc']) expect(()=>validateSaveOptions({mode:'first',course:'과목',lecture})).toThrow();
  expect(()=>validateSaveOptions({mode:'auto',course:'과목',lecture:2})).toThrow();
});
