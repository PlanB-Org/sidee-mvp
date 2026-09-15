# sidee-mvp — 팀 케미 진단

프로젝트 시작 전(해커톤·사이드 프로젝트·팀원 합류) 팀원들의 작업 성향을 10문항으로 수집해,
**"미리 합의해야 할 지점"** 을 짚어주는 진단 리포트.

점수로 팀을 평가하지 않는다. 리포트의 성공 기준은 "이걸 보고 팀에서 대화가 시작되는가".

- 대상: 2~5명 팀
- 로그인 없음. 팀 토큰 링크(`/t/{token}`)로만 접근

## 스택

- Next.js 16 (App Router) — 프론트 + API Route Handlers 단일 앱
- React 19 / TypeScript
- Tailwind CSS v4 (레이아웃·간격)
- 원티드 디자인 시스템 Montage `@wanteddev/wds` (컴포넌트) — 설치 예정

## 개발

```bash
npm install
npm run dev
```

http://localhost:3000

```bash
npm run build   # 프로덕션 빌드
npm run lint    # ESLint
```

## 문서

기획서는 `docs/team-chemistry-v1-spec.md` (git 미추적, 로컬 보관).
