# Rentalpartner Mall

렌탈어때 렌탈 쇼핑몰 프론트엔드/백엔드(서버, Firebase Functions) 프로젝트입니다.

## 1) 환경 변수 설정

### 프론트엔드 (`.env`)

```bash
cp .env.example .env
```

필수:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

선택:
- `VITE_API_URL` (기본값: `http://localhost:4000`)
- `VITE_EMAIL_VERIFY_FUNCTION_URL` (로컬에서 Cloud Function 직접 호출 시)
- `VITE_QUOTE_EMAIL_SETTINGS_FUNCTION_URL` (로컬에서 견적 알림 메일 설정 저장/조회 시)
- `VITE_QUOTE_REQUEST_NOTIFY_FUNCTION_URL` (로컬에서 견적 요청 알림 발송 시)

참고:
- `/api/*` 경로는 Firebase Hosting rewrite가 있는 운영 환경에서만 바로 동작합니다.
- `localhost:3000`으로 개발할 때는 위 Cloud Function URL들을 `.env`에 넣어두면 관리자 설정 저장과 알림 발송 테스트가 가능합니다.

### 서버 (`server/.env`)

```bash
cp server/.env.example server/.env
```

필수:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Firebase Functions (`functions/.env`)

```bash
cp functions/.env.example functions/.env
```

필수:
- `EMAIL_USER`
- `EMAIL_PASS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` 또는 `SUPABASE_ANON_KEY`

## 2) 로컬 실행

```bash
npm install
npm --prefix functions install
npm run dev
```

서버를 함께 쓸 경우:

```bash
cd server
npm install
npm run dev
```

## 3) 배포

운영 배포는 항상 아래 명령만 사용하세요. 이 스크립트들은 활성 Firebase 프로젝트와 무관하게
`humanpartner-mall` 프로젝트로 고정 배포합니다.

```bash
npm run deploy:prod
```

- 프론트(Hosting)만 배포

```bash
npm run deploy:prod:functions
```

- 메일 관련 Functions(`sendEmailVerification`, `manageQuoteEmailSettings`, `sendQuoteRequestNotification`)만 배포

```bash
npm run deploy:prod:all
```

- 프론트와 메일 관련 Functions를 함께 배포

주의:
- `firebase deploy`를 단독으로 실행하지 마세요.
- 반드시 위 스크립트로 배포하세요.
- 배포 전에는 아래 검증 명령을 먼저 실행하세요.

```bash
npm run check:release
```

- 프런트와 Firebase Functions 빌드가 모두 통과해야 운영 배포를 진행합니다.

## 4) 공개 오픈 전 확인

- 푸터, 이용약관, 개인정보처리방침의 운영 주체와 연락처 표기가 일치하는지 확인합니다.
- `VITE_FIREBASE_MEASUREMENT_ID`가 운영 `.env`에 설정되어 페이지뷰 및 전환 이벤트가 수집되는지 확인합니다.
- 견적 요청 접수 후 운영 알림 메일이 실제 수신되는지 확인합니다.
- 문의 등록 후 관리자 화면에서 정상 조회되는지 확인합니다.
- 홈, 상품 상세, 견적 요청, 문의 등록 흐름을 모바일/데스크톱에서 각각 한 번씩 점검합니다.

## 5) 일일 운영 체크

- 신규 견적 요청 접수 여부와 운영 메일 수신 여부를 확인합니다.
- 신규 1:1 문의와 미답변 문의를 확인합니다.
- 주요 오류가 분석/예외 이벤트로 들어오는지 확인합니다.
- 고객센터 연락처, 상담 채널, 사업자 정보가 변경되지 않았는지 확인합니다.

## 6) Supabase 초기 스키마 (필수)

신규 Supabase 프로젝트를 연결했다면 `supabase_bootstrap_schema.sql`을 SQL Editor에서 1회 실행하세요.

실행하지 않으면 로그인 시 아래와 같은 오류가 발생할 수 있습니다.
- `PGRST205`
- `Could not find the table 'public.user_profiles' in the schema cache`

