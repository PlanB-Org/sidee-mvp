import "server-only";
import postgres from "postgres";

declare global {
  var __sql: ReturnType<typeof postgres> | undefined;
}

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  // Supavisor 트랜잭션 모드(:6543)는 prepared statement 를 지원하지 않는다.
  return postgres(url, { prepare: false });
}

// dev 의 HMR 마다 커넥션이 새로 열리는 걸 막는다.
const sql = globalThis.__sql ?? connect();
if (process.env.NODE_ENV !== "production") globalThis.__sql = sql;

export default sql;
