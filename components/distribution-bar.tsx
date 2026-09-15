"use client";

import { Chip, Typography } from "@wanteddev/wds";
import type { OptionBucket } from "@/lib/types";

/**
 * 선택지별 인원을 가로 막대로, 막대 옆에 이름을 나열한다 (기획서 3.5).
 * 차트 라이브러리 없이 div + Tailwind 로 직접 그린다.
 */
export function DistributionBar({
  buckets,
  total,
  tone,
}: {
  buckets: OptionBucket[];
  total: number;
  tone: "warning" | "neutral";
}) {
  const fill =
    tone === "warning"
      ? "bg-[var(--semantic-status-cautionary)]"
      : "bg-[var(--semantic-label-neutral)]";

  return (
    <div className="flex flex-col gap-3">
      {buckets.map((b) => {
        const ratio = total > 0 ? b.members.length / total : 0;
        return (
          <div key={b.optionIndex} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Typography variant="label2">{b.label}</Typography>
              <Typography variant="caption1" color="semantic.label.assistive">
                {b.members.length}명
              </Typography>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--semantic-fill-normal)]">
              <div
                className={`h-full rounded-full ${fill}`}
                style={{ width: `${Math.max(ratio * 100, b.members.length ? 4 : 0)}%` }}
              />
            </div>

            {b.members.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {b.members.map((m) => (
                  <Chip key={m} size="xsmall" variant="outlined" disableInteraction>
                    {m}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
