# 배포 가이드

## 요구사항
- Node.js 18 이상 (개발 환경은 v24로 확인됨)
- Cloudflare 계정
- `npm install` (package-lock.json 포함되어 있음)

## 처음부터 새로 배포하기 (다른 Cloudflare 계정으로 인수인계하는 경우)

### 1. 설치 및 로그인
```
npm install
npx wrangler login
```
브라우저가 열리고 Cloudflare 계정으로 로그인하면 끝. (`wrangler whoami`로 확인 가능)

### 2. D1 데이터베이스 생성
```
npx wrangler d1 create hakhoe-on
```
출력되는 `database_id`를 `wrangler.toml`의 `[[d1_databases]]` 블록에 붙여넣기.
**주의**: 지금 `wrangler.toml`에 있는 `database_id`(`948b6eaf-...`)는 원래 운영 계정의 것이라
다른 Cloudflare 계정으로 옮기면 이 값을 반드시 새로 발급받은 것으로 교체해야 합니다.

### 3. 스키마 적용
```
npx wrangler d1 migrations apply hakhoe-on --remote   # 운영 D1에 적용
npx wrangler d1 migrations apply hakhoe-on --local     # 로컬 개발용 D1에 적용
```
`migrations/0001_initial.sql`이 전체 테이블·인덱스를 만듭니다. (참고: `worker.js`의
`ensureSchema()`가 요청마다 `CREATE TABLE IF NOT EXISTS`를 실행하는 안전망도 있어서,
이 단계를 건너뛰어도 첫 요청 때 자동으로 만들어지긴 합니다. 그래도 명시적으로 적용해두는 걸 권장.)

### 4. 환경변수 설정
`wrangler.toml`의 `[vars]`에 있는 `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS`, `CALENDAR_*`를
본인 값으로 교체. **`ADMIN_EMAILS`에 본인 구글 이메일을 넣어야 첫 로그인 시 자동으로
운영진이 됩니다** (승인 절차 없이 즉시 admin).

시크릿은 다음 명령으로 등록 (README.md "설정값" 표 참고):
```
npx wrangler secret put SESSION_SECRET
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON   # 선택: 캘린더 쓰기
npx wrangler secret put GOOGLE_TRANSLATE_API_KEY       # 선택: 번역
```

### 5. 로컬에서 먼저 확인
```
cp .dev.vars.example .dev.vars   # SESSION_SECRET 등 채우기
npx wrangler dev --local
```
`http://localhost:8787` 접속 → 구글 로그인 버튼이 뜨는지, 로그인 후 `ADMIN_EMAILS`에 넣은
계정이 운영진으로 인식되는지(사이드바에 "운영진" 뱃지) 확인.

### 6. 배포
```
npx wrangler deploy
```
출력되는 `https://hakhoe-on.<계정>.workers.dev` 주소가 실제 서비스 주소입니다.
이 주소를 구글 OAuth 클라이언트의 "승인된 JavaScript 원본"에 추가해야 로그인이 작동합니다
(README.md "구글 OAuth 설정" 참고).

### 7. 배포 후 확인
- 위 주소로 접속해 로그인 화면이 뜨는지
- `ADMIN_EMAILS` 계정으로 로그인 → 사이드바에 운영진 표시 확인
- 공지 하나 등록해보고 정상 저장되는지 확인

## 운영 중 로그 확인 / 문제 진단
```
npx wrangler tail
```
실시간 요청 로그. 에러 발생 시 여기서 스택트레이스 확인.

## 롤백
Cloudflare는 배포 버전을 자동으로 보관합니다.
```
npx wrangler deployments list
npx wrangler rollback [버전ID]
```
DB(D1)는 배포와 별개로 관리되므로, 코드만 롤백해도 데이터는 그대로 유지됩니다.
(DB 자체를 되돌리는 기능은 D1에 없음 — 별도 백업이 필요하면 아래 "DB 백업" 참고)

## DB 백업
```
npx wrangler d1 export hakhoe-on --remote --output backup.sql
```
정기적으로 받아서 로컬에 보관 권장. (자동 스케줄링은 없음 — 수동으로 해야 함)
