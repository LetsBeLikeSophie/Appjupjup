-- 11-26 리뷰 반영: 캡처는 실제 올린 파일만(서버가 본 eTag로 같은 사진 막기), 앱 지울 때 티켓 정리, 같은 앱 다시 올려 반복 참여 막기,
-- 동시 참여 10개 잠금, 기록된 캡처 파일은 못 지움, 끝난/탈락 참여엔 피드백 못 씀, 사진 지우기 목록 함수

-- 지운 앱의 캡처 파일은 여기 모았다가 aj-test-sweep이 지움
create table if not exists aj_private.cap_trash (path text primary key, added_at timestamptz not null default now());
-- 원본 사진 해시 (저장소 eTag와 따로, 다시 올리기 막기)
create table if not exists aj_private.cap_hash (hash text primary key);

-- 같은 스토어 링크 = 같은 앱 (지우고 다시 올려도 같은 사람이 또 참여 못 함)
alter table public.aj_test_joins add column if not exists store_key text;
update public.aj_test_joins j set store_key = a.store_key from public.aj_apps a where a.id = j.app_id and j.store_key is null;
create index if not exists aj_test_joins_store_idx on public.aj_test_joins(store_key, tester_id);
create unique index if not exists aj_test_caps_path_key on public.aj_test_caps(path) where path is not null;

-- ---------- 앱 지우기 전: 걸어 둔 티켓은 주인에게, 잠긴 티켓은 테스터에게, 캡처 파일은 지울 목록으로 ----------
create or replace function aj_private.apps_before_delete_tests() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.aj_profiles p set tickets = p.tickets + t.stake from public.aj_tests t where t.app_id = old.id and p.id = t.owner_id and t.stake > 0;
  update public.aj_profiles p set tickets = p.tickets + 1 from public.aj_test_joins j
    where j.app_id = old.id and j.status = 'active' and j.staked and p.id = j.tester_id;
  insert into aj_private.cap_trash(path) select c.path from public.aj_test_caps c join public.aj_test_joins j on j.id = c.join_id
    where j.app_id = old.id and c.path is not null on conflict do nothing;
  return old;
end $$;
drop trigger if exists aj_apps_before_delete_tests on public.aj_apps;
create trigger aj_apps_before_delete_tests before delete on public.aj_apps for each row execute function aj_private.apps_before_delete_tests();

