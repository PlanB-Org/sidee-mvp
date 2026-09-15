import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { score } from "./scoring.ts";
import type { MemberAnswers, Question } from "./types.ts";

const Q: Question[] = [
  { id: 1, axis: "goal", kind: "same", scale: "nominal", weight: "high", text: "목표", options: ["배포", "포트폴리오", "학습", "재미"] },
  { id: 2, axis: "weekly_hours", kind: "same", scale: "ordinal", weight: "high", text: "시간", options: ["5h 미만", "5~10h", "10~20h", "20h 이상"] },
  { id: 3, axis: "response_expect", kind: "same", scale: "ordinal", weight: "high", text: "응답", options: ["1시간", "반나절", "하루", "이틀 이상"] },
  { id: 8, axis: "lead_pref", kind: "same", scale: "nominal", weight: "normal", text: "리드", options: ["끌고 간다", "내 몫만", "상황 따라"] },
  { id: 9, axis: "main_role", kind: "complement", scale: "nominal", weight: "none", text: "주력", options: ["프론트", "백엔드", "디자인·UX", "기획·PM", "데이터·AI"] },
  { id: 10, axis: "sub_role", kind: "complement", scale: "multi", weight: "none", text: "보조", options: ["프론트", "백엔드", "디자인·UX", "기획·PM", "데이터·AI"] },
];

function team(...rows: [string, Record<number, number | number[]>][]): MemberAnswers[] {
  return rows.map(([name, answers]) => ({ name, answers }));
}

const axes = (list: { axis: string }[]) => list.map((s) => s.axis);

describe("명목형 갈림 판정 (최다 비율 0.7)", () => {
  it("2인이 다르면 갈림", () => {
    const s = score(Q, team(["A", { 1: 0 }], ["B", { 1: 1 }]));
    assert.ok(axes(s.agree_first).includes("goal"));
  });

  it("2인이 같으면 일치", () => {
    const s = score(Q, team(["A", { 1: 0 }], ["B", { 1: 0 }]));
    assert.ok(axes(s.aligned).includes("goal"));
  });

  it("3인 2:1 은 갈림 (0.67 < 0.7)", () => {
    const s = score(Q, team(["A", { 1: 0 }], ["B", { 1: 0 }], ["C", { 1: 1 }]));
    assert.ok(axes(s.agree_first).includes("goal"));
  });

  it("4인 3:1 은 갈림 아님. 전원 일치도 아니라 어느 섹션에도 안 올라간다", () => {
    const s = score(Q, team(["A", { 1: 0 }], ["B", { 1: 0 }], ["C", { 1: 0 }], ["D", { 1: 1 }]));
    assert.ok(axes(s.agree_first).includes("goal") === false, "갈림이 아니다");
    assert.ok(axes(s.aligned).includes("goal") === false, "전원 일치가 아니다");
  });

  it("5인 3:2 는 갈림 (0.6 < 0.7)", () => {
    const s = score(Q, team(["A", { 1: 0 }], ["B", { 1: 0 }], ["C", { 1: 0 }], ["D", { 1: 1 }], ["E", { 1: 1 }]));
    assert.ok(axes(s.agree_first).includes("goal"));
  });
});

describe("순서형 갈림 판정 (index 차 2 이상)", () => {
  it("인접 선택지는 갈림이 아니고, 공통 답이 없으니 일치도 아니다", () => {
    const s = score(Q, team(["A", { 2: 1 }], ["B", { 2: 2 }]));
    assert.ok(axes(s.agree_first).includes("weekly_hours") === false);
    assert.ok(axes(s.aligned).includes("weekly_hours") === false);
    // 응답표에는 각자 답이 그대로 남는다
    const row = s.raw.find((r) => r.questionId === 2)!;
    assert.deepEqual(row.answers["A"], ["5~10h"]);
    assert.deepEqual(row.answers["B"], ["10~20h"]);
  });

  it("2칸 벌어지면 갈림", () => {
    const s = score(Q, team(["A", { 2: 0 }], ["B", { 2: 2 }]));
    assert.ok(axes(s.agree_first).includes("weekly_hours"));
  });

  it("안내 문장에 최소~최대 라벨이 들어간다", () => {
    const s = score(Q, team(["A", { 2: 0 }], ["B", { 2: 3 }]));
    const card = s.agree_first.find((c) => c.axis === "weekly_hours");
    assert.match(card!.message, /5h 미만에서 20h 이상까지/);
  });
});

