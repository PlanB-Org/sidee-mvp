// supabase/migrations/*.sql 을 파일명 순서대로 실행한다.
// 세션 모드(:5432) 커넥션을 쓴다. 트랜잭션 풀러(:6543)는 DDL 에 부적합.
//   pnpm migrate
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL (또는 DATABASE_URL) 이 없습니다. .env.local 을 확인하세요.");
  process.exit(1);
}

const dir = path.join(process.cwd(), "supabase", "migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

if (files.length === 0) {
  console.error(`마이그레이션 파일이 없습니다: ${dir}`);
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  for (const file of files) {
    const ddl = await readFile(path.join(dir, file), "utf8");
    await sql.begin((tx) => [tx.unsafe(ddl)]);
    console.log(`  applied  ${file}`);
  }

  const [{ count }] = await sql`select count(*)::int as count from questions`;
  console.log(`\n완료. questions ${count}건.`);
} catch (err) {
  console.error(`\n실패: ${err.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
