"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  Button,
  SectionMessage,
  TextButton,
  TextField,
  Typography,
  useToast,
} from "@wanteddev/wds";
import { NotFound, Page, PageLoading } from "@/components/layout";
import { api, ApiError, copy, inviteUrl } from "@/lib/client";
import type { TeamView } from "@/lib/types";

export default function Created({ params }: PageProps<"/t/[token]/created">) {
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
  // view 가 채워지는 건 클라이언트 fetch 이후라, 여기서 window 를 읽어도 안전하다.
  if (!view) return <PageLoading />;

  const url = inviteUrl(token);

  const onCopy = async () => {
    const done = await copy(url);
    toast({
      content: done ? "링크를 복사했어요" : "복사에 실패했어요. 직접 선택해 주세요",
      variant: done ? "positive" : "negative",
    });
  };

  return (
    <Page>
      <div className="flex flex-col gap-2">
        <Typography variant="title3" weight="bold">
          {view.team.name} 링크가 만들어졌어요
        </Typography>
        <Typography variant="body2" color="semantic.label.alternative">
          {view.team.expected_size}명이 응답하면 완료돼요
        </Typography>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <TextField value={url} readOnly onFocus={(e) => e.target.select()} />
        <Button fullWidth size="large" onClick={onCopy}>
          링크 복사
        </Button>
      </div>

      <div className="mt-6">
        <SectionMessage variant="info">
          팀원에게 링크를 보내고 각자 응답하면 리포트가 열려요
        </SectionMessage>
      </div>

      <div className="mt-8 flex justify-center">
        {view.submitted.length === 0 ? (
          <TextButton disabled>리포트 보기</TextButton>
        ) : (
          <TextButton as={Link} href={`/t/${token}/report`}>
            리포트 보기
          </TextButton>
        )}
      </div>
    </Page>
  );
}
