"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  FormField,
  FormLabel,
  Option,
  Select,
  TextField,
  Typography,
} from "@wanteddev/wds";
import { Container } from "@/components/page-shell";
import { api } from "@/lib/client";

const SIZES = ["2", "3", "4", "5"];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [size, setSize] = useState("3");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const { token } = await api<{ token: string }>("/teams", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), expected_size: Number(size) }),
      });
      router.push(`/t/${token}/created`);
    } catch {
      setError("링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  };

  return (
    <Container>
      <div className="flex flex-col gap-2">
        <Typography variant="title2" weight="bold">
          시작 전에 맞춰볼 것들
        </Typography>
        <Typography variant="body1-reading" color="semantic.label.alternative">
          10문항으로 팀이 먼저 합의해야 할 지점을 짚어드려요. 점수를 매기지
          않습니다.
        </Typography>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <FormField>
          <FormLabel>팀 이름</FormLabel>
          <TextField
            value={name}
            placeholder="예: 해커톤 A팀"
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>

        <FormField>
          <FormLabel>인원수</FormLabel>
          <Select value={size} onChange={setSize}>
            {SIZES.map((n) => (
              <Option key={n} value={n}>
                {n}명
              </Option>
            ))}
          </Select>
        </FormField>

        {error && (
          <Typography variant="body2" color="semantic.status.negative">
            {error}
          </Typography>
        )}

        <Button
          size="large"
          fullWidth
          loading={busy}
          disabled={name.trim().length === 0}
          onClick={submit}
        >
          링크 만들기
        </Button>
      </div>
    </Container>
  );
}
