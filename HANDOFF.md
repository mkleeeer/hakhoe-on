# 세종 금융학회 앱 — 인수인계 문서

다른 AI(또는 개발자)에게 이어서 작업을 맡길 때 이 문서를 통째로 보여주면 됩니다.
기능 단위로 정리했고, 각 기능마다 "코드가 어디 있는지"를 같이 적어서
저(사용자)도 나중에 훑어보고 이해할 수 있게 했습니다.

## 프로젝트 개요
- **이름**: 세종 금융학회 학회 운영 플랫폼 (내부 명칭 `hakhoe-on`)
- **배포 주소**: https://hakhoe-on.sejong-finance.workers.dev
- **스택**: Cloudflare Workers(서버리스) + D1(SQLite 호환 DB) + Wrangler(배포 CLI)
- **코드 위치**: `C:\Users\user\Desktop\hakhoe-on` — git 저장소로 관리 중 (커밋 이력 있음)
- **재사용 모듈 창고**: `C:\Users\user\Desktop\구글드라이브\07_코드프로젝트\dev-toolkit`
  (이 앱에서 뽑아낸 캘린더 파싱/번역/로그인 모듈이 여기 따로 정리돼 있음 — 다른 앱에도 재사용 가능)

## 절대 다른 AI 채팅창에 그대로 붙여넣지 말 것
아래 "설정값" 표의 **시크릿(secret) 항목 값 자체**는 붙여넣지 마세요. 이름(키)만 알려주면
다른 AI가 코드를 보고 어디 쓰이는지 이해하는 데 충분합니다. 실제 값은 Cloudflare에 이미
저장돼 있어서 (`wrangler secret put`) 코드 작업엔 필요 없습니다. 로컬 테스트가 꼭 필요하면
그때만 `.dev.vars` 파일로 별도 전달하세요 (git에는 안 올라감).

---

## 기능별 정리

### 1. 구글 로그인 + 가입 승인
- **뭐하는 기능**: 구글 계정으로 로그인 → 자동으로 "승인 대기" 상태로 등록 → 운영진이 승인해야 학회 내용 열람 가능
- **코드**: `worker.js`의 `verifyGoogleCredential`, `createSession`/`readSession`(HMAC 서명 쿠키), `resolveUser` / 프런트 `public/index.html`의 `#gsi-button` / `public/app.js`의 로그인 처리부
- **API**: `POST /api/auth/google`, `POST /api/auth/logout`, `GET /api/me`
- **필요 설정**: `GOOGLE_CLIENT_ID`(공개 값), `SESSION_SECRET`(시크릿)
- **알아두면 좋은 점**: client secret은 안 씀 — id_token을 구글 tokeninfo 엔드포인트로 직접 검증하는 방식이라 서버 쪽 OAuth 설정이 단순함

### 2. 운영진 권한 관리
- **뭐하는 기능**: 부트스트랩 관리자(`ADMIN_EMAILS`, 코드 수정 없인 못 바꿈)와 별개로, 승인된 학회원 중 아무나 운영진으로 임명/해제 가능 (본인은 본인 자격 박탈 불가)
- **코드**: `worker.js`의 `officers` 테이블, `POST /api/members/:email/role` / `public/app.js`의 `renderMembers()`, `[data-role]` 클릭 핸들러
- **API**: `GET /api/members`, `POST /api/members/:email/decision`(가입 승인/거절), `POST /api/members/:email/role`(운영진 임명/해제)

### 3. 공지 + 모집(신청)
- **뭐하는 기능**: 공지사항 등록. "모집" 옵션을 켜면 정원/신청 기능이 그 공지 안에 그대로 붙음 (별도 모집 섹션 없음 — 이건 의도된 설계)
- **코드**: `worker.js`의 `/api/notices*`, `syncNotice`(구글 캘린더 자동 반영) / `public/app.js`의 notice 렌더링, 신청 버튼 처리
- **API**: `GET/POST /api/notices`, `PATCH/DELETE /api/notices/:id`, `POST /api/notices/:id/join`

### 4. 일정(schedules)
- **뭐하는 기능**: 정기모임 등 앱 안에서 직접 등록하는 일정. 등록하면 구글 캘린더에 자동 반영됨
- **코드**: `worker.js`의 `/api/schedules*`, `syncSchedule` / `public/app.js`의 캘린더 화면 렌더링

### 5. 활동 기록(activities)
- **뭐하는 기능**: 지난 활동 기록이자, 앞으로 할 활동에 대한 참여 희망자 조사(수요조사) 역할도 겸함. 등록 시 캘린더에도 반영
- **코드**: `worker.js`의 `/api/activities*`, `syncActivity`

