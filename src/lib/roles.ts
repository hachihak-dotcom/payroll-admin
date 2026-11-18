import type { Role } from "@prisma/client";

export const roles = ["SYSTEM_ADMIN", "PAYROLL_MANAGER", "DEPARTMENT_MANAGER", "VIEWER"] as const;
export const roleLabels: Record<Role, string> = {
  SYSTEM_ADMIN: "시스템 관리자",
  PAYROLL_MANAGER: "급여 관리자",
  DEPARTMENT_MANAGER: "부서 관리자",
  VIEWER: "조회 사용자",
};
export type Actor = { id: string; name: string; role: Role; departmentId: string | null };
export function canAdminister(actor: Actor) {
  return actor.role === "SYSTEM_ADMIN";
}
