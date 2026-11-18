import { CalendarDays, LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { Sidebar } from "@/components/sidebar";
import { canAdminister, roleLabels } from "@/lib/roles";
import { dateKorea } from "@/lib/sections";
import { getActor } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return <div className="portal">
    <a className="skip-link" href="#portal-content">본문으로 이동</a>
    <Sidebar admin={canAdminister(actor)} />
    <div className="portal-body">
      <header className="topbar">
        <span className="topbar-title">급여 지급 관리</span>
        <div className="topbar-right">
          <span className="header-date"><CalendarDays size={16} /> {dateKorea()}</span>
          <div className="header-user">
            <span className="avatar" aria-hidden="true">{Array.from(actor.name)[0]}</span>
            <span><strong>{actor.name}</strong><small>{roleLabels[actor.role]}</small></span>
          </div>
          <form action={logout}><button className="icon-button" type="submit" aria-label="로그아웃" title="로그아웃"><LogOut size={18} /></button></form>
        </div>
      </header>
      <main id="portal-content" className="portal-content">{children}</main>
    </div>
  </div>;
}
