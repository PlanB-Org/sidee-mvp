"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionArea,
  Button,
  Card,
  Checkbox,
  ContentBadge,
  FormField,
  FormLabel,
  ProgressIndicator,
  RadioGroup,
  RadioGroupItem,
  SectionMessage,
  TextField,
  Typography,
} from "@wanteddev/wds";
import { Container, NotFound, PageLoading } from "@/components/page-shell";
import { api, ApiError } from "@/lib/client";
import type { AnswerValue, Question, TeamView } from "@/lib/types";

/** 단일 선택은 index, 복수 선택은 index 배열. 미응답은 키 자체가 없다. */
type Draft = Record<number, AnswerValue>;

function answered(q: Question, draft: Draft): boolean {
  // 보조 역할(multi)은 선택 응답이라 항상 응답한 것으로 본다.
  if (q.scale === "multi") return true;
  return typeof draft[q.id] === "number";
}

export default function Answer({ params }: PageProps<"/t/[token]">) {
  const { token } = use(params);
  const router = useRouter();

  const [view, setView] = useState<TeamView | null>(null);
  const [missing, setMissing] = useState(false);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    api<TeamView>(`/t/${token}`)
      .then(setView)
      .catch((e) => setMissing(e instanceof ApiError && e.status === 404));
  }, [token]);

  const questions = useMemo(() => view?.questions ?? [], [view]);
  const required = questions.filter((q) => q.scale !== "multi");
  const doneCount = required.filter((q) => answered(q, draft)).length;
  const allDone = doneCount === required.length && required.length > 0;

  if (missing) return <NotFound />;
  if (!view) return <PageLoading />;

  const { team, submitted } = view;
  const full = submitted.length >= team.expected_size;

  const submit = async () => {
    const firstMissing = required.find((q) => !answered(q, draft));
    if (firstMissing) {
      cardRefs.current[firstMissing.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    setBusy(true);
    setError("");
    try {
      const answers: Draft = { ...draft };
      for (const q of questions) {
        if (q.scale === "multi" && answers[q.id] === undefined) answers[q.id] = [];
      }
      await api(`/t/${token}/answers`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), answers }),
      });
      router.push(`/t/${token}/done`);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "";
      setError(
        code === "name_taken"
          ? "이미 같은 이름으로 제출됐어요. 다른 이름을 써주세요."
          : code === "team_full"
            ? "정원이 찼어요. 팀장에게 확인해 주세요."
            : "제출하지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
      setBusy(false);
    }
  };

  return (
    <>
      <Container className="pb-32">
        <div className="flex items-center justify-between gap-3">
          <Typography variant="title3" weight="bold">
            {team.name}
          </Typography>
          <ContentBadge color="neutral">
            {submitted.length}/{team.expected_size}명 제출
          </ContentBadge>
        </div>

        <div className="mt-4">
          <SectionMessage variant="info">
            답변은 팀원에게 이름과 함께 공개됩니다
          </SectionMessage>
        </div>

        {full && (
          <div className="mt-3">
            <SectionMessage variant="cautionary">
              정원이 이미 찼어요. 제출이 거절될 수 있어요.
            </SectionMessage>
          </div>
        )}

        <div className="mt-6">
          <FormField>
            <FormLabel>이름</FormLabel>
            <TextField
              value={name}
              placeholder="팀원이 알아볼 이름"
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Typography variant="label2" color="semantic.label.alternative">
              응답한 문항
            </Typography>
            <Typography variant="label2" color="semantic.label.alternative">
              {doneCount}/{required.length}
            </Typography>
          </div>
          <ProgressIndicator
            percent={required.length ? (doneCount / required.length) * 100 : 0}
          />
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {questions.map((q, i) => (
            <div
              key={q.id}
              ref={(el) => {
                cardRefs.current[q.id] = el;
              }}
            >
              <Card sx={{ padding: 20 }}>
                <div className="flex flex-col gap-4">
                  <Typography variant="headline2" weight="bold">
                    {i + 1}. {q.text}
                  </Typography>

                  {q.scale === "multi" ? (
                    <div className="flex flex-col gap-3">
                      {q.options.map((label, idx) => {
                        const picked = (draft[q.id] as number[]) ?? [];
                        return (
                          <Checkbox
                            key={label}
                            tight
                            checked={picked.includes(idx)}
                            onCheckedChange={(on) =>
                              setDraft((d) => ({
                                ...d,
                                [q.id]: on
                                  ? [...picked, idx].sort((a, b) => a - b)
                                  : picked.filter((v) => v !== idx),
                              }))
                            }
                          >
                            {label}
                          </Checkbox>
                        );
                      })}
                      <Typography
                        variant="caption1"
                        color="semantic.label.assistive"
                      >
                        해당 없으면 비워두세요
                      </Typography>
                    </div>
                  ) : (
                    <RadioGroup
                      value={
                        typeof draft[q.id] === "number"
                          ? String(draft[q.id])
                          : undefined
                      }
                      onValueChange={(v) =>
                        setDraft((d) => ({ ...d, [q.id]: Number(v) }))
                      }
                    >
                      <div className="flex flex-col gap-3">
                        {q.options.map((label, idx) => (
                          <RadioGroupItem key={label} tight value={String(idx)}>
                            {label}
                          </RadioGroupItem>
                        ))}
                      </div>
                    </RadioGroup>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4">
            <SectionMessage variant="negative">{error}</SectionMessage>
          </div>
        )}
      </Container>

      <div className="sticky bottom-0 z-10">
        <ActionArea background>
          <Button
            size="large"
            fullWidth
            loading={busy}
            disabled={!allDone || name.trim().length === 0}
            onClick={submit}
          >
            제출
          </Button>
        </ActionArea>
      </div>
    </>
  );
}
