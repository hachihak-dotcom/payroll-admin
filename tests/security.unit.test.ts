import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { checkSetupToken } from "@/lib/security";
import { catalogSchema, userCreateSchema } from "@/lib/validation";

describe("인증과 입력 검증", () => {
  it("임의의 솔트로 해시하며 올바른 비밀번호만 인증한다", async () => {
    const first = await hashPassword("Test-only passphrase");
    const second = await hashPassword("Test-only passphrase");
    expect(first).not.toBe(second);
    expect(first).not.toContain("Test-only");
    await expect(verifyPassword("Test-only passphrase", first)).resolves.toBe(true);
    await expect(verifyPassword("another-passphrase", second)).resolves.toBe(false);
    await expect(verifyPassword("Test-only passphrase", "invalid")).resolves.toBe(false);
  });

  it("초기 설정 코드를 상수 시간 비교로 검증한다", () => {
    const token = "test".repeat(10);
    expect(checkSetupToken(token, token)).toBe(true);
    expect(checkSetupToken(token + "x", token)).toBe(false);
    expect(checkSetupToken("short", "short")).toBe(false);
    expect(checkSetupToken("x".repeat(257), token)).toBe(false);
  });

  it("코드를 공백 제거 및 대문자로 정규화한다", () => {
    expect(catalogSchema.parse({ code: " bd-01 ", name: " 급여 ", active: true }))
      .toEqual({ code: "BD-01", name: "급여", active: true });
    expect(catalogSchema.safeParse({ code: "<invalid>", name: "급여", active: true }).success).toBe(false);
  });

  it("부서 관리자에게 부서 배정을 요구한다", () => {
    const input = { email: "dept@example.test", name: "테스트 관리자", active: true, departmentId: "", password: "example passphrase", role: "DEPARTMENT_MANAGER" };
    expect(userCreateSchema.safeParse(input).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...input, departmentId: "ab0506ed-d841-4f74-a9d4-4be9e76e75a4" }).success).toBe(true);
  });
});