### 6. 투표(polls) — API 이름은 `votes`
- **뭐하는 기능**: 학회원 대상 투표 개설/참여. 발제 주제, 찬반, 스케줄 조율 등에 씀
- **코드**: `worker.js`의 `/api/votes*` / `public/app.js`의 poll 옵션 편집 UI(`.orow` 행 추가/삭제 패턴 — 이후 다른 리스트형 편집 UI도 이 패턴 재사용함)

### 7. 자료실(materials)
- **뭐하는 기능**: 파일/링크 자료 등록, 태그로 분류
- **코드**: `worker.js`의 `/api/materials*`

### 8. 건의함(ideas)
- **뭐하는 기능**: 학회원 건의/아이디어 게시판. 좋아요, 운영진 답글, 상태(검토중/반영됨 등) 관리
- **코드**: `worker.js`의 `/api/ideas*` (`like`, `status`, `replies` 하위 라우트)

### 9. 구글 캘린더 연동 (읽기 + 쓰기 양방향)
- **뭐하는 기능**: (a) 공개 캘린더를 앱 화면에 읽어서 보여줌 (b) 앱에서 만든 공지/일정/활동을 캘린더에 자동으로 씀
- **코드**: 읽기 = `ics.js`(iCal 파서, RRULE 반복 처리 포함), 쓰기 = `gcal.js`(서비스 계정 JWT 인증)
- **필요 설정**: `CALENDAR_ICS_URL`/`CALENDAR_ID`/`CALENDAR_CID`(읽기용, 공개 값), `GOOGLE_SERVICE_ACCOUNT_JSON`(쓰기용 시크릿)
- **재사용 모듈**: dev-toolkit의 `ics-calendar-parser`, `gcal-service-account-sync`

### 10. 다국어 / 양방향 번역
- **뭐하는 기능**: 메뉴·버튼 같은 화면 문구는 미리 번역된 사전(무료, 즉시). 학회원이 쓴 글(공지·활동·투표 등)은 구글 번역 API로 실시간 번역하되, **관리자가 일부러 영어로 지은 브랜드명 같은 건 번역에서 제외**하는 구분이 핵심
- **코드**: `translate.js`(번역 API 호출 + D1 캐시), `public/app.js`의 `STR` 사전(정적), `collectUserContentStrings()` vs `collectSettingsStrings()`(이 구분이 핵심 로직)
- **필요 설정**: `GOOGLE_TRANSLATE_API_KEY`(없으면 동적 번역만 비활성, 앱은 정상 작동)
- **재사용 모듈**: dev-toolkit의 `bidirectional-translate`

### 11. 학기 정보 / 홈 화면 목표 설정
- **뭐하는 기능**: 사이드바의 학기명·진행률, 홈 화면 상단의 "이번 학기 방향" 문구와 핵심 목표 개수를 운영진이 직접 수정
- **코드**: `worker.js`의 `/api/settings`, `public/app.js`의 `FORMS.term`/`FORMS.goal`, `renderChrome()`
- **주의**: 홈 화면에 말(horse) 이미지를 배경처럼 크게 깔고 목표를 리스트로 보여주는 실험을 한 번 했다가 레이아웃이 겹쳐서 보기 안 좋아져 **되돌린 이력**이 있음. 지금은 심플한 "카운트 숫자 + 라벨" 형태로 되돌아간 상태 — 다시 화려하게 만들려면 이번엔 로컬에서 스크린샷 확인 먼저 하고 배포할 것

### 12. 디자인 시스템
- **코드**: `public/styles.css`의 `:root` CSS 변수(`--crimson`, `--brass`, `--ink` 등), 다크모드는 `prefers-color-scheme` 미디어쿼리로 자동 대응
- **로고 마크**: 현재 "SF" 텍스트 (검정 말 이미지로 바꿨다가 그리드 안 `<img>`의 퍼센트 height 버그로 크기가 이상하게 나와서 원복함 — 다시 시도한다면 `width/height:100%` + 컨테이너 padding 방식 사용할 것, 퍼센트 height는 피할 것)

---

## 배포 방법
```
cd C:\Users\user\Desktop\hakhoe-on
npx wrangler deploy
```
시크릿은 이미 Cloudflare에 등록돼 있어서(`wrangler secret list`로 이름만 확인 가능) 재입력 불필요.
새 환경에서 처음 설정하는 경우만 README.md의 "구글 OAuth 설정"/"구글 번역 API 설정" 절차를 따르면 됨.
