import { ArrowUpRight, CalendarClock, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Management } from "@/components/management";
import { PageHeading } from "@/components/page-heading";
import { listAdminRecords } from "@/lib/admin";
import { adminResource, isResource } from "@/lib/resources";
import { canAdminister } from "@/lib/roles";
import { dateKorea, navigation, settingsNavigation } from "@/lib/sections";
import { getActor } from "@/lib/session";

const futureSections: Record<string, { phase: number; description: string }> = {
  workers: { phase: 2, description: "근로자 등록, 근로 상태 및 은행 계좌 관리는 2단계에서 제공됩니다." },
  contracts: { phase: 2, description: "근로계약, 지급 주기 및 계약 변경 이력은 2단계에서 제공됩니다." },
  timesheets: { phase: 3, description: "근무내역 직접 입력, 엑셀 업로드 및 중복 검사는 3단계에서 제공됩니다." },
  calculation: { phase: 4, description: "지급 배치와 검토된 계산 정책을 적용하는 급여 산정은 4단계에서 제공됩니다." },
  approvals: { phase: 5, description: "외부 그룹웨어 결재 요청과 결재 상태 조회는 5단계에서 제공됩니다." },
  payments: { phase: 6, description: "이체 파일 생성 및 지급 결과 관리는 6단계에서 제공됩니다." },
  reports: { phase: 7, description: "지급대장과 통계 검색 및 엑셀 다운로드는 7단계에서 제공됩니다." },
};

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return { title: [...navigation, ...settingsNavigation].find(({ href }) => href === "/" + section)?.label ?? "페이지를 찾을 수 없습니다" };
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const actor = await getActor();
  if (!actor) redirect("/login");
  const admin = canAdminister(actor);
  if (isResource(section)) {
    const { title, description } = adminResource[section];
    if (section === "users" && !admin) return <>
      <PageHeading title={title} description={description} parent="시스템 설정" />
      <div className="panel empty-panel"><div className="empty-icon"><LockKeyhole size={25} /></div><strong>시스템 관리자 권한이 필요합니다</strong></div>
    </>;
    const [records, departments] = await Promise.all([
      listAdminRecords(actor, section), section === "users" ? listAdminRecords(actor, "departments") : [],
    ]);
    const rows = records.map((record) => ({
      id: record.id, name: record.name, active: record.active, updatedAt: dateKorea(record.updatedAt),
      ...("code" in record ? { code: record.code } : {
        email: record.email, role: record.role, departmentId: record.departmentId, department: record.department?.name,
      }),
    }));
    return <Management key={section} resource={section} editable={admin} rows={rows}
      departments={departments.filter((record) => record.active).map(({ id, name }) => ({ id, name }))} />;
  }
  if (section === "settings") return <>
    <PageHeading title="시스템 설정" description="사용자 권한 및 부서 설정을 확인합니다." />
    <div className="quick-grid">{settingsNavigation.filter(({ href }) => admin || href !== "/users").map(({ label, href, icon: Icon }) =>
      <Link href={href} className="quick-link" key={href}><div className="stat-icon tone-blue"><Icon size={19} /></div><strong>{label}</strong><ArrowUpRight className="quick-arrow" size={17} /></Link>)}</div>
  </>;
  const future = Object.hasOwn(futureSections, section) ? futureSections[section] : undefined;
  const menu = navigation.find(({ href }) => href === "/" + section);
  if (!future || !menu) notFound();
  return <>
    <PageHeading title={menu.label} description={future.description} />
    <div className="panel empty-panel future-panel">
      <div className="empty-icon"><CalendarClock size={28} /></div><strong>{future.phase}단계 도입 예정</strong>
      <p>현재 사용할 수 있는 기능은 대시보드와 시스템 관리입니다.</p>
      <Link className="button button-outline" href="/">대시보드로 이동</Link>
    </div>
  </>;
}
