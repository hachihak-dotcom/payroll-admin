import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "급여 지급 관리", template: "%s | 급여 지급 관리" },
  description: "단기직·일용직 급여 지급 관리",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
