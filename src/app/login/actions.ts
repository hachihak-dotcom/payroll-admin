"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type AuthState = { error?: string };
export async function login(_state: AuthState, form: FormData): Promise<AuthState> {
  try {
    await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirectTo: "/" });
    return {};
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    return { error: error.type === "CredentialsSignin"
      ? "이메일과 비밀번호를 확인하거나 잠시 후 다시 시도하세요."
      : "로그인 요청을 처리할 수 없습니다. 잠시 후 다시 시도하세요." };
  }
}
export async function logout() {
  await signOut({ redirectTo: "/login" });
}
