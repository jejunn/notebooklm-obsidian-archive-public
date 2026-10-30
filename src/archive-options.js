import { SAVE_MODES } from './save-mode.js';

function validCourseName(course) {
  return Boolean(course) && course!=='.' && course!=='..' && !/[\\/\u0000-\u001f]/.test(course);
}

function courseFromNotebookTitle(title) {
  // A single leading bracket identifies the course. Multiple brackets are
  // ambiguous (for example a year and a course), so ask for manual input.
  const match=String(title??'').match(/^\s*\[([^\[\]]+)\][^\[\]]*$/);
  const course=match?.[1].trim()??'';
  return validCourseName(course)?course:'';
}

export function validateSaveOptions(options) {
  const course=String(options.course??'').trim();
  const lecture=Number(options.lecture);
  if(!SAVE_MODES.includes(options.mode)) throw new Error('처음 저장 또는 복습 추가를 선택하세요.');
  if(!validCourseName(course)) throw new Error('과목명을 입력하세요. 경로 구분자나 줄바꿈은 넣을 수 없습니다.');
  if(!Number.isSafeInteger(lecture) || lecture<1) throw new Error('강의 번호는 1 이상의 정수로 입력하세요.');
  return {mode:options.mode,course,lecture,dryRun:Boolean(options.dryRun)};
}

export function requestSaveOptions(document, defaults) {
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');
    dialog.setAttribute('aria-label','NotebookLM 아카이브');
    dialog.style.cssText='max-width:420px;width:calc(100% - 48px);padding:24px;border:1px solid #bbb;border-radius:12px;background:#fff;color:#222;z-index:2147483647;font:15px system-ui;';
    dialog.innerHTML=`<form style="display:grid;gap:16px">
      <h2 style="font-size:20px;margin:0">NotebookLM 아카이브</h2>
      <p style="margin:0">현재 과목과 저장할 강의를 확인하세요.</p>
      <label>과목명 <input name="course" required placeholder="노트북 제목의 [과목명] 또는 직접 입력" style="display:block;width:95%;margin-top:6px;padding:8px"></label>
      <label>강의 번호 <input name="lecture" type="number" min="1" step="1" required placeholder="저장할 강의 번호를 직접 입력" style="display:block;width:95%;margin-top:6px;padding:8px"></label>
      <label><input name="dryRun" type="checkbox"> 검증만 실행 (Obsidian에 저장하지 않음)</label>
      <p role="alert" style="color:#b00020;margin:0"></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="submit" value="first" style="padding:9px">처음 저장</button>
        <button type="submit" value="review" style="padding:9px">복습 추가</button>
        <button type="button" style="padding:9px">취소</button>
      </div>
      <p style="font-size:13px;margin:0">처음 저장은 새 강의 파일을 만듭니다. 복습 추가는 기존 강의 끝에 질문을 덧붙입니다.</p>
    </form>`;
    const form=dialog.querySelector('form');
    form.elements.course.value=courseFromNotebookTitle(document.title);
    form.elements.lecture.value='';
    form.elements.dryRun.checked=defaults.dryRun;
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    form.addEventListener('submit',event=>{
      event.preventDefault();
      try { finish(validateSaveOptions({mode:event.submitter?.value,course:form.elements.course.value,
        lecture:form.elements.lecture.value,dryRun:form.elements.dryRun.checked})); }
      catch(error) { dialog.querySelector('[role=alert]').textContent=error.message; }
    });
    dialog.querySelector('[type=button]').addEventListener('click',()=>finish(null));
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
    document.body.appendChild(dialog);
    dialog.showModal();
  });
}

// One dialog for all questions whose distinct referenced pages need a choice.
// User-supplied text is assigned through textContent, never interpreted as HTML.
export function requestPageChoices(document, questions) {
  if (!questions.length) return Promise.resolve({});
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', '대표 페이지 선택');
    dialog.style.cssText = 'max-width:720px;width:calc(100% - 48px);max-height:85vh;overflow:auto;padding:24px;border:1px solid #bbb;border-radius:12px;background:#fff;color:#222;z-index:2147483647;font:15px system-ui;';
    const form = document.createElement('form');
    const heading = document.createElement('h2'); heading.textContent = '복수 페이지 질문의 대표 페이지 선택'; form.appendChild(heading);
    const help = document.createElement('p'); help.textContent = '각 질문을 묶을 페이지를 선택하세요. 첫 번째로 언급된 페이지가 기본 선택입니다.'; form.appendChild(help);
    const selects = [];
    for (const question of questions) {
      const section = document.createElement('section');
      const text = document.createElement('pre'); text.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;'; text.textContent = `질문: ${question.text}`; section.appendChild(text);
      const details = document.createElement('details');
      const summary = document.createElement('summary'); summary.textContent = '답변 보기'; details.appendChild(summary);
      const answer = document.createElement('pre'); answer.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;'; answer.textContent = question.answer ?? '(답변 없음)'; details.appendChild(answer); section.appendChild(details);
      const label = document.createElement('label'); label.textContent = '대표 페이지: ';
      const select = document.createElement('select');
      for (const page of question.pages) { const option=document.createElement('option'); option.value=String(page); option.textContent=`${page}페이지`; select.appendChild(option); }
      label.appendChild(select); section.appendChild(label); form.appendChild(section); selects.push(select);
    }
    const submit = document.createElement('button'); submit.type='submit'; submit.textContent='선택 완료'; form.appendChild(submit);
    const cancel = document.createElement('button'); cancel.type='button'; cancel.textContent='취소'; form.appendChild(cancel);
    const finish = value => { dialog.close(); dialog.remove(); resolve(value); };
    form.addEventListener('submit', event => { event.preventDefault(); const choices=Object.create(null); questions.forEach((q,i)=>{choices[q.id]=Number(selects[i].value);}); finish(choices); });
    cancel.addEventListener('click', () => finish(null));
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
    dialog.appendChild(form); document.body.appendChild(dialog); dialog.showModal();
  });
}
