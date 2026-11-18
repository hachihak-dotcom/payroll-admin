import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth-screen";
import { AuthForm } from "@/components/auth-form";
import { db } from "@/lib/db";
import { setup } from "./actions";

export const metadata = { title: "최초 관리자 등록" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!process.env.SETUP_TOKEN || process.env.SETUP_TOKEN.length < 32 || await db.user.count()) redirect("/login");
  return <AuthScreen>
    <h1>최초 관리자 등록</h1>
    <p className="auth-description">배포 환경에 지정한 설정 코드와 관리자 계정 정보를 입력하세요.</p>
    <AuthForm setup action={setup} />
    <Link className="auth-link" href="/login">로그인으로 돌아가기</Link>
  </AuthScreen>;
}
