import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Actor } from "@/lib/roles";

export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await auth();
  if (!session?.account) return null;
  const account = await db.user.findUnique({
    where: { id: session.account.id },
    select: { id: true, name: true, role: true, departmentId: true, active: true, sessionVersion: true, department: { select: { active: true } } },
  });
  if (!account?.active || account.sessionVersion !== session.account.version) return null;
  if (account.role === "DEPARTMENT_MANAGER" && !account.department?.active) return null;
  const { id, name, role, departmentId } = account;
  return { id, name, role, departmentId };
});
