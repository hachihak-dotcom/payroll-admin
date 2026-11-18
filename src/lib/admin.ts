import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { lockAdminChanges } from "@/lib/accounts";
import { hashPassword } from "@/lib/password";
import { canAdminister, type Actor } from "@/lib/roles";
import { catalogSchema, userCreateSchema, userUpdateSchema } from "@/lib/validation";

import type { Resource } from "@/lib/resources";

export class AdminError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const userSelect = {
  id: true, name: true, email: true, role: true, active: true, departmentId: true,
  department: { select: { name: true } }, updatedAt: true,
} satisfies Prisma.UserSelect;

export function assertReadable(actor: Actor, resource: Resource) {
  if (resource === "users" && !canAdminister(actor)) throw new AdminError(403, "이 메뉴의 조회 권한이 없습니다.");
}

export async function listAdminRecords(actor: Actor, resource: Resource, id?: string) {
  assertReadable(actor, resource);
  if (resource === "users") {
    return db.user.findMany({ where: { id }, select: userSelect, orderBy: { name: "asc" } });
  }
  if (resource === "departments") {
    if (actor.role === "DEPARTMENT_MANAGER" && (!actor.departmentId || (id && actor.departmentId !== id))) return [];
    return db.department.findMany({ where: { id: actor.role === "DEPARTMENT_MANAGER" ? actor.departmentId! : id }, orderBy: { code: "asc" } });
  }
  return db.budgetAccount.findMany({ where: { id }, orderBy: { code: "asc" } });
}

async function changeUser(tx: Prisma.TransactionClient, resourceId: string | undefined, input: unknown, passwordHash: string | undefined) {
  const schema = resourceId ? userUpdateSchema : userCreateSchema;
  const { password: _password, ...data } = schema.parse(input);
  if (data.departmentId && !await tx.department.findFirst({ where: { id: data.departmentId, active: true } })) {
    throw new AdminError(422, "사용 중인 부서를 선택하세요.");
  }
  if (!resourceId) return tx.user.create({ data: { ...data, passwordHash: passwordHash! }, select: userSelect });

  const current = await tx.user.findUnique({ where: { id: resourceId } });
  if (!current) throw new AdminError(404, "사용자를 찾을 수 없습니다.");
  if (current.active && current.role === "SYSTEM_ADMIN" && (!data.active || data.role !== "SYSTEM_ADMIN") &&
      await tx.user.count({ where: { role: "SYSTEM_ADMIN", active: true } }) === 1) {
    throw new AdminError(409, "마지막 활성 시스템 관리자는 비활성화하거나 역할을 변경할 수 없습니다.");
  }
  const invalidateSession = passwordHash || current.role !== data.role || current.active !== data.active ||
    current.departmentId !== data.departmentId || current.email !== data.email;
  return tx.user.update({
    where: { id: resourceId },
    data: { ...data, passwordHash, sessionVersion: invalidateSession ? { increment: 1 } : undefined },
    select: userSelect,
  });
}

export async function saveAdminRecord(actor: Actor, resource: Resource, input: unknown, id?: string) {
  if (!canAdminister(actor)) throw new AdminError(403, "시스템 관리자 권한이 필요합니다.");
  const userData = resource === "users" ? (id ? userUpdateSchema : userCreateSchema).parse(input) : null;
  const catalogData = resource !== "users" ? catalogSchema.parse(input) : null;
  const passwordHash = userData?.password ? await hashPassword(userData.password) : undefined;
  return db.$transaction(async (tx) => {
    await lockAdminChanges(tx);
    const actingUser = await tx.user.findFirst({ where: { id: actor.id, active: true, role: "SYSTEM_ADMIN" }, select: { id: true } });
    if (!actingUser) throw new AdminError(403, "시스템 관리자 권한이 필요합니다.");

    if (resource === "departments" && id && catalogData?.active === false &&
        await tx.user.findFirst({ where: { departmentId: id, active: true } })) {
      throw new AdminError(409, "활성 사용자가 소속된 부서입니다. 먼저 사용자 소속을 변경하거나 비활성화하세요.");
    }
    const record = resource === "users" ? await changeUser(tx, id, input, passwordHash)
      : resource === "departments" ? (id ? await tx.department.update({ where: { id }, data: catalogData! }) : await tx.department.create({ data: catalogData! }))
      : id ? await tx.budgetAccount.update({ where: { id }, data: catalogData! }) : await tx.budgetAccount.create({ data: catalogData! });
    await tx.auditLog.create({
      data: { actorId: actor.id, action: id ? "UPDATE" : "CREATE", entity: resource, entityId: record.id },
      select: { id: true },
    });
    return record;
  });
}
