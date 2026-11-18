import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createFirstAdmin, verifyCredentials } from "@/lib/accounts";
import { listAdminRecords, saveAdminRecord } from "@/lib/admin";
import { db } from "@/lib/db";
import { takeAttempt } from "@/lib/security";
import type { Actor } from "@/lib/roles";

const password = "Sample-password-only-1";
const adminInput = { email: "admin@example.test", name: "테스트 관리자", password };
let admin: Actor;
let own: { id: string };
let other: { id: string };
const headers = new Headers();

async function clearFixture() {
  await db.auditLog.deleteMany();
  await db.user.deleteMany();
  await db.department.deleteMany();
  await db.budgetAccount.deleteMany();
  await db.loginThrottle.deleteMany();
}

beforeAll(async () => { await clearFixture(); });
afterAll(async () => { await clearFixture(); await db.$disconnect(); });

describe("PostgreSQL 시스템 관리", () => {
  it("최초 관리자 등록은 동시 요청 중 한 번만 성공한다", async () => {
    const results = await Promise.all([createFirstAdmin(adminInput), createFirstAdmin(adminInput)]);
    expect(results.sort()).toEqual([false, true]);
    admin = await db.user.findUniqueOrThrow({ where: { email: adminInput.email } });
    expect(admin.role).toBe("SYSTEM_ADMIN");
  });

  it("정상 및 잘못된 인증, 비활성 사용자 차단과 감사 기록을 검증한다", async () => {
    const fail = await verifyCredentials({ ...adminInput, password: "wrong" }, headers);
    expect(fail).toBeNull();
    expect(await verifyCredentials(adminInput, headers)).toMatchObject({ id: admin.id });
    const disabled = { email: "disabled@example.test", name: "테스트 비활성 사용자", password, role: "VIEWER", active: false, departmentId: "" };
    await saveAdminRecord(admin, "users", disabled);
    expect(await verifyCredentials(disabled, headers)).toBeNull();
    expect(await db.auditLog.count({ where: { actorId: admin.id, action: "LOGIN" } })).toBe(1);
  });

  it("예산 코드 중복, 동시 요청 및 변경 감사 기록을 검증한다", async () => {
    const payload = { code: "a-001", name: "인건비", active: true };
    const outcomes = await Promise.allSettled([
      saveAdminRecord(admin, "budget-accounts", payload),
      saveAdminRecord(admin, "budget-accounts", { ...payload, code: " A-001 " }),
    ]);
    expect(outcomes.map(({ status }) => status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(await db.budgetAccount.count()).toBe(1);
    expect(await db.auditLog.count({ where: { entity: "budget-accounts", action: "CREATE" } })).toBe(1);
  });

  it("부서 범위와 관리자 전용 쓰기를 강제한다", async () => {
    own = await saveAdminRecord(admin, "departments", { code: "HR", name: "인사팀", active: true });
    other = await saveAdminRecord(admin, "departments", { code: "FIN", name: "회계팀", active: true });
    const manager: Actor = { id: admin.id, name: "테스트 부서 관리자", role: "DEPARTMENT_MANAGER", departmentId: own.id };
    expect((await listAdminRecords(manager, "departments")).map((record) => record.id)).toEqual([own.id]);
    expect(await listAdminRecords(manager, "departments", other.id)).toEqual([]);
    await expect(listAdminRecords(manager, "users")).rejects.toMatchObject({ status: 403 });
    await expect(saveAdminRecord(manager, "budget-accounts", {}, other.id)).rejects.toMatchObject({ status: 403 });
  });

  it("활성 사용자의 부서 및 마지막 활성 관리자 변경을 보호한다", async () => {
    await saveAdminRecord(admin, "users", { email: "department@example.test", name: "테스트 부서 관리자", password, role: "DEPARTMENT_MANAGER", active: true, departmentId: own.id });
    await expect(saveAdminRecord(admin, "departments", { code: "HR", name: "인사팀", active: false }, own.id)).rejects.toMatchObject({ status: 409 });
    await expect(saveAdminRecord(admin, "users", { ...adminInput, active: false, role: "SYSTEM_ADMIN", departmentId: "" }, admin.id)).rejects.toMatchObject({ status: 409 });
  });

  it("동시 인증 요청에서 한도를 원자적으로 적용한다", async () => {
    const attempts = await Promise.all(Array.from({ length: 10 }, () => takeAttempt("test", "one-account", 3)));
    expect(attempts.filter(Boolean)).toHaveLength(3);
  });
});
