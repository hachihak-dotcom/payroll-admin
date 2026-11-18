import Link from "next/link";
import { ArrowUpRight, Banknote, BarChart3, BriefcaseBusiness, Building2, ChartColumnIncreasing, CircleAlert, ClipboardCheck, Clock3, FileText, UsersRound, Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { listAdminRecords } from "@/lib/admin";
import { canAdminister } from "@/lib/roles";
import { dateKorea } from "@/lib/sections";
import { getActor } from "@/lib/session";

const payrollMetrics = [
  { label: "전체 등록 근로자", icon: UsersRound, tone: "blue", note: "근로자 관리 기능 연결 예정" },
  { label: "이번 달 지급 대상", icon: BriefcaseBusiness, tone: "indigo", note: "급여 산정 기능 연결 예정" },
  { label: "총 지급 예정액", icon: Wallet, tone: "mint", note: "급여 산정 기능 연결 예정" },
  { label: "전자결재 대기", icon: Clock3, tone: "amber", note: "전자결재 기능 연결 예정" },
  { label: "승인 완료", icon: ClipboardCheck, tone: "blue", note: "전자결재 기능 연결 예정" },
  { label: "지급 완료 금액", icon: Banknote, tone: "mint", note: "급여 지급 기능 연결 예정" },
  { label: "지급 실패", icon: CircleAlert, tone: "rose", note: "급여 지급 기능 연결 예정" },
];

export default async function Dashboard() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  const admin = canAdminister(actor);
  const [departments, budgets, users] = await Promise.all([
    listAdminRecords(actor, "departments"),
    listAdminRecords(actor, "budget-accounts"),
    admin ? listAdminRecords(actor, "users") : [],
  ]);
  const [year, month] = dateKorea().split("-");
  const quickLinks = [
    ...(admin ? [{ name: "사용자 관리", href: "/users", icon: UsersRound, total: users.length }] : []),
    { name: "부서 관리", href: "/departments", icon: Building2, total: departments.length },
    { name: "예산과목 관리", href: "/budget-accounts", icon: FileText, total: budgets.length },
  ];
  return <>
    <PageHeading title="대시보드" description="급여 업무 현황과 시스템의 등록 정보를 확인할 수 있습니다." />
    <section className="dashboard-section" aria-labelledby="payroll-overview">
      <div className="section-title"><h2 id="payroll-overview">급여 업무 현황</h2><span>{year}년 {Number(month)}월</span></div>
      <div className="stats-grid">
        {payrollMetrics.map(({ label, icon: Icon, tone, note }) => <article className="stat-card" key={label}>
          <div className={`stat-icon tone-${tone}`}><Icon size={19} /></div>
          <div><h3>{label}</h3><p className="stat-value" aria-label="연결 예정">—</p><p className="muted small">{note}</p></div>
        </article>)}
      </div>
    </section>
    <div className="dashboard-panels">
      {[
        { name: "예산과목별 지급 현황", icon: ChartColumnIncreasing, copy: "급여 지급 내역이 등록되면 예산과목별 실지급액을 확인할 수 있습니다." },
        { name: "월별 급여 지급 추이", icon: BarChart3, copy: "급여 지급 내역이 등록되면 월별 지급 금액을 확인할 수 있습니다." },
      ].map(({ name, icon: Icon, copy }) => <section className="panel" key={name}>
        <header><h2>{name}</h2></header>
        <div className="empty-panel"><div className="empty-icon"><Icon size={25} /></div><strong>등록된 지급 내역이 없습니다</strong><p>{copy}</p></div>
      </section>)}
    </div>
    <section className="dashboard-section" aria-labelledby="registration-overview">
      <div className="section-title"><h2 id="registration-overview">등록 정보</h2></div>
      <div className="quick-grid">{quickLinks.map(({ name, href, icon: Icon, total }) =>
        <Link className="quick-link" href={href} key={href}><div className="stat-icon tone-blue"><Icon size={18} /></div>
          <div><strong>{name}</strong><small>{total.toLocaleString("ko-KR")}{href === "/users" ? "명" : "건"}</small></div><ArrowUpRight size={17} className="quick-arrow" />
        </Link>)}</div>
    </section>
  </>;
}
