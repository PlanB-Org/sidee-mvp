<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 팀 케미 진단

프로젝트 시작 전 팀원 성향을 10문항으로 모아 "먼저 합의할 지점"을 짚어주는 진단.
Next.js 단일 앱(프론트 + Route Handlers) + Supabase(Postgres).
로그인 없음. 팀 토큰 링크(`/t/{token}`)로만 접근.

기획서는 `docs/team-chemistry-v1-spec.md`.
**`docs/` 는 .gitignore 대상이라 리포에 없다.** 파일이 안 보이면 팀에 요청할 것.

## 명령어

```bash
pnpm install
pnpm dev          # 개발 서버
pnpm build        # 프로덕션 빌드 (타입체크 포함)
pnpm lint
pnpm test         # node 내장 러너. lib/**/*.test.ts
pnpm migrate      # supabase/migrations/*.sql 을 순서대로 실행
```

패키지 매니저는 pnpm 고정(`packageManager: pnpm@12.4.1`). npm/yarn 쓰지 말 것.
pnpm 12 는 설정을 `package.json` 이 아니라 `pnpm-workspace.yaml` 에서 읽는다.
빌드 스크립트 승인도 거기(`allowBuilds`)에 있다.

## 설치 - GitHub Packages 인증

`@wanteddev/*`(원티드 디자인 시스템 Montage)는 GitHub Packages 에서 받는다.
공개 패키지라도 인증이 필요하다. classic PAT + `read:packages` 스코프.

```bash
npm config set //npm.pkg.github.com/:_authToken "<PAT>" --location=user
```

**토큰을 프로젝트 `.npmrc` 에 넣지 말 것.** 그 파일은 커밋된다.
레지스트리 매핑만 커밋되어 있고 토큰은 `~/.npmrc` 에 둔다. pnpm 도 같은 파일을 읽는다.

`@wanteddev/wds`, `wds-icon`, `wds-nextjs` 는 **항상 같은 버전**으로 맞춘다.
어긋나면 테마 컨텍스트가 중복 생성된다.

## 빌드는 통과하는데 조용히 깨지는 것들

이 프로젝트에서 실제로 겪은 것들이다. 타입체크·빌드·린트가 전부 초록인데
화면이나 데이터만 틀어진다. **UI 를 건드렸으면 브라우저로 실제 렌더를 확인할 것.
빌드 통과는 확인이 아니다.**

- **WDS global.css 를 JS 에서 import 하면 안 된다.** 레이어 밖(unlayered)에 놓이고,
  레이어 밖 CSS 는 레이어 안 CSS 를 무조건 이긴다. WDS 리셋의 `div { margin:0; padding:0 }`
  이 Tailwind 의 `mx-auto` / `px-*` / `py-*` / `mt-*` 를 전부 죽인다.
  `app/globals.css` 가 `layer(wds-reset)` 로 import 한다. 거기서만 부른다.
- **`Radio` / `Checkbox` 는 라벨을 그리지 않는다.** `<button role="radio">` 만 렌더한다.
  `ListCell` 의 `leadingContent` 로 넘겨야 라벨이 붙고 행 전체가 클릭된다.
  그냥 쓰면 동그라미만 나오고 선택지 텍스트가 사라진다.
- **`ListCell` 의 `children` 이 `textProps.children` 을 덮는다.**
  내부가 `<ListText {...textProps} children>` 순서다. 본문은 `children` 으로 넘길 것.
- **controlled 컴포넌트에 `undefined` 를 넘기지 말 것.** WDS 는 Radix
  `useControllableState` 를 쓰는데 `undefined` 를 uncontrolled 로 본다.
  미선택 상태는 `""` 로 표현한다.
- **jsonb 컬럼에 `JSON.stringify()` 로 미리 직렬화하지 말 것.** 숫자 `0` 이
  문자열 `"0"` 으로 들어간다. `sql.json(value)` 를 쓴다.
  제출은 201 이 떨어지고 리포트만 비어서 알아채기 어렵다.

## 레이아웃

골격은 `components/layout.tsx` 의 `AppHeader` / `Page` / `StickyBar` /
`EmptyState` / `Readable` / `ScrollX` 다. 화면은 이것만 조합한다.

