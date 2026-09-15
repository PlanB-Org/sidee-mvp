-- 문항 시드 (기획서 4장). 문항 교체가 예정되어 있어 재실행 가능하게 upsert 한다.
-- 9, 10 번은 기획서 표에 weight 가 '—' 로 되어 있으나 스키마 제약상 'none' 으로 넣는다.

insert into questions (id, axis, kind, scale, weight, text, options) values
  (1, 'goal', 'same', 'nominal', 'high',
   '이 프로젝트에서 제일 얻고 싶은 건?',
   '["배포·실사용자","완성 경험·포트폴리오","새 기술 학습","사람들과 재미있게"]'),

  (2, 'weekly_hours', 'same', 'ordinal', 'high',
   '현실적으로 쓸 수 있는 시간은?',
   '["주 5h 미만","5~10h","10~20h","20h 이상"]'),

  (3, 'response_expect', 'same', 'ordinal', 'high',
   '답이 없을 때 "늦다"고 느끼는 기준은?',
   '["1시간","반나절","하루","이틀 이상"]'),

  (4, 'deadline_style', 'same', 'nominal', 'normal',
   '마감 3일 전, 절반 남았다면',
   '["이런 상황 안 오게 앞에서 쪼개놓는다","지금부터 몰아친다, 원래 이렇게 한다"]'),

  (5, 'comm_mode', 'same', 'nominal', 'normal',
   '막혔을 때',
   '["텍스트로 정리해서 보낸다","바로 통화·화면공유 하자고 한다"]'),

  (6, 'feedback_style', 'same', 'nominal', 'normal',
   '팀원 결과물이 별로일 때',
   '["문제를 바로 말한다","좋은 점 먼저, 돌려 말한다"]'),

  (7, 'decision_speed', 'same', 'nominal', 'normal',
   '기술 선택에 의견이 갈리면',
   '["일단 정해서 가고 문제 생기면 바꾼다","충분히 비교하고 정한다"]'),

  (8, 'lead_pref', 'same', 'nominal', 'normal',
   '팀에서 나는',
   '["방향 정하고 끌고 가는 게 편하다","내 몫 잘하는 게 편하다","상황 따라 둘 다"]'),

  (9, 'main_role', 'complement', 'nominal', 'none',
   '주력 역할 (1개)',
   '["프론트","백엔드","디자인·UX","기획·PM","데이터·AI"]'),

  (10, 'sub_role', 'complement', 'multi', 'none',
   '보조로 커버 가능한 역할 (복수)',
   '["프론트","백엔드","디자인·UX","기획·PM","데이터·AI"]')
on conflict (id) do update set
  axis    = excluded.axis,
  kind    = excluded.kind,
  scale   = excluded.scale,
  weight  = excluded.weight,
  text    = excluded.text,
  options = excluded.options;
