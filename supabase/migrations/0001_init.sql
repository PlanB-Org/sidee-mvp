-- 팀 케미 진단 v1 스키마 (기획서 6장)

create table if not exists teams (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  token         text unique not null,
  expected_size int  not null check (expected_size between 2 and 5),
  created_at    timestamptz not null default now()
);

create table if not exists questions (
  id      int primary key,
  axis    text  not null,
  kind    text  not null check (kind in ('same','complement')),
  scale   text  not null check (scale in ('ordinal','nominal','multi')),
  weight  text  not null check (weight in ('high','normal','none')),
  text    text  not null,
  options jsonb not null
);

create table if not exists members (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references teams on delete cascade,
  name         text not null,
  submitted_at timestamptz not null default now(),
  unique (team_id, name)
);

create table if not exists answers (
  member_id   uuid  not null references members on delete cascade,
  question_id int   not null references questions,
  value       jsonb not null,   -- int(index) 또는 int[] (multi)
  primary key (member_id, question_id)
);

-- 제출 현황 집계가 매 요청마다 돈다.
create index if not exists members_team_id_idx on members (team_id);

/*
 * Supabase 는 public 스키마를 PostgREST 로 자동 노출한다.
 * RLS 를 켜고 정책을 하나도 두지 않으면 anon/service 키로는 전부 차단되고,
 * 앱이 쓰는 owner 롤(직접 커넥션)은 RLS 를 우회하므로 그대로 동작한다.
 * 로그인이 없는 서비스라 브라우저가 DB 에 직접 붙을 일이 없다.
 */
alter table teams     enable row level security;
alter table questions enable row level security;
alter table members   enable row level security;
alter table answers   enable row level security;
