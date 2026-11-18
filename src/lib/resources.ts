export const resources = ["users", "departments", "budget-accounts"] as const;
export type Resource = typeof resources[number];
export const isResource = (value: string): value is Resource => resources.some((resource) => resource === value);
export const adminResource = {
  users: { title: "사용자 관리", singular: "사용자", description: "사용자 계정, 역할, 소속 부서 및 사용 상태를 관리합니다." },
  departments: { title: "부서 관리", singular: "부서", description: "조직의 부서 코드와 부서명을 등록하고 관리합니다." },
  "budget-accounts": { title: "예산과목 관리", singular: "예산과목", description: "급여 지급에 사용할 예산과목 코드와 명칭을 관리합니다." },
} satisfies Record<Resource, { title: string; singular: string; description: string }>;
