-- 11-26 테스터 교환 + 티켓 (온도·악수는 화면에서 뺌, 칸은 남김)
-- 🎫 얻기: 남의 앱 테스트 끝(안드로이드 1·7·14일 / 애플 1·2·3일 캡처) → 보상(1 + 마지막 3자리 1 + 주인이 건 티켓 1)
-- 🎫 쓰기: 2·3번째 앱 올리기 2장 · 내 앱에 걸기(테스터 보상 +1, 참여 순간 그 사람 몫으로 잠김)
-- 가입 1장. 날짜는 서버 시각(참여 후 24시간 = 하루). 같은 사진(해시) 재사용 금지. 캡처는 끝나고 14일 뒤 지움(aj-test-sweep)

-- ---------- 티켓 ----------
alter table public.aj_profiles add column if not exists tickets int not null default 1 check (tickets >= 0);
-- tickets는 직접 못 고침 (09에서 update 칸을 정해 둬서 따로 막을 필요 없음)

-- ---------- 모집 (앱마다 하나) ----------
create table if not exists public.aj_tests (
  app_id uuid primary key references public.aj_apps(id) on delete cascade,
  owner_id uuid not null references public.aj_profiles(id) on delete cascade,
  need smallint not null default 12,
  stake int not null default 0 check (stake >= 0),
  opened_at timestamptz not null default now()
);
create index if not exists aj_tests_owner_idx on public.aj_tests(owner_id);

-- ---------- 참여 ----------
create table if not exists public.aj_test_joins (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.aj_apps(id) on delete cascade,
  owner_id uuid not null references public.aj_profiles(id) on delete cascade,
  tester_id uuid not null references public.aj_profiles(id) on delete cascade,
  platform text not null,
  status text not null default 'active' check (status in ('active', 'done', 'failed')),
  reward smallint not null,
  staked boolean not null default false,
  joined_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (app_id, tester_id)
);
create index if not exists aj_test_joins_tester_idx on public.aj_test_joins(tester_id, status);
create index if not exists aj_test_joins_owner_idx on public.aj_test_joins(owner_id);
create index if not exists aj_test_joins_app_idx on public.aj_test_joins(app_id, status);

-- ---------- 캡처 (path는 14일 뒤 지우고 null, hash는 남겨서 재사용 막음) ----------
create table if not exists public.aj_test_caps (
  join_id uuid not null references public.aj_test_joins(id) on delete cascade,
  idx smallint not null check (idx between 0 and 2),
  tester_id uuid not null,
  owner_id uuid not null,
  path text,
  hash text not null unique,
  created_at timestamptz not null default now(),
  primary key (join_id, idx)
);
create index if not exists aj_test_caps_owner_idx on public.aj_test_caps(owner_id);
create index if not exists aj_test_caps_tester_idx on public.aj_test_caps(tester_id);

-- ---------- 테스트 피드백 (앱 주인만 봄) ----------
create table if not exists public.aj_test_notes (
  id uuid primary key default gen_random_uuid(),
  join_id uuid not null references public.aj_test_joins(id) on delete cascade,
  app_id uuid not null references public.aj_apps(id) on delete cascade,
  owner_id uuid not null,
  author_id uuid not null references public.aj_profiles(id) on delete cascade,
  day smallint not null,
  body text not null check (char_length(body) between 1 and 60),
  created_at timestamptz not null default now()
);
create index if not exists aj_test_notes_owner_idx on public.aj_test_notes(owner_id, created_at desc);
create index if not exists aj_test_notes_join_idx on public.aj_test_notes(join_id);
create index if not exists aj_test_notes_author_idx on public.aj_test_notes(author_id, created_at desc);

-- ---------- 읽기 권한: 쓰기는 함수로만 ----------
alter table public.aj_tests enable row level security;
alter table public.aj_test_joins enable row level security;
alter table public.aj_test_caps enable row level security;
alter table public.aj_test_notes enable row level security;
revoke all on public.aj_tests, public.aj_test_joins, public.aj_test_caps, public.aj_test_notes from anon, authenticated;
grant select on public.aj_tests to anon, authenticated;
grant select on public.aj_test_joins, public.aj_test_caps, public.aj_test_notes to authenticated;

drop policy if exists aj_tests_read on public.aj_tests;
create policy aj_tests_read on public.aj_tests for select using (true);
drop policy if exists aj_test_joins_read on public.aj_test_joins;
create policy aj_test_joins_read on public.aj_test_joins for select to authenticated
  using (tester_id = (select auth.uid()) or owner_id = (select auth.uid()));
drop policy if exists aj_test_caps_read on public.aj_test_caps;
create policy aj_test_caps_read on public.aj_test_caps for select to authenticated
  using (tester_id = (select auth.uid()) or owner_id = (select auth.uid()));
