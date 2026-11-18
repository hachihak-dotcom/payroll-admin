import { Banknote, BriefcaseBusiness, Building2, CalendarClock, ChartNoAxesColumnIncreasing, ClipboardCheck, FileText, LayoutDashboard, Settings, UsersRound, Wallet } from "lucide-react";

export const navigation = [
  { label: "대시보드", href: "/", icon: LayoutDashboard },
  { label: "근로자 관리", href: "/workers", icon: UsersRound },
  { label: "근로계약 관리", href: "/contracts", icon: BriefcaseBusiness },
  { label: "근무내역 관리", href: "/timesheets", icon: CalendarClock },
  { label: "급여 산정", href: "/calculation", icon: Banknote },
  { label: "전자결재 현황", href: "/approvals", icon: ClipboardCheck },
  { label: "급여 지급 관리", href: "/payments", icon: Wallet },
  { label: "예산과목 관리", href: "/budget-accounts", icon: FileText },
  { label: "통계 및 보고서", href: "/reports", icon: ChartNoAxesColumnIncreasing },
  { label: "시스템 설정", href: "/settings", icon: Settings },
];

export const settingsNavigation = [
  { label: "사용자 관리", href: "/users", icon: UsersRound },
  { label: "부서 관리", href: "/departments", icon: Building2 },
];
const dateFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
export function dateKorea(value = new Date()) { return dateFormatter.format(value); }
