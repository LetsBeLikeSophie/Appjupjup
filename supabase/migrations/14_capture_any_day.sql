-- 11-27 소피 확정: 캡처 날짜 칸 없앰. 하루 1장씩 몇 장이든(최대 30), 필수 = 서로 다른 날 3장 + 마지막 날(안드로이드 14일·애플 3일) 이후 1장
-- 끝: 3장 이상이면서 마지막 날 이후 사진을 찍는 순간 → 🎫 보상. 탈락: 안드로이드 16일·애플 5일 넘도록 못 끝냄
-- 옛 test_checks/test_deadlines는 안 씀

alter table public.aj_test_caps drop constraint if exists aj_test_caps_idx_check;
alter table public.aj_test_caps add constraint aj_test_caps_idx_check check (idx between 0 and 29);

-- 마지막 날 (이날 이후 사진 1장 필수)
create or replace function aj_private.test_final(p_platform text) returns int
language sql immutable set search_path = '' as $$ select case when p_platform = 'ios' then 3 else 14 end $$;
-- 이날 넘도록 못 끝내면 탈락
create or replace function aj_private.test_last(p_platform text) returns int
language sql immutable set search_path = '' as $$ select case when p_platform = 'ios' then 5 else 16 end $$;

create or replace function aj_private.test_missed(p_join uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.aj_test_joins j where j.id = p_join and j.status = 'active'
    and aj_private.test_day(j.joined_at) > aj_private.test_last(j.platform))
$$;

-- ---------- 캡처: 하루 1장, idx는 0부터 차례로 ----------
create or replace function public.aj_test_capture(p_join uuid, p_idx int, p_path text, p_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); j public.aj_test_joins; v_day int; v_n int; v_etag text;
begin
  if uid is null then raise exception 'login_required'; end if;
  select * into j from public.aj_test_joins where id = p_join and tester_id = uid for update;
  if j.id is null then raise exception 'not_found'; end if;
  if j.status <> 'active' then raise exception 'not_active'; end if;
  if aj_private.test_missed(j.id) then perform aj_private.test_fail(j.id); return jsonb_build_object('missed', true); end if;
  v_day := aj_private.test_day(j.joined_at);
  if exists (select 1 from public.aj_test_caps c where c.join_id = j.id and aj_private.test_day(j.joined_at, c.created_at) = v_day) then raise exception 'today_done'; end if;
  select count(*) into v_n from public.aj_test_caps where join_id = j.id;
  if p_idx is distinct from v_n or v_n >= 30 then raise exception 'bad_idx'; end if;
  if p_path is null or p_path not like uid::text || '/' || j.id::text || '/%' then raise exception 'bad_path'; end if;
  select coalesce(o.metadata->>'eTag', '') into v_etag from storage.objects o
    where o.bucket_id = 'aj-caps' and o.name = p_path and o.owner_id = uid::text;
  if v_etag is null then raise exception 'bad_path'; end if;
  if exists (select 1 from public.aj_test_caps where path = p_path) then raise exception 'same_photo'; end if;
  v_etag := coalesce(nullif(btrim(v_etag, '"'), ''), p_hash);
  if v_etag is null or v_etag = '' then raise exception 'bad_hash'; end if;
  if exists (select 1 from public.aj_test_caps where hash in (v_etag, p_hash))
     or exists (select 1 from aj_private.cap_hash where hash in (v_etag, p_hash)) then raise exception 'same_photo'; end if;

  insert into public.aj_test_caps(join_id, idx, tester_id, owner_id, path, hash)
  values (j.id, p_idx, uid, j.owner_id, p_path, v_etag);
  if p_hash ~ '^[0-9a-f]{64}$' and p_hash <> v_etag then
    insert into aj_private.cap_hash(hash) values (p_hash) on conflict do nothing;
  end if;

  -- 3장 이상 + 지금이 마지막 날 이후면 끝
  if v_n + 1 >= 3 and v_day >= aj_private.test_final(j.platform) then
    update public.aj_test_joins set status = 'done', finished_at = now() where id = j.id;
    update public.aj_profiles set tickets = tickets + j.reward where id = uid;
    return jsonb_build_object('done', true, 'reward', j.reward);
  end if;
  return jsonb_build_object('done', false);
end $$;

-- ---------- 내 정보 점: 오늘 안 찍었고, 아직 2장 미만이거나 마지막 날이 됐을 때 ----------
create or replace function public.aj_test_due() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.aj_test_joins j
    where j.tester_id = auth.uid() and j.status = 'active'
      and aj_private.test_day(j.joined_at) <= aj_private.test_last(j.platform)
      and not exists (select 1 from public.aj_test_caps c where c.join_id = j.id
                      and aj_private.test_day(j.joined_at, c.created_at) = aj_private.test_day(j.joined_at))
      and ((select count(*) from public.aj_test_caps c where c.join_id = j.id) < 2
           or aj_private.test_day(j.joined_at) >= aj_private.test_final(j.platform))
  )
$$;
