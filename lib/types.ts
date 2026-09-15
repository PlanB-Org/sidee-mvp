export type QuestionKind = "same" | "complement";
export type QuestionScale = "ordinal" | "nominal" | "multi";
export type QuestionWeight = "high" | "normal" | "none";

export type Question = {
  id: number;
  axis: string;
  kind: QuestionKind;
  scale: QuestionScale;
  weight: QuestionWeight;
  text: string;
  options: string[];
};

/** 단일 선택은 선택지 index, 복수 선택(10번)은 index 배열. */
export type AnswerValue = number | number[];

export type MemberAnswers = {
  name: string;
  answers: Record<number, AnswerValue>;
};

export type Team = {
  name: string;
  expectedSize: number;
};

/** 분포 바 한 칸: 선택지 하나와 그걸 고른 사람들. */
export type OptionBucket = {
  optionIndex: number;
  label: string;
  members: string[];
};

/** 리포트 2·3번 섹션 카드. */
export type SplitAxis = {
  axis: string;
  questionId: number;
  questionText: string;
  weight: Exclude<QuestionWeight, "none">;
  buckets: OptionBucket[];
  message: string;
};

export type RoleStatus = "ok" | "empty" | "overlap";

/** 리포트 4번 섹션의 행 하나. */
export type RoleCoverage = {
  optionIndex: number;
  role: string;
  main: string[];
  sub: string[];
  status: RoleStatus;
  /** 데이터·AI 는 프로젝트에 따라 불필요할 수 있어 경고에서 제외하고 표시만 한다. */
  warn: boolean;
};

/** 리포트 5번 섹션: 전원 일치한 축. */
export type AlignedAxis = {
  axis: string;
  questionId: number;
  questionText: string;
  answerLabel: string;
};

/** 리포트 6번 섹션: 전체 응답표의 행 하나. */
export type RawRow = {
  questionId: number;
  questionText: string;
  /** 팀원 이름 -> 선택지 라벨(복수 선택은 여러 개, 미선택은 빈 배열). */
  answers: Record<string, string[]>;
};

export type ReportSections = {
  agree_first: SplitAxis[];
  know_first: SplitAxis[];
  coverage: RoleCoverage[];
  aligned: AlignedAxis[];
  raw: RawRow[];
};

export type Report = {
  team: Team;
  members: string[];
  sections: ReportSections;
};
