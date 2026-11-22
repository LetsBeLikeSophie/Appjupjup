# 앱줍줍 (AppJupJup) — 작업 인수인계

Claude Code가 이 저장소를 이어서 작업할 때 읽는 문서예요. 사용자(소피)와는 **한국어**로, 짧고 친근하게 대화해요.

## 서비스 한 줄
개발자끼리 서로의 앱을 **받아보고 한 줄 피드백**을 주고받는 앱 품앗이 웹. 모바일 웹 우선, 나중에 Capacitor로 앱.

- 운영 주소: https://appjupjup.itssophie.dev (Vercel, main 푸시하면 자동 배포)
- Vercel 프로젝트: `solipsophie-1931/appjupjup`
- DNS: Cloudflare `itssophie.dev` → CNAME `appjupjup` (프록시 끔)

## 스택
- Next.js 15 App Router + TypeScript, 클라이언트 컴포넌트 위주, CSS는 `app/globals.css` 한 파일
- Supabase 프로젝트 **camtrip** (`ztxzqvnybiemgbhtrwiw`) 안에 `aj_` 접두사 테이블로 같이 살아요. 같은 프로젝트에 Ripe Weekly(`ripe` 스키마), `wow` 스키마도 있으니 **다른 앱 테이블·설정은 건드리지 말 것**
- 로그인: 카카오·구글 (camtrip·Ripe Weekly와 키 공유, 동의 화면 이름 "Sophie's Apps"). Site URL은 공유 설정이라 바꾸기 전 사용자 확인 필요
- 서버 함수: `aj-store-meta` (supabase/functions) — 스토어 링크 → 이름·아이콘·스크린샷, 앱스토어는 23개국 출시 여부 자동 조회, 구글 플레이는 나라를 알 수 없어 전 세계로

## 제품 규칙 (사용자와 합의된 것)
- 역할 선택 없음: **내 앱이 있으면 품앗이, 없으면 줍줍**
- 받기 = 품앗이: A가 B 앱 받기 → B에게 알림 + A의 대표 앱. B도 A 앱 받으면 자동 성사 → 7일 안에 서로 한 줄 피드백
- 앱은 1인 3개, 대표 1개. 중복 링크 차단(store_key)
- 약속 점수: 시작 100, 상한 없음. 지킴 +3(100~129)/+2(130~159)/+1(160~), 놓침 −10(30일 내 재발 −15), 처음 놓친 2번은 봐주기, 품앗이 피드백에 도움돼요 +1. 표시는 악수 아이콘 + 숫자(단위·% 없음)
- 자유(제3자) 피드백: 받기 누른 앱에만, 앱당 1개, 점수 없음, '자유' 표시, 신고 3회 숨김
- 욕설 필터: `aj_private.badwords` + 공백·숫자·특수문자 제거 후 비교
- 프로필: 카카오·구글은 인증만. 이름·사진은 앱줍줍에서 따로 (첫 로그인 시 설정 시트), 이름 뒤 `#4자리` 태그로 중복 구분
- 비회원도 둘러보기·스토어 이동 가능, 품앗이 기능만 로그인
- 나라/언어: 사용자 country/locale, 앱 countries[]/all_countries. 문구는 `lib/i18n.ts` (ko/en)

## 디자인 규칙 (피드백 누적)
- **숫자는 `app/globals.css` 맨 위 토큰만** (`--gutter` 20, `--gap` 16, `--pad` 16, `--r-card` 20, 글자 `.t-title/.t-name/.t-section/.t-card/.t-body/.t-sub`). 새 v2·v3 덧칠 금지, 해당 규칙을 고칠 것
- 공통 부품: `components/ui.tsx`(아이콘·Chip·PromiseChip·IconButton·NameTag·Shots), `components/layout.tsx`(Page·Section·ListRow·Empty·GuestGate·Sheet·SheetHeader·TabBar), `components/app-parts.tsx`(PlatformChip·CountryChip·AppChips·CountryEditor). 새 화면은 이걸 조립해서 만들기
- 배경 #EDEDE9, 검정 알약 버튼, 파스텔 카드는 **앱 아이콘에서 뽑은 색**(`lib/useIconColor.ts`)
- **테두리는 입력 중인 칸(focus)에만.** 태그·카드·대표 표시에 테두리 금지
- 글자 크기 단계: 화면 제목 24 / 이름 20 / 섹션 17 / 카드 제목 15 / 본문 14 / 보조 12. 큰 제목 남발 금지
- 여백: 좌우 20, 요소 간 16, 카드 안 패딩 16 — 화면끼리 같은 규칙
- 칩(`.mini-chip`, `PromiseChip`)은 높이 26, 모든 화면 같은 크기
- 모달은 아래에서 올라오는 시트, 맨 위에서 아래로 쓸면 닫힘. 시트 높이가 내용 따라 튀지 않게(스켈레톤 자리 유지)
- 입력칸 16px(아이폰 확대 방지), 화면 확대 금지
- 하단 메뉴 3개: 홈 · 알림 · 내 정보 (아이콘만, 떠 있는 검정 알약)
- 앱 상세: 위아래 스크롤, 맨 아래 "다음 앱" → 더 내리면 다음 앱 (처음 한 번 안내 토스트)
- 알림: 제목 없이 한 행씩, 행 전체가 링크, 할 일 있는 행만 검정

## 지금 진행 중 / 다음 할 일
- [ ] 방금 반영: 내 정보 정리(설정 행, 글자 단계), 내 앱 누르면 수정 시트(`components/myapp-sheet.tsx`), 상세 상단 ← 아이콘·다음 앱 간격. **폰에서 확인 필요**
- [x] 전체 컴포넌트화·여백 정리 (11-22). 폰에서 다시 확인 필요
- [ ] 앱 수정 시 한 줄 소개 욕설 검사 (지금은 등록 RPC에서만 검사)
- [ ] 웹 푸시 알림 (iOS는 홈 화면 추가 필요), 이후 Capacitor
- [ ] "내 앱이에요" 소유 인증: 스토어 설명에 코드 넣는 방식
- [ ] Supabase Site URL이 localhost라 로그인 중복 콜백 시 localhost로 튐 → 사용자가 직접 바꾸기로 함

## 작업 방법
- `npm run build` 통과 확인 후 main에 커밋·푸시하면 배포돼요
- DB 변경은 `supabase/migrations/`에 기록 (01~08 적용됨; 01~04는 이 대화에서 직접 적용해서 파일이 없음 — `list_migrations`로 확인)
- 테스트 데이터는 DO 블록 + 마지막에 raise로 롤백하는 방식으로 만들었어요
