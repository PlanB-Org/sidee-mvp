import type {
  AlignedAxis,
  AnswerValue,
  MemberAnswers,
  OptionBucket,
  Question,
  RawRow,
  ReportSections,
  RoleCoverage,
  RoleStatus,
  SplitAxis,
} from "./types";

/** 명목형에서 최다 선택지 비율이 이 값 미만이면 갈린 것으로 본다. */
const NOMINAL_AGREE_RATIO = 0.7;

/** 순서형에서 선택지 index 차이가 이 값 이상이면 갈린 것으로 본다. */
const ORDINAL_SPLIT_DISTANCE = 2;

/** 9·10번 역할 선택지 중 "비어 있음" 경고에서 제외할 항목. */
const ROLE_OPTIONAL = "데이터·AI";

/** 8번 lead_pref 에서 "방향 정하고 끌고 가는 게 편하다" 의 선택지 index. */
const LEAD_OPTION_INDEX = 0;

function toIndexList(value: AnswerValue | undefined): number[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function single(value: AnswerValue | undefined): number | undefined {
  if (typeof value === "number") return value;
  return undefined;
}

/** 선택지별로 누가 골랐는지 모은다. 아무도 안 고른 선택지도 자리를 지킨다. */
function bucketize(question: Question, members: MemberAnswers[]): OptionBucket[] {
  return question.options.map((label, optionIndex) => ({
    optionIndex,
    label,
    members: members
      .filter((m) => toIndexList(m.answers[question.id]).includes(optionIndex))
      .map((m) => m.name),
  }));
}

/** 인원이 많은 순으로 정렬한, 실제로 선택된 버킷만. */
function occupied(buckets: OptionBucket[]): OptionBucket[] {
  return buckets
    .filter((b) => b.members.length > 0)
    .sort((a, b) => b.members.length - a.members.length);
}

function isSplit(question: Question, members: MemberAnswers[]): boolean {
  const picks = members
    .map((m) => single(m.answers[question.id]))
    .filter((v): v is number => v !== undefined);

  if (picks.length < 2) return false;

  if (question.scale === "ordinal") {
    return Math.max(...picks) - Math.min(...picks) >= ORDINAL_SPLIT_DISTANCE;
  }

  const counts = new Map<number, number>();
  for (const p of picks) counts.set(p, (counts.get(p) ?? 0) + 1);
  const top = Math.max(...counts.values());
  return top / picks.length < NOMINAL_AGREE_RATIO;
}

function joinNames(names: string[]): string {
  return names.join("·");
}

/**
 * 받침 유무로 조사를 고른다. 이름과 선택지 라벨이 문장에 그대로 박히므로
 * "지윤는", "학습를" 같은 문장이 나오지 않게 한다.
 * 한글 음절이 아니면(영문·숫자) 받침 없는 쪽을 쓴다.
 */
function withParticle(word: string, jong: string, noJong: string): string {
  const last = word.trim().at(-1) ?? "";
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return word + noJong;
  return word + ((code - 0xac00) % 28 === 0 ? noJong : jong);
}

const eun = (w: string) => withParticle(w, "은", "는");
const eul = (w: string) => withParticle(w, "을", "를");

/** 기획서 5장의 축별 안내 문장. */
function messageFor(question: Question, buckets: OptionBucket[]): string {
  const groups = occupied(buckets);

  switch (question.axis) {
    case "goal": {
      const [a, b] = groups;
      if (!a || !b) return "목표가 갈려 있어요. 이 프로젝트의 완료 기준을 먼저 정하세요.";
      return `목표가 갈려 있어요. ${eun(joinNames(a.members))} ${a.label}, ${eun(joinNames(b.members))} ${eul(b.label)} 원해요. 이 프로젝트의 완료 기준을 먼저 정하세요.`;
    }
    case "weekly_hours": {
      const picked = buckets.filter((b) => b.members.length > 0);
      const min = picked[0];
      const max = picked[picked.length - 1];
      if (!min || !max) return "투입 시간이 갈려 있어요. 범위와 역할 크기를 맞추세요.";
      // 선택지 라벨 자체에 물결표가 들어있어(5~10h) 스펙의 "{min}~{max}" 는 읽히지 않는다.
      return `투입 시간이 ${min.label}에서 ${max.label}까지 벌어져 있어요. 범위와 역할 크기를 맞추세요.`;
    }
    case "response_expect":
      return "응답 기대 속도가 달라요. 답장 기준(예: 평일 24시간 내)을 정해두세요.";
    case "deadline_style":
      return "일정 스타일이 달라요. 중간 체크포인트를 정하면 서로 덜 불안해요.";
    case "comm_mode":
      return "소통 방식 선호가 달라요. 급할 때 통화 OK인지 미리 정해두세요.";
    case "feedback_style":
      return "피드백 방식이 달라요. 코드리뷰 톤을 한 번 얘기해두면 좋아요.";
    case "decision_speed":
      return "의사결정 속도가 달라요. 결정 시한(예: 논의 30분 후 결정)을 두면 해결돼요.";
    case "lead_pref":
      return leadMessage(buckets) ?? "리드 선호가 갈려 있어요. 영역을 나누세요.";
    default:
      return "이 항목이 갈려 있어요. 시작 전에 한 번 맞춰보세요.";
  }
}

/**
 * lead_pref 는 갈림 여부와 무관하게 리드 희망자 수로 판정한다.
 * 전원이 "내 몫 잘하는 게 편하다"를 골라 갈리지 않아도 리드 공백은 경고해야 한다.
 */
function leadMessage(buckets: OptionBucket[]): string | undefined {
  const leads = buckets[LEAD_OPTION_INDEX]?.members ?? [];

  if (leads.length === 0) {
    return "끌고 가려는 사람이 없어요. 돌아가며 주간 리드를 맡는 걸 고려하세요.";
  }
  if (leads.length >= 2) {
    return "리드 희망자가 여럿이에요. 영역을 나누세요.";
  }
  return undefined;
}

function toSplitAxis(question: Question, buckets: OptionBucket[]): SplitAxis {
  return {
    axis: question.axis,
    questionId: question.id,
    questionText: question.text,
    weight: question.weight === "high" ? "high" : "normal",
    buckets,
    message: messageFor(question, buckets),
  };
}

function buildCoverage(
  mainQ: Question,
  subQ: Question,
  members: MemberAnswers[],
): RoleCoverage[] {
  const mainBuckets = bucketize(mainQ, members);
  const subBuckets = bucketize(subQ, members);
  const teamSize = members.length;

  return mainQ.options.map((role, optionIndex) => {
    const main = mainBuckets[optionIndex]?.members ?? [];
    const sub = subBuckets[optionIndex]?.members ?? [];

    // 기획서대로 main 도 sub 도 없으면 비어 있음.
    // 겹침은 main 2명 이상이면서 팀 과반일 때 (2~5인 팀에 맞춰 상대 기준).
    let status: RoleStatus = "ok";
    if (main.length === 0 && sub.length === 0) status = "empty";
    else if (main.length >= 2 && main.length > teamSize / 2) status = "overlap";

    return {
      optionIndex,
      role,
      main,
      sub,
      status,
      warn: status !== "ok" && !(status === "empty" && role === ROLE_OPTIONAL),
    };
  });
}

function buildRaw(questions: Question[], members: MemberAnswers[]): RawRow[] {
  return questions.map((q) => ({
    questionId: q.id,
    questionText: q.text,
    answers: Object.fromEntries(
      members.map((m) => [
        m.name,
        toIndexList(m.answers[q.id]).map((i) => q.options[i] ?? "?"),
      ]),
    ),
  }));
}

/**
 * 기획서 5장 스코어링. 부수효과 없는 순수 함수.
 * questions 는 id 오름차순을 가정한다.
 */
export function score(
  questions: Question[],
  members: MemberAnswers[],
): ReportSections {
  const agreeFirst: SplitAxis[] = [];
  const knowFirst: SplitAxis[] = [];
  const aligned: AlignedAxis[] = [];

  for (const q of questions.filter((q) => q.kind === "same")) {
    const buckets = bucketize(q, members);
    const split = isSplit(q, members);

    // lead_pref 는 전원 일치여도 리드 공백/중복이면 경고로 올린다.
    const isLead = q.axis === "lead_pref";
    const leadWarning = isLead ? leadMessage(buckets) : undefined;
    // 끌고 갈 사람이 아예 없는 건 합의가 급하므로 weight 와 무관하게 2번 섹션으로.
    // 리드 희망자가 여럿인 건 알고만 있으면 되니 weight 대로 3번 섹션에 둔다.
    const leadGap =
      isLead && (buckets[LEAD_OPTION_INDEX]?.members.length ?? 0) === 0;

    if (split || leadWarning) {
      const card = toSplitAxis(q, buckets);
      if (leadWarning) card.message = leadWarning;
      (q.weight === "high" || leadGap ? agreeFirst : knowFirst).push(card);
      continue;
    }

    // 5번 섹션은 "공통 답"을 내세우므로 전원이 같은 선택지일 때만 올린다.
    // 순서형에서 인접 선택지(예: 5~10h / 10~20h)는 갈리지도, 일치하지도 않는다.
    // 이 경우 어느 섹션에도 넣지 않는다 - 6번 전체 응답표에는 그대로 남는다.
    const groups = occupied(buckets);
    if (groups.length === 1 && groups[0].members.length === members.length) {
      aligned.push({
        axis: q.axis,
        questionId: q.id,
        questionText: q.text,
        answerLabel: groups[0].label,
      });
    }
  }

  const mainQ = questions.find((q) => q.axis === "main_role");
  const subQ = questions.find((q) => q.axis === "sub_role");

  return {
    agree_first: agreeFirst,
    know_first: knowFirst,
    coverage: mainQ && subQ ? buildCoverage(mainQ, subQ, members) : [],
    aligned,
    raw: buildRaw(questions, members),
  };
}
