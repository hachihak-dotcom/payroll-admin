# 데이터베이스

| Phase 1 테이블 | 제약 및 목적 |
| --- | --- |
| `users` | 정규화한 고유 이메일, 역할, 비밀번호 해시, 세션 버전, 부서 참조 |
| `departments` | 고유 부서 코드, 명칭, 활성 상태 |
| `budget_accounts` | 고유 예산 코드, 명칭, 활성 상태 |
| `audit_logs` | 행위자와 대상의 변경 이력. 대상 및 행위자별 시각 인덱스 |
| `login_throttles` | 고유 HMAC 키와 시간 구간별 로그인 시도 횟수 |
| `_prisma_migrations` | Prisma 버전 관리 메타데이터 |

업무 테이블은 UUID와 생성·수정 시각을 사용합니다. 부서 참조와 감사 행위자 참조는 물리 삭제를 제한합니다. 화면에서 사용하는 비활성화는 레코드를 보존합니다.

운영에서 `payroll` 스키마는 PostgREST 공개 대상에 넣지 않습니다. 애플리케이션 역할은 관리 테이블에 조회·등록·수정, 인증 시도 테이블에 조회·등록·수정, 감사 로그에 등록 및 반환 ID 조회 권한만 갖습니다. 마이그레이션 전용 역할은 별도로 관리합니다.

## 이후 단계 설계

- 2단계는 `workers`, `contracts`, `bank_accounts`와 계약 이력을 추가합니다.
- 3단계는 `timesheets`, `import_jobs`와 DB 중복 제약을 추가합니다.
- 4단계는 `payroll_policies`, `payroll_batches`, `payroll_items`, `payroll_components`, `payroll_item_sources`, `budget_allocations`를 추가합니다.
- 5단계는 `approval_requests`, `approval_events`, `integration_configs`를 추가합니다.
- 6단계는 `transfer_files`, `payment_records`를 추가합니다.

급여 확정 시 승인된 정책과 당시 계약, 시간, 수당 및 공제를 스냅샷으로 고정합니다. 정산 원천에는 고유 제약을 적용하고 배치 확정 트랜잭션에서 동일 근무의 중복 지급을 막습니다.
