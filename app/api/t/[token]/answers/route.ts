import sql from "@/lib/db";
import { fail, handle, loadQuestions } from "@/lib/api";
import type { AnswerValue, Question } from "@/lib/types";

/** 문항 하나의 응답이 스키마에 맞는지 본다. 맞으면 저장할 값을, 아니면 undefined. */
function normalize(q: Question, raw: unknown): AnswerValue | undefined {
  const max = q.options.length - 1;
  const inRange = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= max;

  if (q.scale === "multi") {
    // 보조 역할은 선택 응답이다. 빈 배열을 허용한다.
    if (!Array.isArray(raw)) return undefined;
    if (!raw.every(inRange)) return undefined;
    return [...new Set(raw as number[])].sort((a, b) => a - b);
  }

  return inRange(raw) ? (raw as number) : undefined;
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/t/[token]">,
) {
  return handle(async () => {
    const { token } = await ctx.params;
    const body = await request.json().catch(() => null);

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) throw fail(422, "name_required");
    if (name.length > 20) throw fail(422, "name_too_long");

    const raw = body?.answers;
    if (!raw || typeof raw !== "object") throw fail(422, "answers_required");

    const questions = await loadQuestions();
    const values: { questionId: number; value: AnswerValue }[] = [];
    const missing: number[] = [];

    for (const q of questions) {
      const v = normalize(q, raw[q.id]);
      // multi(10번)만 미응답을 빈 배열로 채운다. 나머지는 누락으로 본다.
      if (v === undefined) {
        if (q.scale === "multi") values.push({ questionId: q.id, value: [] });
        else missing.push(q.id);
        continue;
      }
      values.push({ questionId: q.id, value: v });
    }

    if (missing.length > 0) throw fail(422, "answers_incomplete", { missing });

    await sql.begin(async (tx) => {
      // 팀 행을 잠가 동시 제출이 정원을 넘기지 못하게 한다.
      const [team] = await tx<{ id: string; expected_size: number }[]>`
        select id, expected_size from teams where token = ${token} for update
      `;
      if (!team) throw fail(404, "team_not_found");

      // 이미 제출한 사람이 다시 눌렀을 때 정원 메시지가 나가지 않도록 이름을 먼저 본다.
      const [taken] = await tx`
        select 1 from members where team_id = ${team.id} and name = ${name}
      `;
      if (taken) throw fail(409, "name_taken");

      const [{ count }] = await tx<{ count: number }[]>`
        select count(*)::int as count from members where team_id = ${team.id}
      `;
      if (count >= team.expected_size) throw fail(409, "team_full");

      const [member] = await tx<{ id: string }[]>`
        insert into members (team_id, name) values (${team.id}, ${name})
        on conflict (team_id, name) do nothing
        returning id
      `;
      if (!member) throw fail(409, "name_taken");

      // jsonb 컬럼이다. 문자열로 미리 직렬화하면 숫자 0 이 아니라 문자열 "0" 으로 들어간다.
      await tx`
        insert into answers ${tx(
          values.map((v) => ({
            member_id: member.id,
            question_id: v.questionId,
            value: tx.json(v.value),
          })),
          "member_id",
          "question_id",
          "value",
        )}
      `;
    });

    return new Response(null, { status: 201 });
  });
}
