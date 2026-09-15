"use client";

import { use, useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  AvatarGroup,
  Button,
  Card,
  ContentBadge,
  FallbackView,
  FallbackViewContent,
  FallbackViewText,
  List,
  ListCell,
  SectionHeader,
  SectionMessage,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Typography,
  useToast,
} from "@wanteddev/wds";
import {
  NotFound,
  Page,
  PageLoading,
  Readable,
  ScrollX,
} from "@/components/layout";
import { DistributionBar } from "@/components/distribution-bar";
import { api, ApiError, copy, inviteUrl } from "@/lib/client";
import type { ReportView, SplitAxis } from "@/lib/types";

type Pending = { submitted: number; expected_size: number };

function SplitCard({
  card,
  total,
  tone,
}: {
  card: SplitAxis;
  total: number;
  tone: "warning" | "neutral";
}) {
  return (
    <Readable>
      <Card sx={{ padding: 20 }}>
      <div className="flex flex-col gap-4">
        <ContentBadge
          color={tone === "warning" ? "accent" : "neutral"}
          accentColor="semantic.status.cautionary"
        >
          {card.questionText}
        </ContentBadge>
        <DistributionBar buckets={card.buckets} total={total} tone={tone} />
        <Typography variant="body2-reading" color="semantic.label.alternative">
          {card.message}
        </Typography>
        </div>
      </Card>
    </Readable>
  );
}

export default function Report({ params }: PageProps<"/t/[token]/report">) {
  const { token } = use(params);
  const toast = useToast();
  const [view, setView] = useState<ReportView | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api<ReportView>(`/t/${token}/report`)
      .then(setView)
      .catch((e) => {
        if (!(e instanceof ApiError)) return;
        if (e.status === 404) setMissing(true);
        if (e.status === 409) setPending(e.body as unknown as Pending);
      });
  }, [token]);

  const onCopy = async () => {
    const done = await copy(inviteUrl(token));
    toast({
      content: done ? "링크를 복사했어요" : "복사에 실패했어요",
      variant: done ? "positive" : "negative",
    });
  };

  if (missing) return <NotFound />;

  if (pending) {
    return (
      <Page center>
        <FallbackView>
          <FallbackViewContent>
            <FallbackViewText
              title={`아직 ${pending.submitted}/${pending.expected_size}명이에요`}
              description="2명 이상 제출되면 리포트를 볼 수 있어요."
            />
          </FallbackViewContent>
        </FallbackView>
        <div className="mt-8">
          <Button fullWidth size="large" onClick={onCopy}>
            링크 복사
          </Button>
        </div>
      </Page>
    );
  }

  if (!view) return <PageLoading />;

  const { team, members, sections } = view;
  const total = members.length;
  const pendingCount = team.expected_size - total;
  const warned = sections.coverage.filter((c) => c.warn);

  return (
    <Page width="wide">
      {/* 1. 헤더 */}
      <div className="flex flex-col gap-3">
        <Typography variant="title3" weight="bold">
          {team.name}
        </Typography>
        <div className="flex flex-wrap items-center gap-3">
          <AvatarGroup>
            {members.map((m) => (
              <Avatar key={m} size="small" alt={m} />
            ))}
          </AvatarGroup>
          <Typography variant="body2" color="semantic.label.alternative">
            {members.join(", ")}
          </Typography>
          {pendingCount > 0 && (
            <ContentBadge color="neutral">미제출 {pendingCount}명</ContentBadge>
          )}
        </div>
      </div>

      {/* 2. 먼저 합의하세요 */}
      <section className="mt-10 flex flex-col gap-4">
        <SectionHeader headingTag="h2">먼저 합의하세요</SectionHeader>
        {sections.agree_first.length === 0 ? (
          <SectionMessage variant="positive">핵심 축은 잘 맞아요</SectionMessage>
        ) : (
          sections.agree_first.map((c) => (
            <SplitCard key={c.questionId} card={c} total={total} tone="warning" />
          ))
        )}
      </section>

      {/* 3. 알고 시작하면 되는 차이 */}
      {sections.know_first.length > 0 && (
        <section className="mt-10 flex flex-col gap-4">
          <SectionHeader headingTag="h2">알고 시작하면 되는 차이</SectionHeader>
          {sections.know_first.map((c) => (
            <SplitCard key={c.questionId} card={c} total={total} tone="neutral" />
          ))}
        </section>
      )}

      {/* 4. 역할 커버리지 */}
      <section className="mt-10 flex flex-col gap-4">
        <SectionHeader headingTag="h2">역할 커버리지</SectionHeader>
        <ScrollX>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>역할</TableHeadCell>
                {members.map((m) => (
                  <TableHeadCell key={m}>{m}</TableHeadCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sections.coverage.map((row) => (
                <TableRow key={row.optionIndex}>
                  <TableCell>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      {row.role}
                      {row.warn && (
                        <ContentBadge
                          size="xsmall"
                          color="accent"
                          accentColor="semantic.status.cautionary"
                        >
                          {row.status === "empty" ? "비어 있음" : "겹침"}
                        </ContentBadge>
                      )}
                    </span>
                  </TableCell>
                  {members.map((m) => (
                    <TableCell key={m} align="center">
                      {row.main.includes(m) ? "●" : row.sub.includes(m) ? "○" : ""}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollX>
        <Typography variant="caption1" color="semantic.label.assistive">
          ● 주력 · ○ 보조
          {warned.length === 0 && " · 비거나 몰린 역할이 없어요"}
        </Typography>
      </section>

      {/* 5. 잘 맞는 부분 */}
      {sections.aligned.length > 0 && (
        <section className="mt-10 flex flex-col gap-2">
          <SectionHeader headingTag="h2">잘 맞는 부분</SectionHeader>
          <Readable>
            <List>
            {sections.aligned.map((a) => (
              <ListCell
                key={a.questionId}
                divider
                textProps={{ children: a.questionText, caption: a.answerLabel }}
              />
            ))}
            </List>
          </Readable>
        </section>
      )}

      {/* 6. 전체 응답표 */}
      <section className="mt-10">
        <Accordion divider>
          <AccordionSummary>전체 응답표</AccordionSummary>
          <AccordionDetails>
            <div className="pt-2">
              <ScrollX>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>문항</TableHeadCell>
                    {members.map((m) => (
                      <TableHeadCell key={m}>{m}</TableHeadCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sections.raw.map((row) => (
                    <TableRow key={row.questionId}>
                      <TableCell>
                        <span className="block min-w-40">{row.questionText}</span>
                      </TableCell>
                      {members.map((m) => (
                        <TableCell key={m}>
                          {row.answers[m]?.join(", ") || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </ScrollX>
            </div>
          </AccordionDetails>
        </Accordion>
      </section>

      <Readable className="mt-10">
        <Button
          variant="outlined"
          color="assistive"
          fullWidth
          size="large"
          onClick={onCopy}
        >
          링크 복사
        </Button>
      </Readable>
    </Page>
  );
}
