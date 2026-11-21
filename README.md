# 앱줍줍

내 앱 올리고, 남의 앱 줍줍. 서로 받아보고 한 줄 피드백을 주고받는 앱 품앗이 웹.

- 웹: Next.js 15 (App Router) + TypeScript
- 서버: Supabase (`camtrip` 프로젝트 안 `aj_` 테이블, 로그인·DB·사진 저장소·서버 함수)
- 배포: Vercel

## 지금 되는 것

| 기능 | 상태 |
|---|---|
| 홈: 내 폰·내 나라 기준 앱 카드 스택, 피드백 적은 앱이 위로 | ✅ |
| 앱 상세: 카드 누르면 펼쳐짐, 위아래로 다음 앱 | ✅ |
| 받기 → 개발자에게 알림 + 내 대표 앱 전달, 서로 받으면 자동 품앗이 | ✅ DB 테스트 완료 |
| 한 줄 피드백: 품앗이 +3/+2/+1, 자유 피드백(받은 앱만, 점수 없음), 욕설 필터 | ✅ |
| 도움돼요(+1, 품앗이 피드백만), 신고 3번이면 숨김 | ✅ |
| 7일 지나면 봐주기 2번 → 그 뒤 −10 (30일 안 재발 −15), 매시간 자동 처리 | ✅ |
| 알림: 받았어요 / 서로 받았어요(D-day) / 피드백 / 지킴·못 지킴 | ✅ |
| 내 정보: 프로필 사진 업로드, 닉네임, 나라, 약속 점수, 내 앱 3개·대표 앱 | ✅ |
| 앱 올리기: 링크 판별, 중복 차단, 스토어에서 이름·아이콘·스크린샷 불러오기 | ✅ (DB 05번 적용 필요) |
| 나라·언어: 사용자 나라/언어, 앱 출시 나라·전 세계, 한국어/영어 문구 | ✅ |
| 카카오·구글 로그인 | ⚙️ 키 설정 필요 (아래) |
| 푸시 알림 | ⏳ 지금은 앱 안 알림만. 웹 푸시는 다음 단계 |
| "내 앱이에요" 소유 인증 (스토어 설명에 코드) | ⏳ 다음 단계 |

## 배포 순서

### 1. DB 마지막 변경 적용
`supabase/migrations/05_add_app_rpc.sql` 을 Supabase SQL Editor에서 실행하세요. (앱 올리기가 이 함수를 써요)

### 2. Vercel
1. vercel.com → Add New → Project → 이 저장소(Appjupjup) Import
2. Environment Variables에 `.env.example` 두 줄을 그대로 넣기
3. Deploy → 나온 주소(예: `appjupjup.vercel.app`)를 메모

### 3. Supabase 로그인 설정 (camtrip 프로젝트)
Authentication → URL Configuration
- Redirect URLs에 추가: `https://<내 Vercel 주소>/auth/callback`, `http://localhost:3000/auth/callback`
- Site URL은 camtrip이 쓰는 값이면 그대로 두세요 (두 서비스가 같은 로그인 서버를 써요)

Authentication → Sign In / Providers
- **Kakao**: 켜고 REST API 키 / Client Secret 입력
- **Google**: 켜고 Client ID / Secret 입력

### 4. 카카오 개발자 (developers.kakao.com)
- 앱 만들기 → 앱 이름 "앱줍줍", 아이콘 등록 (로그인 화면에 이 이름이 보여요)
- 카카오 로그인 켜기, Redirect URI: `https://ztxzqvnybiemgbhtrwiw.supabase.co/auth/v1/callback`
- 동의 항목: 닉네임, 프로필 사진 (이메일은 비즈 앱 필요. 없으면 Supabase Kakao 설정에서 "Allow users without an email" 켜기)
- 보안 → Client Secret 발급·활성화

### 5. 구글 (console.cloud.google.com)
- OAuth 동의 화면: 앱 이름 "앱줍줍", 로고, 지원 이메일 → 게시(인증 받으면 주소 대신 이름이 크게 나와요)
- 사용자 인증 정보 → OAuth 클라이언트 ID(웹) → 승인된 리디렉션 URI: `https://ztxzqvnybiemgbhtrwiw.supabase.co/auth/v1/callback`

## 로컬 실행
```
npm install
npm run dev
```

## DB 구조 (요약)
- `aj_profiles` 점수·봐주기·나라·언어 / `aj_apps` 앱(최대 3, 대표 1, store_key로 중복 차단, 출시 나라)
- `aj_downloads` 받기 기록 / `aj_matches` 품앗이(7일 기한, 각자 결과) / `aj_feedback` 품앗이·자유
- `aj_helpful`, `aj_reports`, `aj_notifications`
- 점수·결과는 클라이언트가 못 고치고 서버 함수(`aj_record_download`, `aj_leave_feedback` 등)로만 바뀌어요
- 서버 함수 `aj-store-meta`: 앱스토어 공식 조회 API, 구글 플레이는 페이지 읽기(구조 바뀌면 손봐야 해요). 비공개 테스트 링크는 직접 입력

## 확장 메모
- 언어 추가: `lib/i18n.ts`에 사전 하나 추가
- 나라 추가: `app/me/page.tsx`의 `COUNTRIES`. 앱은 출시 나라 배열 + 전 세계 플래그로 저장
- 앱으로 갈 때: Capacitor로 감싸서 푸시 붙이기
