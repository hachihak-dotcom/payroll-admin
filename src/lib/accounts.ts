import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { credentialsSchema, type adminSetupSchema } from "@/lib/validation";
import type { z } from "zod";
import { requestIdentifier, takeAttempt } from "@/lib/security";

export async function verifyCredentials(input: unknown, requestHeaders: Headers) {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success || !await takeAttempt("login-ip", requestIdentifier(requestHeaders), 60)) return null;

  const { email, password } = parsed.data;
  if (!await takeAttempt("login-account", email, 10)) return null;
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, active: true, sessionVersion: true, passwordHash: true, name: true, email: true, role: true, department: { select: { active: true } } },
  });
  if (!await verifyPassword(password, user?.passwordHash) || !user?.active || (user.role === "DEPARTMENT_MANAGER" && !user.department?.active)) return null;
  await db.auditLog.create({ data: { actorId: user.id, action: "LOGIN", entity: "users", entityId: user.id }, select: { id: true } });
  return { id: user.id, name: user.name, email: user.email, sessionVersion: user.sessionVersion };
}

export async function lockAdminChanges(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(42182, 1)`;
}

export async function createFirstAdmin({ name, email, password }: z.output<typeof adminSetupSchema>) {
  const passwordHash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    await lockAdminChanges(tx);
    if (await tx.user.count()) return false;
    const admin = await tx.user.create({ data: { name, email, passwordHash, role: "SYSTEM_ADMIN" }, select: { id: true } });
    await tx.auditLog.create({ data: { actorId: admin.id, action: "BOOTSTRAP", entity: "users", entityId: admin.id }, select: { id: true } });
    return true;
  });
}
