"use client";

import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthState } from "@/app/login/actions";

type Props = { setup?: boolean; action: (state: AuthState, form: FormData) => Promise<AuthState> };
export function AuthForm({ setup, action }: Props) {
  const [state, submit, pending] = useActionState(action, {});
  const [visible, setVisible] = useState(false);
  return <form className="auth-form" action={submit}>
    {setup && <>
      <label>설정 코드<input required name="token" type="password" maxLength={256} autoComplete="off" /></label>
      <label>이름<input required name="name" maxLength={80} autoComplete="name" /></label>
    </>}
    <label>이메일<input required name="email" type="email" maxLength={254} autoComplete="username" placeholder="name@example.org" /></label>
    <label htmlFor="password">비밀번호</label>
    <div className="password-field">
      <input required id="password" name="password" type={visible ? "text" : "password"} minLength={setup ? 12 : undefined} maxLength={128}
        autoComplete={setup ? "new-password" : "current-password"} placeholder={setup ? "12자 이상 입력" : "비밀번호를 입력하세요"} />
      <button type="button" aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"} aria-pressed={visible} onClick={() => setVisible(!visible)}>
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <Button className="auth-submit" type="submit" disabled={pending}>
      {pending ? "처리 중…" : setup ? "관리자 등록" : "로그인"} <ArrowRight size={17} />
    </Button>
  </form>;
}
