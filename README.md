# 단기직·일용직 급여 지급 관리

공공기관 및 교육기관을 위한 급여 지급 관리 웹 애플리케이션입니다. 현재 버전은 **Phase 1**입니다. Auth.js 로그인과 역할 검증, PostgreSQL 기반 사용자·부서·예산과목 관리를 제공합니다. 대시보드에는 실제 등록 건수를 표시하고 급여 지표에는 단계별 연결 상태를 표시합니다.

## 로컬 환경

Node.js 24, npm, Docker Compose가 필요합니다.

```bash
npm ci
cp .env.example .env
docker compose up -d --wait
```

`.env`의 `AUTH_SECRET`과 선택 항목인 `SETUP_TOKEN`은 각각 `openssl rand -hex 32`로 생성한 서로 다른 값으로 설정합니다. 앱 및 Prisma CLI 모두 이 파일을 읽습니다.

```bash
npm run db:migrate
npm run dev
```

[로컬 로그인](http://localhost:3000/login)에서 **최초 관리자 등록**을 열어 설정 코드와 관리자 이메일, 이름, 비밀번호를 입력합니다. 설정 코드를 비워둔 환경에서는 `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD`를 비공개 환경변수로 지정하여 `npm run admin:create`를 실행할 수 있습니다. 최초 등록은 한 번만 가능합니다.

| 변수 | 목적 |
| --- | --- |
| `DATABASE_URL` | 애플리케이션용 PostgreSQL 연결 URI. 스키마는 `payroll`을 사용합니다. |
| `DATABASE_CA_CERT` | 서버 TLS 검증에 별도 루트 CA가 필요할 때 넣는 PEM 인증서 |
| `AUTH_SECRET` | Auth.js 세션 암호화 및 로그인 제한 키 생성 |
| `AUTH_URL` | 로컬 또는 단일 호스트를 강제할 때 사용하는 정식 주소. Vercel에서는 자동 호스트를 사용할 수 있습니다. |
| `SETUP_TOKEN` | 웹 최초 관리자 등록용 설정 코드. 32자 이상이며, 최초 등록 후 삭제할 수 있습니다. |
| `TEST_DATABASE_URL` | 전용 테스트 DB 연결 URI. DB 이름은 `_test`로 끝나야 합니다. |
| `CHROMIUM_PATH` | 설치된 Chromium을 사용할 경우의 경로 |

## 테스트

```bash
npm run typecheck
npm test
npm run build
npx playwright install chromium
docker compose exec db createdb -U payroll payroll_test
export TEST_DATABASE_URL='postgresql://payroll:payroll_local@127.0.0.1:55432/payroll_test?schema=payroll'
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate
npm run test:integration
npm run test:e2e
```

통합 테스트와 E2E는 테스트 DB의 앱 테이블을 초기화하므로 순서대로 실행하거나 서로 다른 테스트 DB를 사용합니다.

## Vercel 배포

1. Vercel 프로젝트를 Next.js 및 Node.js 24로 설정하고 GitHub 저장소를 연결합니다.
2. PostgreSQL에서 마이그레이션 전용 역할로 `npm run db:migrate`를 실행합니다. 운영 PostgreSQL 연결은 TLS 인증서 검증과 커넥션 풀을 사용합니다. 별도 CA가 필요하면 런타임의 `DATABASE_CA_CERT`에 공식 PEM을 넣고, 마이그레이션 CLI는 연결 문자열의 `sslcert`에 PEM 파일 경로를 지정합니다.
3. Production 환경에 마이그레이션 권한이 없는 런타임 `DATABASE_URL`, `AUTH_SECRET`, 최초 관리자 설정용 `SETUP_TOKEN`을 설정합니다. Preview에 DB가 필요하면 별도의 테스트 DB와 비밀을 사용합니다.
4. 프로덕션 배포의 로그인 화면에서 최초 관리자를 등록합니다. 등록 완료 후 Vercel에서 `SETUP_TOKEN`을 제거하고 환경 변경 사항을 배포합니다.

운영 런타임의 DB 권한과 초기 관리자 설정은 [아키텍처](docs/ARCHITECTURE.md) 및 [데이터베이스](docs/DATABASE.md)에 설명되어 있습니다. 외부 결재·은행 연계와 급여 계산의 구현 조건은 [연계 명세](docs/INTEGRATION_SPEC.md)와 [급여 정책](docs/PAYROLL_RULES.md)에 기록했습니다.

## 프로젝트 구조

| 경로 | 내용 |
| --- | --- |
| `src/app` | 한국어 App Router 화면, Auth.js, 관리 REST API, 로그인 및 설정 Server Actions |
| `src/components` | 공통 레이아웃, TanStack Table 관리 목록, React Hook Form 입력 폼 |
| `src/lib` | 권한, 입력 검증, Prisma, 감사, 외부 연계 인터페이스 |
| `prisma` | PostgreSQL 스키마와 버전 관리 마이그레이션 |
| `tests` | Vitest 단위·PostgreSQL 통합 테스트 및 Playwright E2E |
| `docs` | 요구사항, 아키텍처, 데이터베이스, API 및 테스트 명세 |
