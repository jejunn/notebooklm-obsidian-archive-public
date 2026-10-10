# 설계와 저장 계약

소스 주석의 초기 절 번호는 [공개본 구현 계약](implementation-contract.md)에 대응합니다.

## 구성

| 모듈 | 책임 |
|---|---|
| `userscript-main.js` | 페이지 버튼, 실행 설정, 대상 확인, 검증·저장 순서 |
| `archive-options.js` | 과목·강의·저장 모드와 검증 체크박스 |
| `conversation-selection.js` | URL에서 노트북 식별, 최근 대화 후보 조회 |
| `browser-tokens.js`, `userscript-entry.js`, `adapter.js` | 페이지 인증 정보, RPC 요청, 응답 해석, turn 정규화 |
| `ingest-core.js` | 구조 검증, 질문의 페이지 추출, 페이지 그룹과 경고 |
| `validation-output.js` | 저장 전 검증 블록과 쓰기 여부 제어 |
| `markdown-assembler.js`, `citation-cleanup.js` | 노트 조립, 수식 구분자와 답변 출처 표기 정리 |
| `save-mode.js`, `archive-save.js` | 명시적 저장 목적, 대화별 중복 방지, 기존 노트 읽기와 재확인 |
| `vault-writer.js` | Obsidian REST API의 Markdown PUT |

`delta-rules.js`는 이전 판단 규칙과 frontmatter·섹션 도우미를 포함합니다. 현재 브라우저 저장 판단은 `save-mode.js`를 따르며 이전 자동 모드 판정을 사용하지 않습니다.

## 데이터와 조회

정규화한 turn은 `{id, ts, kind, text}`만 가집니다. `kind`는 `question` 또는 `answer`, `ts`는 Unix 초, `text`는 문자열입니다. 빈 답변 문자열은 허용합니다. 정규화 후에는 시간순 질문·답변 쌍으로 검증하며 순서와 ID가 모호하면 중단합니다.

대화 후보 RPC는 `hPTbtc`, turn 조회 RPC는 `khqZz`입니다. 공식 공개 API 계약이 아니며 [RPC 참고 문서](https://github.com/teng-lin/notebooklm-py/blob/main/docs/rpc-reference.md)와 실제 관찰을 바탕으로 구현했습니다. 후보는 시작·마지막 질문을 보여주는 사람의 확인을 거칩니다.

브라우저 실행은 현재 페이지에서 노트북 ID를 얻고 후보를 조회합니다. 소스 CONFIG의 가상 ID는 주입 테스트용 기본값이며 사용자의 실제 ID를 포함하지 않습니다. 과목·강의는 대화로부터 추론하지 않습니다.

현재 실행 경로는 400 turn 한 번 조회만 수행합니다. `exhausted`는 next-page token이 없을 때만 참입니다. 정확히 400개라도 토큰이 없으면 전체 조회로 처리하고, 400개 미만이어도 토큰이 남으면 중단합니다. 모듈 내부의 pagination 도우미와 모의 테스트가 실제 다음 페이지 지원을 의미하지는 않습니다.

## 파일과 메타데이터

| 필드 | 의미 |
|---|---|
| `type` | `notebooklm-study` |
| `course`, `lecture` | 사용자가 선택한 과목과 강의 |
| `archived` | 최초 저장 날짜 |
| `archive_conversation` | 최초 저장 대화 ID |
| `archive_first_turn`, `archive_last_turn` | 최초 저장 구간의 첫·마지막 ID |
| `archive_turns` | 최초 저장 turn 수. 복습까지 합산한 수가 아님 |
| `archive_review_sessions` | 복습 대화별 `{conversationId,lastTurnId,turnCount}` 목록을 JSON 형식의 YAML 문자열로 저장 |

복습 추가 시 최초 필드는 유지합니다. 직접 편집한 본문·메모를 보존하고 끝에 복습을 붙입니다. 저장 위치를 담는 관리 필드를 지우거나 중복 선언하면 이후 복습이 중단될 수 있습니다.

처음 저장은 어떤 기존 파일도 교체하지 않습니다. 복습은 관리 메타데이터의 과목·강의가 일치해야 합니다. 새 대화는 사용자의 복습 선택과 확인을 거쳐 전체를 추가합니다. 이미 저장한 대화는 해당 대화의 마지막 turn 뒤만 추가합니다. 마지막 ID가 조회 결과에 없으면 전체를 새 대화처럼 다시 추가하지 않습니다.

최초 대화에 계속 질문하고 복습을 선택할 수도 있습니다. 복습 위치가 없으면 최초 마지막 turn을 기준으로 삼고, 이후에는 대화별 복습 위치를 사용합니다. 신규 구간이 질문·답변 쌍을 깨면 중단합니다. 서로 다른 대화의 중복을 질문 문구나 답변 해시로 추측하지 않습니다.

## 저장 순서와 한계

검증·대상 확인 → API 키 입력 → 기존 파일 GET → 저장 모드 판단 → 최종 쓰기 확인 → 두 번째 GET → 내용 비교 → PUT 순서입니다. 404만 파일 없음으로 취급하며 인증·네트워크·서버 오류를 파일 없음으로 처리하지 않습니다. PUT 204가 정상 성공 응답입니다.

기존 파일 재확인은 사용자가 확인 창을 보는 동안의 편집을 보호합니다. 서버의 조건부 쓰기나 파일 잠금을 쓰지 않으므로 두 번째 GET 직후와 PUT 사이의 변경까지 막지는 못합니다. 자동 백업 파일을 만들지 않습니다.

조회 인증 정보는 로그인한 NotebookLM 페이지에서 읽어 같은 서비스 요청에 사용합니다. Obsidian API 키는 실제 저장 때만 입력받으며 소스·설정 파일에 보관하지 않습니다. 스크립트에는 별도 AI 모델 호출, 서버 수집 기능, 원본 자료 업로드 기능이 없습니다. Obsidian 연결은 로컬 API를 사용합니다.

현재 인터페이스는 한국어이고 페이지 입력은 한국어 `페이지` 표기, 날짜·시각은 UTC+9 기준입니다. 다른 언어·시간대를 위한 설정 화면은 없습니다.
