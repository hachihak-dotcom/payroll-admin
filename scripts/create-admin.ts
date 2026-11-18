import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const [{ createFirstAdmin }, { adminSetupSchema }, { db }] = await Promise.all([
    import("../src/lib/accounts"), import("../src/lib/validation"), import("../src/lib/db"),
  ]);
  try {
    const input = adminSetupSchema.safeParse({
      email: process.env.ADMIN_EMAIL, name: process.env.ADMIN_NAME, password: process.env.ADMIN_PASSWORD,
    });
    if (!input.success) throw new Error("ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD 값을 확인하세요.");
    if (!await createFirstAdmin(input.data)) throw new Error("이미 최초 관리자 등록이 완료되었습니다.");
    console.log("최초 시스템 관리자 계정이 등록되었습니다.");
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "관리자 등록에 실패했습니다.");
  process.exitCode = 1;
});
