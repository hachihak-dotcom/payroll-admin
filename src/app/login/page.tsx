import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth-screen";
import { AuthForm } from "@/components/auth-form";
import { getActor } from "@/lib/session";
import { db } from "@/lib/db";
import { login } from "./actions";

export const metadata = { title: "로그인" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  if (await getActor()) redirect("/");
  const { created } = await searchParams;
  const setupAvailable = Boolean(process.env.SETUP_TOKEN && process.env.SETUP_TOKEN.length >= 32) && await db.user.count() === 0;
  return <AuthScreen>
    <h1>로그인</h1>
    <p className="auth-description">기관에서 발급한 계정으로 로그인하세요.</p>
    {created === "1" && <p className="form-success" role="status">시스템 관리자가 등록되었습니다. 방금 등록한 계정으로 로그인하세요.</p>}
    <AuthForm action={login} />
    {setupAvailable && <Link className="auth-link" href="/setup">최초 관리자 등록</Link>}
  </AuthScreen>;
}
