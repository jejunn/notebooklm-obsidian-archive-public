import { SAVE_MODES } from './save-mode.js';

export function validateSaveOptions(options) {
  const course=String(options.course??'').trim();
  const lecture=Number(options.lecture);
  if(!SAVE_MODES.includes(options.mode)) throw new Error('처음 저장 또는 복습 추가를 선택하세요.');
  if(!course || course==='.' || course==='..' || /[\\/\u0000-\u001f]/.test(course)) throw new Error('과목명에는 경로 구분자나 줄바꿈을 넣을 수 없습니다.');
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
      <label>과목명 <input name="course" required style="display:block;width:95%;margin-top:6px;padding:8px"></label>
      <label>강의 번호 <input name="lecture" type="number" min="1" step="1" required style="display:block;width:95%;margin-top:6px;padding:8px"></label>
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
    form.elements.course.value=defaults.course;
    form.elements.lecture.value=defaults.lecture;
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
