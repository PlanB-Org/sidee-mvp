import sql from "@/lib/db";
import { findTeam, handle, loadQuestions } from "@/lib/api";
import { score } from "@/lib/scoring";
import type { AnswerValue, MemberAnswers } from "@/lib/types";

/** 리포트를 열려면 최소 2명이 제출해야 한다 (기획서 3.5). */
const MIN_SUBMITTED = 2;

type Row = {
  name: string;
  question_id: number;
  value: AnswerValue;
};

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/t/[token]">,
) {
  return handle(async () => {
    const { token } = await ctx.params;
    const team = await findTeam(token);

    const rows = await sql<Row[]>`
      select m.name, a.question_id, a.value
      from members m
      join answers a on a.member_id = m.id
      where m.team_id = ${team.id}
      order by m.submitted_at, a.question_id
    `;

    // 제출 순서를 유지하면서 팀원별로 묶는다.
    const byMember = new Map<string, MemberAnswers>();
    for (const row of rows) {
      let entry = byMember.get(row.name);
      if (!entry) {
        entry = { name: row.name, answers: {} };
        byMember.set(row.name, entry);
      }
      entry.answers[row.question_id] = row.value;
    }
    const members = [...byMember.values()];

    if (members.length < MIN_SUBMITTED) {
      return Response.json(
        { submitted: members.length, expected_size: team.expected_size },
        { status: 409 },
      );
    }

    const questions = await loadQuestions();

    return Response.json({
      team: { name: team.name, expected_size: team.expected_size },
      members: members.map((m) => m.name),
      sections: score(questions, members),
    });
  });
}
