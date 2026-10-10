import { expect, test } from 'bun:test';
import { validateSaveOptions } from '../src/archive-options.js';
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
