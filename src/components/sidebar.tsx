"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/auth-screen";
import { navigation, settingsNavigation } from "@/lib/sections";

export function Sidebar({ admin }: { admin: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="mobile-toggle" aria-controls="portal-sidebar" aria-expanded={open}
      aria-label={open ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    {open && <button type="button" className="mobile-overlay" aria-label="메뉴 닫기" onClick={() => setOpen(false)} />}
    <aside id="portal-sidebar" className={open ? "sidebar sidebar-open" : "sidebar"}>
      <Link href="/" className="sidebar-brand" onClick={() => setOpen(false)}><Brand inverse /></Link>
      <nav aria-label="주 메뉴">
        <p className="sidebar-label">급여 관리</p>
        {navigation.filter(({ href }) => href !== "/settings").map(({ href, label, icon: Icon }) =>
          <Link className="sidebar-link" aria-current={path === href ? "page" : undefined} href={href} key={href} onClick={() => setOpen(false)}>
            <Icon size={17} />{label}
          </Link>)}
        <p className="sidebar-label">시스템</p>
        {[...navigation.filter(({ href }) => href === "/settings"), ...settingsNavigation]
          .filter(({ href }) => admin || href !== "/users")
          .map(({ href, label, icon: Icon }) =>
            <Link className="sidebar-link" aria-current={path === href ? "page" : undefined} href={href} key={href} onClick={() => setOpen(false)}>
              <Icon size={17} />{label}
            </Link>)}
      </nav>
    </aside>
  </>;
}
