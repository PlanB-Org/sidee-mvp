import { randomBytes } from "node:crypto";
import sql from "@/lib/db";
import { fail, handle } from "@/lib/api";

/** 기획서 6장의 secrets.token_urlsafe(12) 와 같은 강도(96비트). */
function newToken() {
  return randomBytes(12).toString("base64url");
}

export async function POST(request: Request) {
  return handle(async () => {
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const expectedSize = body?.expected_size;

    if (!name) throw fail(422, "name_required");
    if (name.length > 40) throw fail(422, "name_too_long");
    if (!Number.isInteger(expectedSize) || expectedSize < 2 || expectedSize > 5) {
      throw fail(422, "expected_size_out_of_range");
    }

    const token = newToken();
    await sql`
      insert into teams (name, token, expected_size)
      values (${name}, ${token}, ${expectedSize})
    `;

    return Response.json({ token }, { status: 201 });
  });
}
