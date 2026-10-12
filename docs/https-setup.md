# Safari와 macOS의 Obsidian HTTPS 설정

Userscripts의 사이트 접근 허용과 HTTPS 인증서 신뢰는 별도 설정입니다. NotebookLM에서 대화를 조회했더라도 Obsidian 파일을 읽기 전에 HTTPS 연결이 차단될 수 있습니다.

## 주소와 포트

스크립트 기본값은 `https://127.0.0.1:27125`입니다. 27125는 검증한 로컬 환경의 포트이며, [플러그인 공식 기본값](https://github.com/coddingtonbear/obsidian-local-rest-api)은 HTTPS 27124입니다. Obsidian 설정에 표시되는 HTTPS 포트와 맞추세요.

주소를 바꾸려면 `src/vault-writer.js`의 `VAULT_ORIGIN`을 수정한 뒤 `bun run build:userscript`로 빌드합니다. `CONFIG.vaultOrigin`도 이 값을 사용합니다. 빌드 파일을 Userscripts 저장 폴더로 복사하고 확장 팝업을 한 번 연 뒤 NotebookLM 페이지를 새로고침합니다. GitHub 파일만 수정해도 기존 설치 파일이 자동 갱신되지는 않습니다.

`localhost`와 `127.0.0.1`은 모두 로컬 컴퓨터로 연결될 수 있지만, 인증서 검증에서는 같은 이름으로 취급되지 않습니다. 접속 주소는 서버 인증서의 Subject Alternative Name(SAN)과 일치해야 합니다. 2026-10-12 확인한 서버 인증서는 `IP Address:127.0.0.1`만 포함했고 `localhost`는 이름 불일치로 실패했습니다.

## 인증기관(CA) 인증서 신뢰

1. Obsidian에서 Local REST API 플러그인의 HTTPS 서버를 활성화하고 포트를 확인합니다.
2. 설치한 플러그인이 제공하는 공개 CA 인증서를 받습니다. 제공 경로는 `https://127.0.0.1:<HTTPS 포트>/obsidian-local-rest-api.crt`입니다. 인증서 경고가 나오면 설치한 로컬 Obsidian 서버가 맞는지 확인하고 직접 처리합니다.
3. macOS **키체인 접근**에서 공개 CA 인증서를 **로그인** 키체인으로 가져옵니다.
4. 가져온 **Obsidian Local REST API CA**를 열고 **신뢰 → SSL(Secure Sockets Layer) → 항상 신뢰**를 지정합니다. 창을 닫고 macOS 인증 요청을 직접 승인합니다. [Apple의 인증서 신뢰 설정 안내](https://support.apple.com/ko-kr/guide/keychain-access/kyca11871/mac)
5. Safari와 사용하는 Safari 웹앱을 완전히 종료했다가 다시 열어 연결을 확인합니다.

이 설정은 해당 CA가 발급한 인증서의 SSL 신뢰 범위를 바꿉니다. 자신이 설치한 Obsidian에서 받은 CA만 사용하고, 개인 키나 API 키는 가져오거나 공유하지 마세요. 이 스크립트는 인증서를 설치하거나 신뢰 설정을 자동으로 바꾸지 않습니다. 인증서 검증 해제나 HTTP 전환을 해결책으로 사용하지 않습니다.

일반 Safari에서 특정 주소의 인증서 경고를 한 번 통과한 것만으로, Safari 웹앱의 교차 출처 요청까지 신뢰된다고 판단하지 마세요.

## Userscripts 사이트 접근

- NotebookLM 사이트(`notebook.google.com`)에 접근을 허용합니다.
- 저장할 로컬 API 주소(`127.0.0.1`, 다른 이름을 설정했다면 그 이름)에도 접근을 허용합니다.
- 가능하면 각 사이트의 **이 웹사이트에서 항상 허용**을 선택합니다. 모든 웹사이트 접근을 허용할 필요는 없습니다.
- 일반 Safari와 Safari 웹앱에서 권한 요청이 각각 표시될 수 있으므로 사용하는 환경에서 확인합니다.

## `vault read did not complete`가 표시될 때

이 문구는 Obsidian 파일 조회가 완료되지 않았다는 뜻이며, 원인을 자동으로 판별한 결과는 아닙니다. 조회 실패를 파일 없음으로 취급하거나 쓰기를 계속하지 않습니다.

| 확인 | 판별 방법 |
|---|---|
| Obsidian 서버 | Obsidian과 플러그인이 실행 중인지, 설정한 HTTPS 포트가 맞는지 확인 |
| 인증서 주소 | 접속 주소가 인증서 SAN과 일치하는지 확인 |
| CA 신뢰 | 해당 공개 CA가 키체인에 있고 SSL 신뢰가 설정됐는지 확인 |
| 확장 권한 | NotebookLM 및 로컬 API 사이트 양쪽의 접근 허용 확인 |
| 실제 브라우저 오류 | Safari의 개발자 메뉴에서 해당 페이지/웹앱 검사기의 콘솔과 네트워크 확인. 도킹된 콘솔이 비어 보이면 별도 창으로 분리 |

콘솔의 **이 서버에 대한 인증서가 유효하지 않습니다**는 인증서 검증 단계의 실패입니다. `vault read status 401`처럼 HTTP 상태가 반환됐다면 서버에는 도달한 것이므로 API 키 등 해당 응답을 확인합니다. `curl --cacert ...`로 성공한 결과는 지정한 CA로 서버를 검증한 결과이며, Safari나 macOS에 CA가 등록됐다는 증거가 아닙니다.

공개 이슈에는 오류 종류와 HTTP 상태만 남기고 API 키, 인증서 개인 키, 쿠키, 전체 네트워크 캡처를 붙이지 마세요.
