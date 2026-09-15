import { findTeam, handle, loadQuestions, submittedNames } from "@/lib/api";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/t/[token]">,
) {
  return handle(async () => {
    const { token } = await ctx.params;
    const team = await findTeam(token);
    const [submitted, questions] = await Promise.all([
      submittedNames(team.id),
      loadQuestions(),
    ]);

    return Response.json({
      team: { name: team.name, expected_size: team.expected_size },
      submitted,
      questions,
    });
  });
}