- 원칙: **바(bar)는 full-bleed, 내용만 clamp.** 바 자체에 max-width 를 걸면
  데스크톱에서 배경이 중간에 끊긴다.
- 폭·여백·z-index 는 `app/globals.css` 의 `@theme` 토큰에서만 관리한다.
  `--container-form`(640) / `--container-wide`(880) / `--spacing-gutter`(20px).
- **Tailwind 브레이크포인트를 WDS `theme.breakpoint` 값으로 덮어놨다**
  (sm 768 / md 992 / lg 1200 / xl 1600). Tailwind 기본값과 다르다.
  `2xl` 은 WDS 에 대응이 없어 제거했다.
- 레이아웃·간격은 Tailwind, 컴포넌트 스타일은 WDS `sx`.
  Emotion 이 런타임에 심는 WDS 스타일은 레이어 밖이라 Tailwind 가 못 이긴다.
  컴포넌트 내부를 조정할 땐 `className` 이 아니라 `sx` 를 쓴다.
- 색은 WDS 테마 CSS 변수를 참조한다(`var(--semantic-label-normal)` 등).
  하드코딩 색을 남기지 말 것. 다크 모드가 따라오지 않는다.
- `FallbackView` 는 기본 `padding="normal"` 로 위아래 160px 씩 넣는다.
  세로 중앙 정렬이 필요하면 `EmptyState` 를 쓸 것. 직접 쓰면 중앙이 안 맞는다.

## DB

`postgres.js` 로 직접 붙는다. supabase-js 는 쓰지 않는다 —
PostgREST 라 멀티 스테이트먼트 트랜잭션이 안 되는데, 제출 경로가
members 1건 + answers 10건을 원자적으로 넣어야 한다.

- **포트를 구분한다.** 앱은 `DATABASE_URL`(Transaction pooler, **6543**),
  마이그레이션은 `DIRECT_URL`(Session pooler, **5432**).
  6543 은 prepared statement 를 지원하지 않아 `prepare: false` 로 붙는다(`lib/db.ts`).
  DDL 을 6543 으로 돌리지 말 것.
- 제출은 팀 행을 `for update` 로 잠근 트랜잭션 안에서 처리한다.
  동시 제출이 정원을 넘기지 못하게 하는 장치다.
- **4개 테이블 모두 RLS 활성, 정책 0개.** Supabase 의 Data API 는 꺼져 있지만,
  누가 켜더라도 기본 차단이 유지된다. 앱은 owner 롤 직접 커넥션이라 RLS 를 우회한다.
  새 테이블을 만들면 RLS 를 켤 것.

## 스코어링

`lib/scoring.ts` 는 부수효과 없는 순수 함수다. DB 나 fetch 를 넣지 말 것.
판정 기준의 경계값은 `lib/scoring.test.ts` 가 팀 크기별로 고정하고 있다.
규칙을 바꾸면 테스트부터 고칠 것.

기획서와 구현이 다른 지점이 몇 군데 있다(5번 섹션을 전원 일치로 한정,
역할 겹침을 팀 과반 기준으로, lead_pref 를 갈림과 별개로 판정 등).
이유는 해당 커밋 메시지와 코드 주석에 적어뒀다. 되돌리기 전에 먼저 읽을 것.

## 배포 (Vercel)

환경변수:

- `DATABASE_URL` — 필수. 6543.
- `DIRECT_URL` — 마이그레이션용. 앱 런타임은 읽지 않는다.
- `NPM_RC` — **필수.** 빌드 머신이 `@wanteddev/*` 를 받으려면 있어야 한다.
  `.npmrc` 내용을 통째로 넣는다. 기본 npm 레지스트리 줄을 빼면 안 된다.

  ```
  registry=https://registry.npmjs.org/
  @wanteddev:registry=https://npm.pkg.github.com/
  //npm.pkg.github.com/:_authToken=<PAT>
  ```

PAT 가 만료되면 빌드가 401 로 깨진다. 원인을 찾기 어려우니 만료일을 기억해둘 것.
`NEXT_PUBLIC_*` 은 없다. API 가 같은 앱에 있어 상대 경로 `/api` 로 부른다.
