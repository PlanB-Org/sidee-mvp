"use client";

import {
  FallbackView,
  FallbackViewContent,
  FallbackViewText,
  Loading,
} from "@wanteddev/wds";
import type { ReactNode } from "react";

/** 모바일 우선. 콘텐츠 최대 폭 640px 중앙 정렬 (기획서 3장). */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto flex w-full max-w-[640px] flex-1 flex-col px-5 pt-6 pb-10 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageLoading() {
  return (
    <Container className="items-center justify-center">
      <Loading />
    </Container>
  );
}

export function NotFound() {
  return (
    <Container className="justify-center">
      <FallbackView>
        <FallbackViewContent>
          <FallbackViewText
            title="링크를 찾을 수 없어요"
            description="주소가 정확한지 확인해 주세요."
          />
        </FallbackViewContent>
      </FallbackView>
    </Container>
  );
}
