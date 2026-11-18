import { Building2, ChevronRight, ClipboardCheck, FileText, LayoutDashboard, ShieldCheck, UsersRound, Wallet } from "lucide-react";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <div className={inverse ? "brand brand-inverse" : "brand"}>
    <span className="brand-mark"><Building2 size={22} aria-hidden="true" /></span>
    <span><strong>급여 지급 관리</strong><small>단기직·일용직 관리 시스템</small></span>
  </div>;
}

export function AuthScreen({ children }: { children: React.ReactNode }) {
  return <main className="auth-screen">
    <section className="auth-cover" aria-label="서비스 소개">
      <Brand inverse />
      <div className="auth-cover-content">
        <p className="auth-intro">행정업무 포털</p>
        <h2>단기직·일용직<br />급여 지급 관리 시스템</h2>
        <p>부서와 예산과목을 등록하고, 업무에 맞는 사용자 권한을 관리하세요.</p>
        <div className="auth-illustration" aria-hidden="true">
          <div className="illustration-top"><LayoutDashboard size={18} /> 대시보드</div>
          {[[UsersRound, "사용자 관리"], [FileText, "예산과목 관리"], [ClipboardCheck, "전자결재 현황"], [Wallet, "급여 지급 관리"]].map(([ItemIcon, name]) => {
            const Icon = ItemIcon as typeof UsersRound;
            return <div className="illustration-row" key={String(name)}><span><Icon size={17} />{String(name)}</span><ChevronRight size={14} /></div>;
          })}
        </div>
      </div>
      <div className="auth-cover-footer"><ShieldCheck size={16} /> 기관별 계정과 접근 권한으로 보호됩니다.</div>
    </section>
    <section className="auth-main">
      <div className="auth-main-inner">
        <div className="auth-mobile-brand"><Brand /></div>
        {children}
      </div>
    </section>
  </main>;
}