drop policy if exists aj_test_notes_read on public.aj_test_notes;
create policy aj_test_notes_read on public.aj_test_notes for select to authenticated
  using (author_id = (select auth.uid()) or owner_id = (select auth.uid()));

-- ---------- 규칙 ----------
-- 캡처 날 (참여한 날 = 1일)
create or replace function aj_private.test_checks(p_platform text) returns int[]
language sql immutable set search_path = '' as $$
  select case when p_platform = 'ios' then array[1,2,3] else array[1,7,14] end
$$;
-- 칸마다 마지막 날 (넘기면 탈락)
create or replace function aj_private.test_deadlines(p_platform text) returns int[]
language sql immutable set search_path = '' as $$
  select case when p_platform = 'ios' then array[3,4,5] else array[6,13,16] end
$$;
create or replace function aj_private.test_day(p_joined timestamptz, p_at timestamptz default now()) returns int
language sql stable set search_path = '' as $$
  select floor(extract(epoch from (p_at - p_joined)) / 86400)::int + 1
$$;

-- 놓친 칸이 있나 (마지막 날 지났는데 안 찍음)
create or replace function aj_private.test_missed(p_join uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.aj_test_joins j,
      generate_subscripts(aj_private.test_deadlines(j.platform), 1) i
    where j.id = p_join and j.status = 'active'
      and aj_private.test_day(j.joined_at) > (aj_private.test_deadlines(j.platform))[i]
      and not exists (select 1 from public.aj_test_caps c where c.join_id = j.id and c.idx = i - 1)
  )
$$;

