"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createFirstAdmin } from "@/lib/accounts";
import { checkSetupToken, requestIdentifier, takeAttempt } from "@/lib/security";
import { adminSetupSchema } from "@/lib/validation";
import type { AuthState } from "@/app/login/actions";

export async function setup(_state: AuthState, form: FormData): Promise<AuthState> {
  if (!await takeAttempt("setup", requestIdentifier(await headers()), 8) || !checkSetupToken(String(form.get("token") ?? ""))) {
    return { error: "설정 코드를 확인하거나 잠시 후 다시 시도하세요." };
  }
  const input = adminSetupSchema.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: input.error.issues[0].message };
  if (!await createFirstAdmin(input.data)) return { error: "이미 최초 관리자 등록이 완료되었습니다." };
  redirect("/login?created=1");
}
