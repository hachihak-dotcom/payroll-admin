# REST API 명세

모든 관리 엔드포인트는 인증된 활성 사용자 세션이 필요합니다. 관리 리소스는 `users`, `departments`, `budget-accounts`입니다.

| 메서드 | 경로 | 작업 |
| --- | --- | --- |
| GET | `/api/admin/{resource}` | 역할 범위의 목록 조회 |
| GET | `/api/admin/{resource}/{uuid}` | 역할 범위의 항목 상세 조회 |
| POST | `/api/admin/{resource}` | 시스템 관리자 등록, HTTP 201 |
| PATCH | `/api/admin/{resource}/{uuid}` | 시스템 관리자 수정 또는 비활성화 |

부서와 예산과목은 `code`, `name`, `active`를 받습니다. 코드의 최대 길이는 24자입니다. 사용자 필드는 `name`, `email`, `role`, `departmentId`, `active`, `password`입니다. 미지정 부서는 빈 문자열로 보냅니다. 계정 등록 시 12~128자의 비밀번호가 필요하며, 수정 시 비밀번호 생략 또는 빈 문자열은 기존 해시를 보존합니다. PATCH는 전체 편집 가능 필드를 받습니다.

성공 응답에는 `data`, 오류 응답에는 한국어 `error`가 포함됩니다. 주요 오류는 401(미인증), 403(권한·출처), 404(찾을 수 없는 항목 또는 부서 범위 밖의 항목), 409(중복과 상태 충돌), 422(입력 검증)입니다.
