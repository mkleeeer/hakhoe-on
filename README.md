# 세종 금융학회 — 학회 운영 플랫폼

Cloudflare Workers + D1. 구글 로그인한 사람만 가입 신청이 가능하고,
운영진 승인을 받아야 학회 내용을 볼 수 있습니다.

## 구조
- `worker.js` — API. 인증(구글 ID 토큰 검증 + HMAC 세션 쿠키), D1 CRUD
- `gcal.js` — 구글 캘린더 쓰기 (서비스 계정 JWT)
- `ics.js` — 구글 캘린더 공개 iCal 피드 파서
- `translate.js` — 한→영 번역 (구글 번역 API v2 + D1 캐시)
- `public/` — 정적 프런트엔드 (index.html / styles.css / app.js)
- `wrangler.toml` — 바인딩과 공개 변수

## 권한
| 역할 | 조건 | 할 수 있는 것 |
|---|---|---|
| 운영진 admin | `ADMIN_EMAILS`에 등록된 구글 이메일 | 전부 + 공지 게시, 투표 개설, 가입 승인, 학기 설정 |
| 학회원 member | 운영진이 승인 | 열람, 발제·일정·자료 등록, 투표 참여, 의견 |
| 승인 대기 pending | 구글 로그인만 한 상태 | 대기 화면만 |
| 방문자 visitor | 미로그인 | 로그인 화면만 |

삭제는 작성자 본인 또는 운영진만 가능합니다.

## 설정값
- `SESSION_SECRET` (secret) — 세션 쿠키 서명 키. `wrangler secret put SESSION_SECRET`
- `GOOGLE_CLIENT_ID` (vars) — 구글 OAuth 클라이언트 ID. 공개되어도 되는 값
- `ADMIN_EMAILS` (vars) — 운영진 구글 이메일, 쉼표로 구분
- `CALENDAR_ICS_URL` / `CALENDAR_ID` / `CALENDAR_CID` (vars) — 구글 캘린더 연동
- `GOOGLE_SERVICE_ACCOUNT_JSON` (secret) — 구글 캘린더 쓰기(활동·일정·모집 공지 자동 등록)
- `GOOGLE_TRANSLATE_API_KEY` (secret) — 동적 콘텐츠(공지·활동·투표 등) 한→영 번역. 없으면 원문 그대로 표시됨

## 번역 (다국어)
사이드바/상단의 `EN` 버튼으로 언어를 바꿉니다. 두 층으로 동작합니다.
- **정적 UI 문구**(메뉴·버튼·안내문) — `public/app.js`의 `STR` 사전에 직접 번역돼 있어 즉시 적용됩니다. API 비용 없음.
- **동적 콘텐츠**(공지·활동·투표·건의 등 학회원이 쓴 글) — 구글 번역 API(v2)로 번역하고 D1 `translations` 테이블에 캐시합니다. 같은 문장은 한 번만 번역 비용이 듭니다. 한글이 없는 문장(이미 영어인 내용)은 API를 부르지 않고 그대로 둡니다. `GOOGLE_TRANSLATE_API_KEY`가 없으면 이 부분은 원문(한국어)이 그대로 보입니다.

### 구글 번역 API 설정
1. Cloud Translation API 사용 설정: `console.cloud.google.com/apis/library/translate.googleapis.com?project=<프로젝트>` (결제 계정 연결 필요 — 월 50만자까지 무료)
2. `console.cloud.google.com/apis/credentials` → API 키 만들기 → API 제한사항에서 `Cloud Translation API`만 허용
3. `wrangler secret put GOOGLE_TRANSLATE_API_KEY` 로 등록 후 재배포

## 배포
    npm run deploy

## 구글 OAuth 설정
1. https://console.cloud.google.com/apis/credentials
2. 사용자 인증 정보 만들기 → OAuth 클라이언트 ID → 웹 애플리케이션
3. 승인된 JavaScript 원본에 배포 주소 추가 (예: https://hakhoe-on.<계정>.workers.dev)
4. 생성된 클라이언트 ID를 `wrangler.toml`의 `GOOGLE_CLIENT_ID`에 입력 후 재배포

client secret은 사용하지 않습니다 (ID 토큰을 tokeninfo로 검증하는 방식).
