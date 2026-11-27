-- ⚠ 아직 적용 안 함 (11-27 개발 리뷰 DV-10, 소피 결정 대기)
-- 적용할 때 같이 바꿀 것: lib/ctx.tsx 첫 로그인 insert 에서 nickname·avatar_url 빼기
--   (지금 nickname 이 NOT NULL·기본값 없음이라, 이 파일보다 먼저 빼면 가입이 깨져요)
--
-- 1) 이름·사진은 API로 못 바꾸게: 앱 없는 사람 이름은 서버가 정함(줍줍이/Picker + #태그)
--    지금은 authenticated 가 aj_profiles.nickname·avatar_url 을 insert/update 할 수 있고 욕설 필터도 없음
--    → 사칭 이름이 댓글·알림에 뜰 수 있음
-- 2) 앱 아이콘·스크린샷 주소는 스토어 이미지 서버만 (지금은 https 면 아무 주소)
--
-- 확인만 한 것 (안 고침): aj_test_joins.app_id 는 ON DELETE CASCADE 라
--   앱을 지우고 같은 링크로 다시 올리면 참여 기록이 같이 지워져 store_key 재참여 막기가 안 먹어요.
--   고치려면 app_id 를 ON DELETE SET NULL(+ nullable) 로 바꾸거나 지운 앱의 store_key·tester 를 따로 남겨야 함 → 소피 결정

-- ---------- 1) 이름·사진 ----------
alter table public.aj_profiles alter column nickname set default '줍줍이';

create or replace function aj_private.profile_guest_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- 클라이언트가 뭘 보내든 서버 이름으로
  new.nickname := case when coalesce(new.locale, 'ko') = 'ko' then '줍줍이' else 'Picker' end;
  new.avatar_url := null;
  return new;
end $$;
drop trigger if exists aj_profiles_guest_name on public.aj_profiles;
-- profile_tag(태그 정하기)보다 먼저 돌게 이름 순서 a < t
create trigger aj_profiles_aa_guest_name before insert on public.aj_profiles
  for each row execute function aj_private.profile_guest_name();

revoke insert (nickname, avatar_url) on public.aj_profiles from authenticated, anon;
revoke update (nickname, avatar_url) on public.aj_profiles from authenticated, anon;

-- ---------- 2) 아이콘·스크린샷 주소 ----------
create or replace function aj_private.is_store_img(u text) returns boolean
language sql immutable set search_path = '' as $$
  select u is null or u ~ '^https://(play-lh\.googleusercontent\.com|[a-z0-9-]+\.mzstatic\.com)/'
$$;

-- 기존 행이 어기면 실패하니 먼저 확인:
--   select id, icon_url from public.aj_apps where not aj_private.is_store_img(icon_url) or not aj_private.is_store_imgs(screenshots);
--   (not valid 라 기존 행은 안 막고 새로 넣거나 고칠 때만 검사)
alter table public.aj_apps add constraint aj_apps_icon_store
  check (aj_private.is_store_img(icon_url)) not valid;
-- check 안에는 서브쿼리를 못 써서 함수로
create or replace function aj_private.is_store_imgs(us text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(aj_private.is_store_img(s)), true) from unnest(us) s
$$;
alter table public.aj_apps add constraint aj_apps_shots_store
  check (aj_private.is_store_imgs(screenshots)) not valid;
