import type { Question } from "./types";
import sql from "./db";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: Record<string, unknown>,
  ) {
    super(String(body.error ?? status));
  }
}

export function fail(status: number, error: string, extra = {}) {
  return new HttpError(status, { error, ...extra });
}

/** 라우트 핸들러를 감싸 HttpError 를 JSON 응답으로 바꾼다. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) {
      return Response.json(err.body, { status: err.status });
    }
    console.error(err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}

export type TeamRow = {
  id: string;
  name: string;
  token: string;
  expected_size: number;
};

/** 토큰으로 팀을 찾는다. 없으면 404. */
export async function findTeam(token: string): Promise<TeamRow> {
  const [team] = await sql<TeamRow[]>`
    select id, name, token, expected_size
    from teams
    where token = ${token}
  `;
  if (!team) throw fail(404, "team_not_found");
  return team;
}

export async function loadQuestions(): Promise<Question[]> {
  return sql<Question[]>`
    select id, axis, kind, scale, weight, text, options
    from questions
    order by id
  `;
}

export async function submittedNames(teamId: string): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`
    select name from members where team_id = ${teamId} order by submitted_at
  `;
  return rows.map((r) => r.name);
}
