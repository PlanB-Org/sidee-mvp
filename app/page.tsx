import { Button, SectionMessage, TopNavigation, Typography } from "@wanteddev/wds";

export default function Home() {
  return (
    <>
      <TopNavigation>팀 케미 진단</TopNavigation>
      <main className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-5 py-10">
        <div className="flex flex-col gap-2">
          <Typography variant="title2" weight="bold">
            팀 시작 전에 맞춰볼 것들
          </Typography>
          <Typography variant="body1-reading" color="semantic.label.alternative">
            10문항으로 팀이 먼저 합의해야 할 지점을 짚어드려요.
          </Typography>
        </div>
        <SectionMessage variant="info">
          팀 만들기 폼은 API 연결 후 붙입니다.
        </SectionMessage>
        <Button size="large" fullWidth disabled>
          링크 만들기
        </Button>
      </main>
    </>
  );
}