-- 탈락: 자리 비우고, 걸어 둔 티켓은 주인에게 돌려줌
create or replace function aj_private.test_fail(p_join uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare j public.aj_test_joins;
begin
  update public.aj_test_joins set status = 'failed', finished_at = now()
  where id = p_join and status = 'active' returning * into j;
  if j.id is not null and j.staked then
    update public.aj_profiles set tickets = tickets + 1 where id = j.owner_id;
  end if;
end $$;

-- 매시간: 놓친 참여 정리
create or replace function aj_private.test_sweep() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select id from public.aj_test_joins where status = 'active' loop
    if aj_private.test_missed(r.id) then perform aj_private.test_fail(r.id); n := n + 1; end if;
  end loop;
  return n;
end $$;

-- ---------- 모집 열기 (내 앱) ----------
create or replace function public.aj_test_open(p_app uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'login_required'; end if;
  if not exists (select 1 from public.aj_apps where id = p_app and owner_id = uid) then raise exception 'owner_only'; end if;
  insert into public.aj_tests(app_id, owner_id) values (p_app, uid) on conflict (app_id) do nothing;
end $$;

-- ---------- 티켓 걸기/빼기 (내 앱, ±1) ----------
create or replace function public.aj_test_stake(p_app uuid, p_delta int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_stake int; v_tickets int;
begin
  if uid is null then raise exception 'login_required'; end if;
  if p_delta not in (1, -1) then raise exception 'bad_delta'; end if;
  select stake into v_stake from public.aj_tests where app_id = p_app and owner_id = uid for update;
  if v_stake is null then raise exception 'owner_only'; end if;
  select tickets into v_tickets from public.aj_profiles where id = uid for update;
  if p_delta = 1 then
    if v_tickets < 1 then raise exception 'need_tickets'; end if;
    update public.aj_profiles set tickets = tickets - 1 where id = uid;
    update public.aj_tests set stake = stake + 1 where app_id = p_app;
  else
    -- 이미 참여한 사람 몫(잠김)은 aj_tests.stake에서 빠져 있어서 못 뺌
    if v_stake < 1 then raise exception 'stake_locked'; end if;
    update public.aj_tests set stake = stake - 1 where app_id = p_app;
    update public.aj_profiles set tickets = tickets + 1 where id = uid;
  end if;
  return jsonb_build_object('stake', v_stake + p_delta, 'tickets', v_tickets - p_delta);
end $$;

-- ---------- 참여 ----------
create or replace function public.aj_test_join(p_app uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t public.aj_tests; v_platform text; v_cnt int; v_reward int; v_staked boolean := false;
begin
  if uid is null then raise exception 'login_required'; end if;
  if not exists (select 1 from public.aj_profiles where id = uid) then raise exception 'profile_required'; end if;
  select * into t from public.aj_tests where app_id = p_app for update;
  if t.app_id is null then raise exception 'not_open'; end if;
  if t.owner_id = uid then raise exception 'own_app'; end if;
  if exists (select 1 from public.aj_test_joins where app_id = p_app and tester_id = uid) then raise exception 'already'; end if;
  if (select count(*) from public.aj_test_joins where tester_id = uid and status = 'active') >= 10 then raise exception 'max_join'; end if;
  select count(*) into v_cnt from public.aj_test_joins where app_id = p_app and status in ('active', 'done');
  if v_cnt >= t.need then raise exception 'full'; end if;
  select platform into v_platform from public.aj_apps where id = p_app;

  v_reward := 1 + (case when v_cnt >= t.need - 3 then 1 else 0 end);
  if t.stake > 0 then
    v_staked := true; v_reward := v_reward + 1;
    update public.aj_tests set stake = stake - 1 where app_id = p_app;
  end if;
  insert into public.aj_test_joins(app_id, owner_id, tester_id, platform, reward, staked)
  values (p_app, t.owner_id, uid, v_platform, v_reward, v_staked);
  return jsonb_build_object('reward', v_reward);
end $$;

-- ---------- 캡처 기록 (사진은 먼저 aj-caps/{uid}/{join}/ 에 올림) ----------
create or replace function public.aj_test_capture(p_join uuid, p_idx int, p_path text, p_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); j public.aj_test_joins; v_day int; v_checks int[]; v_dead int[]; v_prev timestamptz;
begin
  if uid is null then raise exception 'login_required'; end if;
  select * into j from public.aj_test_joins where id = p_join and tester_id = uid for update;
  if j.id is null then raise exception 'not_found'; end if;
  if j.status <> 'active' then raise exception 'not_active'; end if;
  if aj_private.test_missed(j.id) then perform aj_private.test_fail(j.id); return jsonb_build_object('missed', true); end if;
  if p_idx not between 0 and 2 then raise exception 'bad_idx'; end if;
  if p_path is null or p_path not like uid::text || '/' || j.id::text || '/%' then raise exception 'bad_path'; end if;
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'bad_hash'; end if;
  if exists (select 1 from public.aj_test_caps where join_id = j.id and idx = p_idx) then raise exception 'already'; end if;
  if exists (select 1 from public.aj_test_caps where hash = p_hash) then raise exception 'same_photo'; end if;

  v_day := aj_private.test_day(j.joined_at);
  v_checks := aj_private.test_checks(j.platform);
  v_dead := aj_private.test_deadlines(j.platform);
  if v_day < v_checks[p_idx + 1] then raise exception 'not_yet'; end if;
  if p_idx > 0 then
    select created_at into v_prev from public.aj_test_caps where join_id = j.id and idx = p_idx - 1;
    if v_prev is null then raise exception 'not_yet'; end if;
    -- 서로 다른 날
    if aj_private.test_day(j.joined_at, v_prev) >= v_day then raise exception 'not_yet'; end if;
  end if;

  insert into public.aj_test_caps(join_id, idx, tester_id, owner_id, path, hash)
  values (j.id, p_idx, uid, j.owner_id, p_path, p_hash);

  if p_idx = 2 then
    update public.aj_test_joins set status = 'done', finished_at = now() where id = j.id;
    update public.aj_profiles set tickets = tickets + j.reward where id = uid;
    return jsonb_build_object('done', true, 'reward', j.reward);
  end if;
  return jsonb_build_object('done', false);
end $$;

-- ---------- 테스트 피드백 ----------
create or replace function public.aj_test_note(p_join uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); j public.aj_test_joins; v_body text := btrim(coalesce(p_body, ''));
begin
  if uid is null then raise exception 'login_required'; end if;
  select * into j from public.aj_test_joins where id = p_join and tester_id = uid;
  if j.id is null then raise exception 'not_found'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 60 then raise exception 'bad_length'; end if;
  if aj_private.has_badword(v_body) then raise exception 'badword'; end if;
  if (select count(*) from public.aj_test_notes where author_id = uid and created_at > now() - interval '1 minute') >= 5 then raise exception 'too_fast'; end if;
  insert into public.aj_test_notes(join_id, app_id, owner_id, author_id, day, body)
  values (j.id, j.app_id, j.owner_id, uid, least(aj_private.test_day(j.joined_at), 99), v_body);
end $$;

-- ---------- 모집 목록: 사람 수·건 티켓·주인이 남을 테스트해 준 수 ----------
create or replace function public.aj_test_board() returns table(app_id uuid, joined int, need int, stake int, given int)
language sql stable security definer set search_path = '' as $$
  select t.app_id,
    (select count(*)::int from public.aj_test_joins j where j.app_id = t.app_id and j.status in ('active', 'done')),
    t.need, t.stake,
    (select count(*)::int from public.aj_test_joins g where g.tester_id = t.owner_id and g.status = 'done')
  from public.aj_tests t
$$;

-- ---------- 오늘 찍을 캡처가 있나 (하단 내 정보 점) ----------
create or replace function public.aj_test_due() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.aj_test_joins j,
      generate_subscripts(aj_private.test_checks(j.platform), 1) i
    where j.tester_id = auth.uid() and j.status = 'active'
      and aj_private.test_day(j.joined_at) between (aj_private.test_checks(j.platform))[i] and (aj_private.test_deadlines(j.platform))[i]
      and not exists (select 1 from public.aj_test_caps c where c.join_id = j.id and c.idx = i - 1)
      and (i = 1 or exists (select 1 from public.aj_test_caps c where c.join_id = j.id and c.idx = i - 2
                            and aj_private.test_day(j.joined_at, c.created_at) < aj_private.test_day(j.joined_at)))
  )
$$;

revoke execute on function public.aj_test_open(uuid), public.aj_test_stake(uuid, int), public.aj_test_join(uuid),
  public.aj_test_capture(uuid, int, text, text), public.aj_test_note(uuid, text), public.aj_test_due() from public, anon;
grant execute on function public.aj_test_open(uuid), public.aj_test_stake(uuid, int), public.aj_test_join(uuid),
  public.aj_test_capture(uuid, int, text, text), public.aj_test_note(uuid, text), public.aj_test_due() to authenticated;
grant execute on function public.aj_test_board() to anon, authenticated;
revoke execute on function aj_private.test_fail(uuid), aj_private.test_sweep() from public, anon, authenticated;

-- ---------- 앱 올리기: 첫 앱 무료, 2·3번째는 🎫2 (화면 배포 때 같이 적용) ----------
create or replace function public.aj_add_app(
  p_url text, p_name text, p_icon text, p_screens text[], p_countries text[], p_all_countries boolean, p_tagline text,
  p_category text default null, p_released timestamptz default null, p_updated timestamptz default null, p_say text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v jsonb := public.aj_parse_link(p_url); v_id uuid;
  v_tag text := nullif(btrim(coalesce(p_tagline,'')), ''); v_say text := nullif(btrim(coalesce(p_say,'')), ''); v_tickets int;
begin
  if uid is null then raise exception 'login_required'; end if;
  select tickets into v_tickets from public.aj_profiles where id = uid for update;
  if v_tickets is null then raise exception 'profile_required'; end if;
  if v is null then raise exception 'bad_link'; end if;
  if exists (select 1 from public.aj_apps where store_key = v->>'key') then raise exception 'duplicate'; end if;
  if p_icon is not null and p_icon !~ '^https://' then raise exception 'bad_icon'; end if;
  if aj_private.has_badword(p_name) or aj_private.has_badword(v_tag) or aj_private.has_badword(v_say) then raise exception 'badword'; end if;
  if v_say is not null and char_length(v_say) > 10 then v_say := left(v_say, 10); end if;
  if p_category is not null and p_category not in ('game','productivity','photo','life','health','edu','social','tools','money','fun','etc') then p_category := 'etc'; end if;
  if exists (select 1 from public.aj_apps where owner_id = uid) then
    if v_tickets < 2 then raise exception 'need_tickets'; end if;
    update public.aj_profiles set tickets = tickets - 2 where id = uid;
  end if;
  insert into public.aj_apps(owner_id, platform, stage, store_key, url, name, icon_url, screenshots, countries, all_countries, tagline, say,
                             category, released_at, store_updated_at, meta_checked_at)
  values (uid, v->>'platform', v->>'stage', v->>'key', btrim(p_url), btrim(p_name), p_icon,
          coalesce((select array_agg(s) from unnest(p_screens) s where s ~ '^https://'), '{}')::text[],
          coalesce(p_countries, '{KR}'), coalesce(p_all_countries, false), v_tag, v_say,
          p_category, p_released, p_updated, now())
  returning id into v_id;
  return v_id;
end $$;

-- ---------- 캡처 사진 저장소 (비공개, 5MB) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('aj-caps', 'aj-caps', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
drop policy if exists aj_caps_insert on storage.objects;
create policy aj_caps_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'aj-caps' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.aj_test_joins j where j.id::text = (storage.foldername(name))[2] and j.tester_id = (select auth.uid()) and j.status = 'active'));
drop policy if exists aj_caps_read on storage.objects;
create policy aj_caps_read on storage.objects for select to authenticated
  using (bucket_id = 'aj-caps' and ((storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.aj_test_joins j where j.id::text = (storage.foldername(name))[2] and j.owner_id = (select auth.uid()))));
drop policy if exists aj_caps_delete on storage.objects;
create policy aj_caps_delete on storage.objects for delete to authenticated
  using (bucket_id = 'aj-caps' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- 매시간: 놓친 참여 정리 + 끝난 지 14일 된 캡처 지우기 ----------
select cron.unschedule('aj-test-sweep') where exists (select 1 from cron.job where jobname = 'aj-test-sweep');
select cron.schedule('aj-test-sweep', '7 * * * *', $cron$
  select aj_private.test_sweep();
  select net.http_post(
    url := 'https://ztxzqvnybiemgbhtrwiw.supabase.co/functions/v1/aj-test-sweep',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb);
$cron$);