describe("lead_pref 는 갈림과 별도로 리드 희망자 수를 본다", () => {
  it("전원 '내 몫만' 이면 일치여도 2번 섹션에 경고", () => {
    const s = score(Q, team(["A", { 8: 1 }], ["B", { 8: 1 }], ["C", { 8: 1 }]));
    const card = s.agree_first.find((c) => c.axis === "lead_pref");
    assert.ok(card, "리드 공백이 agree_first 에 올라와야 한다");
    assert.match(card!.message, /끌고 가려는 사람이 없어요/);
    assert.ok(axes(s.aligned).includes("lead_pref") === false);
  });

  it("리드 희망자가 여럿이면 3번 섹션", () => {
    const s = score(Q, team(["A", { 8: 0 }], ["B", { 8: 0 }]));
    const card = s.know_first.find((c) => c.axis === "lead_pref");
    assert.ok(card, "리드 중복은 know_first 에 있어야 한다");
    assert.match(card!.message, /리드 희망자가 여럿/);
  });

  it("리드 1명이고 갈리지 않으면 경고 없음 (4인 1:3 -> 0.75)", () => {
    const s = score(Q, team(["A", { 8: 0 }], ["B", { 8: 1 }], ["C", { 8: 1 }], ["D", { 8: 1 }]));
    assert.ok(s.agree_first.every((c) => c.axis !== "lead_pref"));
    assert.ok(s.know_first.every((c) => c.axis !== "lead_pref"));
  });
});

describe("역할 커버리지", () => {
  it("main 도 sub 도 없으면 비어 있음", () => {
    const s = score(Q, team(["A", { 9: 0, 10: [] }], ["B", { 9: 1, 10: [] }]));
    const design = s.coverage.find((c) => c.role === "디자인·UX");
    assert.equal(design!.status, "empty");
    assert.equal(design!.warn, true);
  });

  it("데이터·AI 는 비어 있어도 경고에서 제외", () => {
    const s = score(Q, team(["A", { 9: 0, 10: [] }], ["B", { 9: 1, 10: [] }]));
    const ai = s.coverage.find((c) => c.role === "데이터·AI");
    assert.equal(ai!.status, "empty");
    assert.equal(ai!.warn, false);
  });

  it("sub 로만 커버돼도 비어 있음이 아니다", () => {
    const s = score(Q, team(["A", { 9: 0, 10: [2] }], ["B", { 9: 1, 10: [] }]));
    assert.equal(s.coverage.find((c) => c.role === "디자인·UX")!.status, "ok");
  });

  it("겹침은 과반 기준: 2인 팀 2/2", () => {
    const s = score(Q, team(["A", { 9: 0, 10: [] }], ["B", { 9: 0, 10: [] }]));
    assert.equal(s.coverage.find((c) => c.role === "프론트")!.status, "overlap");
  });

  it("겹침은 과반 기준: 4인 팀 2/4 는 통과", () => {
    const s = score(Q, team(["A", { 9: 0 }], ["B", { 9: 0 }], ["C", { 9: 1 }], ["D", { 9: 1 }]));
    assert.equal(s.coverage.find((c) => c.role === "프론트")!.status, "ok");
  });

  it("겹침은 과반 기준: 5인 팀 3/5", () => {
    const s = score(Q, team(["A", { 9: 0 }], ["B", { 9: 0 }], ["C", { 9: 0 }], ["D", { 9: 1 }], ["E", { 9: 2 }]));
    assert.equal(s.coverage.find((c) => c.role === "프론트")!.status, "overlap");
  });
});

describe("전체 응답표", () => {
  it("보조 역할 미선택은 빈 배열로 남는다", () => {
    const s = score(Q, team(["A", { 10: [] }], ["B", { 10: [0, 1] }]));
    const row = s.raw.find((r) => r.questionId === 10)!;
    assert.deepEqual(row.answers["A"], []);
    assert.deepEqual(row.answers["B"], ["프론트", "백엔드"]);
  });
});

describe("안내 문장의 한국어 조사", () => {
  const goalTeam = (a: string, b: string, ai: number, bi: number) =>
    score(Q, team([a, { 1: ai }], [b, { 1: bi }]));

  it("받침 있는 이름은 '은'", () => {
    const card = goalTeam("지윤", "민호", 0, 1).agree_first.find((c) => c.axis === "goal")!;
    assert.match(card.message, /지윤은/);
    assert.ok(!card.message.includes("지윤는"));
  });

  it("받침 없는 이름은 '는'", () => {
    const card = goalTeam("민호", "지윤", 0, 1).agree_first.find((c) => c.axis === "goal")!;
    assert.match(card.message, /민호는/);
  });

  it("받침 있는 선택지는 '을'", () => {
    // index 2 = "학습" (받침 ㅂ)
    const card = goalTeam("A", "B", 0, 2).agree_first.find((c) => c.axis === "goal")!;
    assert.match(card.message, /학습을 원해요/);
  });

  it("받침 없는 선택지는 '를'", () => {
    const card = goalTeam("A", "B", 0, 3).agree_first.find((c) => c.axis === "goal")!;
    assert.match(card.message, /재미를 원해요/);
  });

  it("시간 범위는 물결표가 겹치지 않게 '에서~까지'", () => {
    const s = score(Q, team(["A", { 2: 1 }], ["B", { 2: 3 }]));
    const card = s.agree_first.find((c) => c.axis === "weekly_hours")!;
    assert.match(card.message, /5~10h에서 20h 이상까지/);
  });
});
