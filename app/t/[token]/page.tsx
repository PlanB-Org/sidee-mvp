"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import {
  ActionArea,
  Button,
  Checkbox,
  ContentBadge,
  FormField,
  FormLabel,
  List,
  ListCell,
  ProgressTracker,
  ProgressTrackerItem,
  RadioGroup,
  RadioGroupItem,
  SectionMessage,
  TextButton,
  TextField,
  Typography,
} from "@wanteddev/wds";
import {
  NotFound,
  Page,
  PageLoading,
  StickyBar,
} from "@/components/layout";
import { api, ApiError } from "@/lib/client";
import type { AnswerValue, Question, TeamView } from "@/lib/types";

/** 단일 선택은 index, 복수 선택은 index 배열. 미응답은 키 자체가 없다. */
type Draft = Record<number, AnswerValue>;

/**
 * 문항을 3단계로 나눈다. 문항 id 를 박지 않고 기획서의 분류(weight, kind)로
 * 나누므로 문항이 교체돼도 그대로 동작한다.
 */
const STEPS = [
  {
    value: "core",
    label: "핵심",
    title: "먼저 이것부터",
    description: "이 세 가지가 갈리면 프로젝트 중간에 반드시 부딪혀요.",
    match: (q: Question) => q.kind === "same" && q.weight === "high",
  },
  {
    value: "style",
    label: "일하는 방식",
    title: "일하는 방식",
    description: "맞고 틀린 답이 없어요. 서로 다르다는 걸 알아두면 됩니다.",
    match: (q: Question) => q.kind === "same" && q.weight === "normal",
  },
  {
    value: "role",
    label: "역할",
    title: "역할",
    description: "팀에 비어 있는 자리가 있는지 확인해요.",
    match: (q: Question) => q.kind === "complement",
  },
] as const;

/** 보조 역할(multi)은 선택 응답이라 항상 응답한 것으로 본다. */
function answered(q: Question, draft: Draft): boolean {
  if (q.scale === "multi") return true;
  return typeof draft[q.id] === "number";
}

function QuestionCard({
  index,
  question,
  draft,
  setDraft,
}: {
  index: number;
  question: Question;
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
}) {
  const picked = (draft[question.id] as number[]) ?? [];

  return (
    <section className="flex flex-col gap-3">
      <Typography variant="headline2" weight="bold">
        {index}. {question.text}
      </Typography>

      {/*
       * ListCell 은 내부에서 [role="radio"], [role="checkbox"] 를 찾아
       * 행 전체 클릭을 위임한다. Radio 단독은 라벨을 그리지 않으므로
       * (button role=radio 만 렌더) 이 조합이 WDS 가 의도한 형태다.
       */}
      {question.scale === "multi" ? (
        <List>
          {question.options.map((label, idx) => (
            <ListCell
              key={label}
              leadingContent={
                <Checkbox
                  tight
                  checked={picked.includes(idx)}
                  onCheckedChange={(on) =>
                    setDraft((d) => ({
                      ...d,
                      [question.id]: on
                        ? [...picked, idx].sort((a, b) => a - b)
                        : picked.filter((v) => v !== idx),
                    }))
                  }
                />
              }
            >
              {label}
            </ListCell>
          ))}
        </List>
      ) : (
        <RadioGroup
          value={
            typeof draft[question.id] === "number"
              ? String(draft[question.id])
              : undefined
          }
          onValueChange={(v) =>
            setDraft((d) => ({ ...d, [question.id]: Number(v) }))
          }
        >
          <List>
            {question.options.map((label, idx) => (
              <ListCell
                key={label}
                leadingContent={<RadioGroupItem tight value={String(idx)} />}
              >
                {label}
              </ListCell>
            ))}
          </List>
        </RadioGroup>
      )}

      {question.scale === "multi" && (
        <Typography variant="caption1" color="semantic.label.assistive">
          해당 없으면 비워두세요
        </Typography>
      )}
    </section>
  );
}

