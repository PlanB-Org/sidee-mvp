"use client";

import {
  FallbackView,
  FallbackViewContent,
  FallbackViewText,
  Loading,
  TopNavigation,
} from "@wanteddev/wds";
import type { ReactNode } from "react";

/**
 * 앱 셸의 골격. 모든 화면은 이 세 개만 조합한다.
 *
 * 원칙: 바(bar)는 full-bleed, 내용만 clamp.
 * 배경·보더는 뷰포트 전체를 덮고 그 안의 콘텐츠만 max-width 로 가운데 정렬한다.
 * 바 자체에 max-width 를 걸면 데스크톱에서 배경이 중간에 끊긴다.
 *
 * 색은 WDS 테마 CSS 변수를 그대로 참조한다. 라이트/다크 전환이 자동으로 따라온다.
 */

type Width = "form" | "wide";

const MAX_WIDTH: Record<Width, string> = {
  form: "max-w-form",
  wide: "max-w-wide",
};

/** 바 안쪽 / 본문 안쪽의 공통 clamp. 좌우 여백을 한 곳에서 관리한다. */
function Clamp({
  width = "form",
  className = "",
  children,
}: {
  width?: Width;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`mx-auto w-full ${MAX_WIDTH[width]} px-gutter ${className}`}
    >
      {children}
    </div>
  );
}

export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-header border-b"
      style={{
        backgroundColor: "var(--semantic-background-normal-normal)",
        borderColor: "var(--semantic-line-normal-alternative)",
      }}
    >
      <Clamp>
        {/*
         * TopNavigation 은 배경이 transparent 라 헤더 배경은 위에서 칠한다.
         * 기본 좌우 패딩(16px)을 0 으로 낮춰 Clamp 의 여백에 맡긴다.
         * 이래야 서비스명이 아래 본문과 좌우로 정확히 맞는다.
         */}
        <TopNavigation
          style={{ "--wds-top-navigation-padding-x": "0px" } as React.CSSProperties}
        >
          팀 케미 진단
        </TopNavigation>
      </Clamp>
    </header>
  );
}

/**
 * 페이지 본문. body 가 flex 컨테이너이고 이 main 이 flex-1 이라
 * 짧은 화면에서도 하단 바가 바닥에 붙는다.
 */
export function Page({
  width = "form",
  center = false,
  className = "",
  children,
}: {
  width?: Width;
  /** 완료·오류처럼 내용이 짧은 화면을 수직 중앙에 둔다. */
  center?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Clamp
        width={width}
        className={`flex min-h-0 flex-1 flex-col py-6 sm:py-10 ${
          center ? "justify-center" : ""
        } ${className}`}
      >
        {children}
      </Clamp>
    </main>
  );
}

/**
 * 하단 고정 바. fixed 가 아니라 sticky 라서 문서 흐름에서 자리를 차지한다.
 * 덕분에 본문에 바 높이만큼 여백을 따로 줄 필요가 없다.
 * iOS 홈 인디케이터 영역은 safe-area 로 피한다.
 */
export function StickyBar({
  width = "form",
  children,
}: {
  width?: Width;
  children: ReactNode;
}) {
  return (
    <div
      className="sticky bottom-0 z-bottom-bar border-t"
      style={{
        backgroundColor: "var(--semantic-background-normal-normal)",
        borderColor: "var(--semantic-line-normal-alternative)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <Clamp width={width}>{children}</Clamp>
    </div>
  );
}

/**
 * 리포트처럼 wide 폭을 쓰는 화면에서 글줄만 다시 좁힌다.
 * 표는 넓게, 읽는 텍스트는 640px 로. 880px 짜리 문단은 눈이 줄을 놓친다.
 */
export function Readable({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`w-full max-w-form ${className}`}>{children}</div>;
}

/**
 * 열이 많은 표를 가로 스크롤시킨다.
 * min-w-0 이 없으면 flex 자식의 기본 min-width:auto 때문에 스크롤이 걸리지 않고
 * 페이지 전체가 가로로 밀린다.
 */
export function ScrollX({ children }: { children: ReactNode }) {
  return <div className="min-w-0 overflow-x-auto">{children}</div>;
}

export function PageLoading() {
  return (
    <Page center className="items-center">
      <Loading />
    </Page>
  );
}

/**
 * 완료·오류·대기 화면의 공통 틀.
 *
 * FallbackView 는 기본 padding="normal" 로 위아래 160px 씩(합 320px)을 넣는다.
 * 그 상태로 두면 박스가 화면 높이를 다 먹어서 Page 의 justify-center 가
 * 중앙에 둘 여백이 없어지고, 내용이 아래로 밀려 보인다.
 * 세로 중앙은 Page center 가 맡으므로 여기서는 자체 패딩을 0 으로 둔다.
 */
export function EmptyState({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Page center>
      <FallbackView sx={{ paddingTop: 0, paddingBottom: 0, width: "100%" }}>
        <FallbackViewContent>
          <FallbackViewText title={title} description={description} />
        </FallbackViewContent>
      </FallbackView>
      {children && (
        <div className="mt-10 flex flex-col items-center gap-2">{children}</div>
      )}
    </Page>
  );
}

export function NotFound() {
  return (
    <EmptyState
      title="링크를 찾을 수 없어요"
      description="주소가 정확한지 확인해 주세요."
    />
  );
}
