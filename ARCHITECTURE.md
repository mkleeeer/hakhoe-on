# 아키텍처

## 전체 흐름
```
브라우저 (public/index.html + app.js)
   │  fetch('/api/...')
   ▼
Cloudflare Worker (worker.js)
   │
   ├─ 인증: 구글 tokeninfo 검증 → HMAC 서명 쿠키 (DB 세션 저장 없음)
   ├─ D1(SQLite 호환) ── 회원/공지/일정/투표/건의 등 전체 데이터
   ├─ Google Calendar API ── gcal.js(쓰기, 서비스 계정) / ics.js(읽기, 공개 iCal 파싱)
   └─ Google Translate API v2 ── translate.js (D1 translations 테이블에 캐시)
```

정적 자산(`public/`)은 Cloudflare의 `[assets]` 바인딩으로 서빙되고, `/api/*`만
`worker.js`의 fetch 핸들러가 처리합니다. 별도의 백엔드 서버나 컨테이너 없음 — 요청마다
Worker가 실행되는 서버리스 구조.

## 인증 방식 (세션을 DB에 저장하지 않는 이유)
1. 프런트에서 구글 GSI 로그인 → id_token(credential) 획득
2. `POST /api/auth/google`이 그 토큰을 구글 `tokeninfo` 엔드포인트로 검증 (client secret 불필요)
3. 검증되면 `{email, name, sub}`를 HMAC-SHA256으로 서명해 쿠키에 담아 내려줌
4. 이후 요청은 쿠키의 서명을 `SESSION_SECRET`으로 재검증 — DB 조회 없이 매 요청마다 신원 확인
   (자세한 구현은 `worker.js`의 `hmac`/`createSession`/`readSession`, 원리는
   `dev-toolkit/hmac-session-auth/README.md`의 용어 설명 참고)

세션을 DB에 저장하지 않기 때문에 **서버에서 세션을 강제로 무효화(로그아웃 처리)할 방법이
없습니다** — 쿠키가 만료되거나 사용자가 직접 로그아웃해야만 풀립니다. 이건 트레이드오프이지
버그가 아니지만, "특정 계정을 즉시 강제 로그아웃시키고 싶다"는 요구가 생기면 세션을 DB에
저장하는 방식으로 바꿔야 합니다.

## 역할(role) 판정 순서 (`resolveUser` in worker.js)
1. 쿠키가 없거나 무효 → `visitor`
2. `ADMIN_EMAILS`(고정, bootstrap)에 있거나 `officers` 테이블에 있으면 → `admin`
3. 그 외엔 `members` 테이블의 `status` 확인 → `pending` / `approved`(→`member`) / `rejected`
4. 첫 로그인이면 `members`에 `pending`으로 자동 등록

## 데이터 동기화가 양방향인 지점
- **공지/일정/활동 → 구글 캘린더**: 앱에서 저장할 때 `gcal.js`로 이벤트를 즉시 생성/수정/삭제.
  실패해도 앱 저장 자체는 성공 처리됨(캘린더 동기화는 best-effort).
- **구글 캘린더 → 앱**: `GET /api/calendar`가 매번 iCal을 다시 파싱하지 않도록 60초 메모리
  캐시(`calCache`, Worker 인스턴스가 살아있는 동안만 유지)를 씀. `GOOGLE_API_KEY`가 있으면
  iCal 파싱 대신 Calendar API v3를 직접 호출(더 빠르고 반복 일정 전개를 구글이 처리).

## 번역이 두 층으로 나뉜 이유
- **정적 UI 문구**(메뉴, 버튼): `app.js`의 `STR` 사전에 미리 박아둠 — API 호출 없음, 무료, 즉시 전환
- **동적 콘텐츠**(공지 본문 등 사용자가 쓴 글): `translate.js`가 구글 번역 API를 호출하고
  결과를 D1 `translations` 테이블에 해시로 캐싱 — 같은 문장 재번역 안 함
- 이 둘을 분리한 이유는 **관리자가 의도적으로 영어로 지은 이름**(예: 브랜드명)까지
  자동번역되면 안 되기 때문 — `collectUserContentStrings()`(항상 양방향) vs
  `collectSettingsStrings()`(관리자 설정, 한→영만) 로 구분해서 처리 (`public/app.js`)

## 스키마 관리
- `worker.js`의 `ensureSchema()`가 요청마다(1회만) `CREATE TABLE IF NOT EXISTS` +
  과거 배포분 대상 `ALTER TABLE`(실패 시 무시)을 실행 — 이게 실질적인 "자동 마이그레이션".
- `migrations/0001_initial.sql`은 위 스키마의 스냅샷으로, `wrangler d1 migrations`
  명령을 정식으로 쓰기 위한 시작점. 새 컬럼/테이블이 필요하면 `ensureSchema()`를 직접
  고치는 대신 `wrangler d1 migrations create hakhoe-on <설명>`으로 새 파일을 추가할 것.

## 권한 부트스트랩과 운영진의 차이
- **bootstrap 관리자**(`ADMIN_EMAILS`, `wrangler.toml`): 코드 재배포 없이는 못 바꿈, 자기 자신도
  UI로 박탈 불가 — "최후의 보루" 역할
- **DB 운영진**(`officers` 테이블): 다른 운영진이 UI로 임명/해제 가능, 유연하지만 되돌릴 수 있음

## 관련 문서
- 엔드포인트 목록: [API.md](./API.md)
- 신규 배포 절차: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 기능별 요약: [HANDOFF.md](./HANDOFF.md)