-- ---------- 참여: 테스터 줄 잠금(동시 10개), 같은 스토어 링크 한 번만 ----------
create or replace function public.aj_test_join(p_app uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t public.aj_tests; v_app public.aj_apps; v_cnt int; v_reward int; v_staked boolean := false;
begin
  if uid is null then raise exception 'login_required'; end if;
  perform 1 from public.aj_profiles where id = uid for update;
  if not found then raise exception 'profile_required'; end if;
  select * into t from public.aj_tests where app_id = p_app for update;
  if t.app_id is null then raise exception 'not_open'; end if;
  if t.owner_id = uid then raise exception 'own_app'; end if;
  select * into v_app from public.aj_apps where id = p_app;
  if exists (select 1 from public.aj_test_joins where tester_id = uid and (app_id = p_app or store_key = v_app.store_key)) then raise exception 'already'; end if;
  if (select count(*) from public.aj_test_joins where tester_id = uid and status = 'active') >= 10 then raise exception 'max_join'; end if;
  select count(*) into v_cnt from public.aj_test_joins where app_id = p_app and status in ('active', 'done');
  if v_cnt >= t.need then raise exception 'full'; end if;

  v_reward := 1 + (case when v_cnt >= t.need - 3 then 1 else 0 end);
  if t.stake > 0 then
    v_staked := true; v_reward := v_reward + 1;
    update public.aj_tests set stake = stake - 1 where app_id = p_app;
  end if;
  insert into public.aj_test_joins(app_id, owner_id, tester_id, platform, reward, staked, store_key)
  values (p_app, t.owner_id, uid, v_app.platform, v_reward, v_staked, v_app.store_key);
  return jsonb_build_object('reward', v_reward);
end $$;

-- ---------- 캡처: 실제로 올린 내 파일이어야 하고, 같은 사진은 서버가 본 eTag로 막음 ----------
create or replace function public.aj_test_capture(p_join uuid, p_idx int, p_path text, p_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); j public.aj_test_joins; v_day int; v_checks int[]; v_prev timestamptz; v_etag text;
begin
  if uid is null then raise exception 'login_required'; end if;
  select * into j from public.aj_test_joins where id = p_join and tester_id = uid for update;
  if j.id is null then raise exception 'not_found'; end if;
  if j.status <> 'active' then raise exception 'not_active'; end if;
  if aj_private.test_missed(j.id) then perform aj_private.test_fail(j.id); return jsonb_build_object('missed', true); end if;
  if p_idx not between 0 and 2 then raise exception 'bad_idx'; end if;
  if p_path is null or p_path not like uid::text || '/' || j.id::text || '/%' then raise exception 'bad_path'; end if;
  select coalesce(o.metadata->>'eTag', '') into v_etag from storage.objects o
    where o.bucket_id = 'aj-caps' and o.name = p_path and o.owner_id = uid::text;
  if v_etag is null then raise exception 'bad_path'; end if;
  if exists (select 1 from public.aj_test_caps where join_id = j.id and idx = p_idx) then raise exception 'already'; end if;
  if exists (select 1 from public.aj_test_caps where path = p_path) then raise exception 'same_photo'; end if;
  -- 서버 기준: 저장소가 계산한 eTag(없으면 원본 해시)
  v_etag := coalesce(nullif(btrim(v_etag, '"'), ''), p_hash);
  if v_etag is null or v_etag = '' then raise exception 'bad_hash'; end if;
  if exists (select 1 from public.aj_test_caps where hash in (v_etag, p_hash))
     or exists (select 1 from aj_private.cap_hash where hash in (v_etag, p_hash)) then raise exception 'same_photo'; end if;

  v_day := aj_private.test_day(j.joined_at);
  v_checks := aj_private.test_checks(j.platform);
  if v_day < v_checks[p_idx + 1] then raise exception 'not_yet'; end if;
  if p_idx > 0 then
    select created_at into v_prev from public.aj_test_caps where join_id = j.id and idx = p_idx - 1;
    if v_prev is null then raise exception 'not_yet'; end if;
    if aj_private.test_day(j.joined_at, v_prev) >= v_day then raise exception 'not_yet'; end if;
  end if;

  insert into public.aj_test_caps(join_id, idx, tester_id, owner_id, path, hash)
  values (j.id, p_idx, uid, j.owner_id, p_path, v_etag);
  -- 원본 해시도 남겨서 다른 기기로 다시 올려도 막기
  if p_hash ~ '^[0-9a-f]{64}$' and p_hash <> v_etag then
    insert into aj_private.cap_hash(hash) values (p_hash) on conflict do nothing;
  end if;

  if p_idx = 2 then
    update public.aj_test_joins set status = 'done', finished_at = now() where id = j.id;
    update public.aj_profiles set tickets = tickets + j.reward where id = uid;
    return jsonb_build_object('done', true, 'reward', j.reward);
  end if;
  return jsonb_build_object('done', false);
end $$;

-- ---------- 피드백: 참여 중이거나 끝난 지 14일 안 ----------
create or replace function public.aj_test_note(p_join uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); j public.aj_test_joins; v_body text := btrim(coalesce(p_body, ''));
begin
  if uid is null then raise exception 'login_required'; end if;
  select * into j from public.aj_test_joins where id = p_join and tester_id = uid;
  if j.id is null then raise exception 'not_found'; end if;
  if not (j.status = 'active' or (j.status = 'done' and j.finished_at > now() - interval '14 days')) then raise exception 'not_active'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 60 then raise exception 'bad_length'; end if;
  if aj_private.has_badword(v_body) then raise exception 'badword'; end if;
  if (select count(*) from public.aj_test_notes where author_id = uid and created_at > now() - interval '1 minute') >= 5 then raise exception 'too_fast'; end if;
  insert into public.aj_test_notes(join_id, app_id, owner_id, author_id, day, body)
  values (j.id, j.app_id, j.owner_id, uid, least(aj_private.test_day(j.joined_at), 99), v_body);
end $$;

-- ---------- 기록된 캡처 파일은 테스터가 못 지움 ----------
drop policy if exists aj_caps_delete on storage.objects;
create policy aj_caps_delete on storage.objects for delete to authenticated
  using (bucket_id = 'aj-caps' and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (select 1 from public.aj_test_caps c where c.path = name));

-- ---------- aj-test-sweep용: 지울 사진 가져가기 (끝난 지 14일 + 지운 앱), 서비스 키만 ----------
create or replace function public.aj_test_take_old_caps(p_limit int default 200) returns setof text
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in
    select c.join_id, c.idx, c.path from public.aj_test_caps c join public.aj_test_joins j on j.id = c.join_id
    where c.path is not null and j.status <> 'active' and j.finished_at < now() - interval '14 days'
    order by j.finished_at limit p_limit
  loop
    update public.aj_test_caps set path = null where join_id = r.join_id and idx = r.idx;
    return next r.path;
  end loop;
  return query delete from aj_private.cap_trash where path in (select path from aj_private.cap_trash order by added_at limit p_limit) returning path;
end $$;
revoke execute on function public.aj_test_take_old_caps(int) from public, anon, authenticated;
grant execute on function public.aj_test_take_old_caps(int) to service_role;