export default function Answer({ params }: PageProps<"/t/[token]">) {
  const { token } = use(params);
  const router = useRouter();

  const [view, setView] = useState<TeamView | null>(null);
  const [missing, setMissing] = useState(false);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [stepValue, setStepValue] = useState<string>(STEPS[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");


  useEffect(() => {
    api<TeamView>(`/t/${token}`)
      .then(setView)
      .catch((e) => setMissing(e instanceof ApiError && e.status === 404));
  }, [token]);

  const questions = useMemo(() => view?.questions ?? [], [view]);

  /** 각 단계에 속한 문항과, 전체 문항에서의 번호를 함께 들고 있는다. */
  const grouped = useMemo(
    () =>
      STEPS.map((step) => ({
        ...step,
        items: questions
          .map((q, i) => ({ question: q, index: i + 1 }))
          .filter(({ question }) => step.match(question)),
      })),
    [questions],
  );

  if (missing) return <NotFound />;
  if (!view) return <PageLoading />;

  const { team, submitted } = view;
  const full = submitted.length >= team.expected_size;

  const stepIndex = STEPS.findIndex((s) => s.value === stepValue);
  const current = grouped[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const stepDone = (i: number) =>
    grouped[i].items.every(({ question }) => answered(question, draft));

  // 이름은 첫 단계에서 받는다.
  const firstStepReady = name.trim().length > 0 && stepDone(0);
  const canAdvance = stepIndex === 0 ? firstStepReady : stepDone(stepIndex);
  const allDone = STEPS.every((_, i) => stepDone(i)) && name.trim().length > 0;

  const goTo = (value: string) => {
    setStepValue(value);
    setError("");
    // scrollIntoView 는 sticky 헤더 뒤로 들어가 버린다. 문서 최상단으로 올린다.
    window.scrollTo({ top: 0 });
  };

  const submit = async () => {
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
      <Page>
        <div className="flex items-center justify-between gap-3">
          <Typography variant="title3" weight="bold">
            {team.name}
          </Typography>
          <ContentBadge color="neutral">
            {submitted.length}/{team.expected_size}명 제출
          </ContentBadge>
        </div>

        <div className="mt-6">
          {/* 이미 지난 단계로만 되돌아갈 수 있게 한다. 앞 단계를 건너뛰지 못하게. */}
          <ProgressTracker
            value={stepValue}
            onValueChange={(v) => {
              const target = STEPS.findIndex((s) => s.value === v);
              if (target <= stepIndex) goTo(v);
            }}
          >
            {STEPS.map((s) => (
              <ProgressTrackerItem key={s.value} value={s.value} label={s.label} />
            ))}
          </ProgressTracker>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <Typography variant="title3" weight="bold">
            {current.title}
          </Typography>
          <Typography variant="body2-reading" color="semantic.label.alternative">
            {current.description}
          </Typography>
        </div>

        {stepIndex === 0 && (
          <>
            <div className="mt-6">
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
          </>
        )}

        <div className="mt-8 flex flex-col gap-10">
          {current.items.map(({ question, index }) => (
            <QuestionCard
              key={question.id}
              index={index}
              question={question}
              draft={draft}
              setDraft={setDraft}
            />
          ))}
        </div>

        {error && (
          <div className="mt-6">
            <SectionMessage variant="negative">{error}</SectionMessage>
          </div>
        )}

        {stepIndex > 0 && (
          <div className="mt-8 flex justify-center">
            <TextButton onClick={() => goTo(STEPS[stepIndex - 1].value)}>
              이전 단계
            </TextButton>
          </div>
        )}
      </Page>

      <StickyBar>
        <ActionArea>
          {isLast ? (
            <Button
              size="large"
              fullWidth
              loading={busy}
              disabled={!allDone}
              onClick={submit}
            >
              제출
            </Button>
          ) : (
            <Button
              size="large"
              fullWidth
              disabled={!canAdvance}
              onClick={() => goTo(STEPS[stepIndex + 1].value)}
            >
              다음
            </Button>
          )}
        </ActionArea>
      </StickyBar>
    </>
  );
}
