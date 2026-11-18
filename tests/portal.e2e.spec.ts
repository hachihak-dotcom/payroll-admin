import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const testSetupToken = "temporary-playwright-only-setup-token-3210";
const email = "first-admin@example.test";
const password = "Testing-only-password-E2E";

async function clearFixture() {
  await db.auditLog.deleteMany();
  await db.user.deleteMany();
  await db.department.deleteMany();
  await db.budgetAccount.deleteMany();
  await db.loginThrottle.deleteMany();
}

test.beforeAll(clearFixture);
test.afterAll(async () => { await clearFixture(); await db.$disconnect(); });

test("관리자 초기 등록, 로그인 실패, 대시보드 및 예산과목 저장", async ({ page, request }) => {
  const guest = await request.get("/api/admin/users");
  expect(guest.status()).toBe(401);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("link", { name: "최초 관리자 등록" }).click();
  await page.getByLabel("설정 코드").fill(testSetupToken);
  await page.getByLabel("이름").fill("검증용 관리자");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "관리자 등록", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?created=1$/);

  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("이메일과 비밀번호를 확인");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  await expect(page.getByText("등록된 지급 내역이 없습니다").first()).toBeVisible();

  await page.getByRole("link", { name: "예산과목 관리" }).first().click();
  await page.getByRole("button", { name: "예산과목 등록" }).first().click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("코드").fill("bd-2026");
  await editor.getByLabel("명칭").fill("검증용 예산과목");
  await editor.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("status")).toHaveText("등록을 완료했습니다.");
  await expect(page.getByRole("cell", { name: "BD-2026" })).toBeVisible();
  const storedBudget = await db.budgetAccount.findUniqueOrThrow({ where: { code: "BD-2026" } });
  expect(storedBudget.name).toBe("검증용 예산과목");

  await page.getByRole("button", { name: "검증용 예산과목 수정" }).click();
  await editor.getByLabel("활성").uncheck();
  await editor.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("cell", { name: "비활성", exact: true })).toBeVisible();
  await page.getByLabel("상태 필터").selectOption("active");
  await expect(page.getByText("검색 결과가 없습니다")).toBeVisible();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("link", { name: "최초 관리자 등록" })).toHaveCount(0);
});

test("부서 관리자 API 범위와 비활성 계정의 기존 세션 차단", async ({ page }) => {
  const main = await db.department.create({ data: { code: "TEST-HR", name: "검증용 인사 부서" } });
  const other = await db.department.create({ data: { code: "TEST-FIN", name: "검증용 회계 부서" } });
  const { scryptSync } = await import("node:crypto");
  const salt = Buffer.alloc(16, 8);
  const hash = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
  const departmentUser = await db.user.create({ data: {
    name: "검증 부서 관리자", email: "department-e2e@example.test", role: "DEPARTMENT_MANAGER",
    passwordHash: `scrypt-v1:${salt.toString("hex")}:${hash.toString("hex")}`, departmentId: main.id,
  } });
  await page.goto("/login");
  await page.getByLabel("이메일").fill(departmentUser.email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  const request = page.request;
  expect((await request.get("/api/admin/users")).status()).toBe(403);
  expect((await request.get("/api/admin/departments/" + other.id)).status()).toBe(404);
  expect((await request.get("/api/admin/departments/" + main.id)).status()).toBe(200);
  expect((await request.post("/api/admin/budget-accounts", { data: { code: "FAIL", name: "테스트", active: true } })).status()).toBe(403);
  await db.user.update({ where: { id: departmentUser.id }, data: { active: false } });
  expect((await request.get("/api/admin/departments")).status()).toBe(401);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
