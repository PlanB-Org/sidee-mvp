import type { Metadata } from "next";
import { ThemeProvider, TopNavigation } from "@wanteddev/wds";
import { AppRouterCacheProvider } from "@wanteddev/wds-nextjs";

import "@wanteddev/wds/global.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "팀 케미 진단",
  description: "프로젝트 시작 전, 팀이 먼저 합의해야 할 지점을 짚어주는 진단",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" suppressHydrationWarning className="h-full">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin=""
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-jp-dynamic-subset.min.css"
        />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin=""
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
        />
      </head>
      <body className="flex flex-col">
        <ThemeProvider>
          <AppRouterCacheProvider options={{ prepend: true }}>
            <TopNavigation sx={{ maxWidth: 640, margin: "0 auto" }}>
              팀 케미 진단
            </TopNavigation>
            {children}
          </AppRouterCacheProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
