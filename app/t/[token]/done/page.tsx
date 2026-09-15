"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Button, TextButton, useToast } from "@wanteddev/wds";
import { EmptyState, NotFound, PageLoading } from "@/components/layout";
import { api, ApiError, copy, inviteUrl } from "@/lib/client";
import type { TeamView } from "@/lib/types";

export default function Done({ params }: PageProps<"/t/[token]/done">) {
  const { token } = use(params);
  const toast = useToast();
  const [view, setView] = useState<TeamView | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api<TeamView>(`/t/${token}`)
      .then(setView)
      .catch((e) => setMissing(e instanceof ApiError && e.status === 404));
  }, [token]);

  if (missing) return <NotFound />;
  if (!view) return <PageLoading />;

  const { submitted, team } = view;
  const complete = submitted.length >= team.expected_size;

  const onCopy = async () => {
    const done = await copy(inviteUrl(token));
    toast({
      content: done ? "링크를 복사했어요" : "복사에 실패했어요",
      variant: done ? "positive" : "negative",
    });
  };

  return (
    <EmptyState
      title="제출됐어요"
      description={
        complete
          ? `${team.expected_size}명 모두 제출했어요. 리포트를 확인해 보세요.`
          : `현재 ${submitted.length}/${team.expected_size}명이에요.`
      }
    >
      <Button as={Link} href={`/t/${token}/report`} size="large" fullWidth>
        리포트 보기
      </Button>
      <TextButton onClick={onCopy}>링크 복사</TextButton>
    </EmptyState>
  );
}
