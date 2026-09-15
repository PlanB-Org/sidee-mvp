import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "팀 케미 진단",
  description: "프로젝트 시작 전, 팀이 먼저 합의해야 할 지점을 짚어주는 진단",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
