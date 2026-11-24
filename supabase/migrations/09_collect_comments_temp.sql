-- 11-23 방향 전환: 품앗이 의무·감점 폐지 → 받기(주움) + 댓글 + 온도(깎이지 않음) + 답방
-- 스토어 정보(카테고리·출시일·업데이트일) 자동 저장

-- ---------- 앱: 스토어에서 가져오는 정보 ----------
alter table public.aj_apps
  add column if not exists category text,
  add column if not exists released_at timestamptz,
  add column if not exists store_updated_at timestamptz,
  add column if not exists meta_checked_at timestamptz;
create index if not exists aj_apps_category_idx on public.aj_apps(category);

-- ---------- 옛 품앗이 정리 ----------
select cron.unschedule('aj-expire-matches') where exists (select 1 from cron.job where jobname = 'aj-expire-matches');
drop function if exists public.aj_leave_feedback(uuid, text);
-- 온도는 100에서 새로 시작
update public.aj_profiles set score = 100;

-- 댓글은 앱당 여러 개 가능
alter table public.aj_feedback drop constraint if exists aj_feedback_app_id_author_id_key;
create index if not exists aj_feedback_app_idx on public.aj_feedback(app_id, created_at desc);

alter table public.aj_notifications drop constraint if exists aj_notifications_kind_check;
alter table public.aj_notifications add constraint aj_notifications_kind_check
  check (kind = any (array['got','matched','feedback','kept','missed','grace','comment','helpful','visit']));

-- ---------- 직접 고칠 수 있는 칸만 열기 (온도·카운트는 함수로만) ----------
revoke insert, update on public.aj_profiles from anon, authenticated;
grant insert (id, nickname, avatar_url, country, locale) on public.aj_profiles to authenticated;
grant update (nickname, avatar_url, country, locale, setup_done) on public.aj_profiles to authenticated;
revoke update on public.aj_apps from anon, authenticated;
grant update (name, tagline, countries, all_countries) on public.aj_apps to authenticated;
revoke update on public.aj_notifications from anon, authenticated;
grant update (read_at) on public.aj_notifications to authenticated;

-- ---------- 답방인지: 상대(p_other)가 전에 내(p_me) 앱을 받았거나 댓글을 남겼나 ----------
create or replace function aj_private.visited(p_other uuid, p_me uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.aj_downloads d join public.aj_apps a on a.id = d.app_id where d.user_id = p_other and a.owner_id = p_me)
      or exists (select 1 from public.aj_feedback f join public.aj_apps a on a.id = f.app_id where f.author_id = p_other and a.owner_id = p_me)
$$;

-- ---------- 받기(주움): 앱당 한 번 온도 +1, 주인에게 알림 ----------
create or replace function public.aj_record_download(p_app uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_owner uuid; v_dl uuid; v_visit boolean;
begin
  if uid is null then raise exception 'login_required'; end if;
  if not exists (select 1 from public.aj_profiles where id = uid) then raise exception 'profile_required'; end if;
  select owner_id into v_owner from public.aj_apps where id = p_app;
  if v_owner is null then raise exception 'app_not_found'; end if;
  if v_owner = uid then raise exception 'own_app'; end if;

  insert into public.aj_downloads(user_id, app_id) values (uid, p_app)
  on conflict (user_id, app_id) do nothing returning id into v_dl;
  if v_dl is null then return jsonb_build_object('already', true, 'delta', 0); end if;

  update public.aj_profiles set score = score + 1 where id = uid;
  v_visit := aj_private.visited(v_owner, uid);
  insert into public.aj_notifications(user_id, kind, actor_id, app_id)
  values (v_owner, case when v_visit then 'visit' else 'got' end, uid, p_app);
  return jsonb_build_object('already', false, 'delta', 1, 'visit', v_visit);
end $$;

-- ---------- 댓글: 누구나(받기 안 해도), 앱마다 첫 댓글에만 온도 ----------
create or replace function public.aj_comment(p_app uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_body text := btrim(coalesce(p_body,'')); v_owner uuid; v_first boolean; v_delta int := 0; v_id uuid; v_score int;
begin
  if uid is null then raise exception 'login_required'; end if;
  if not exists (select 1 from public.aj_profiles where id = uid) then raise exception 'profile_required'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 100 then raise exception 'bad_length'; end if;
  if aj_private.has_badword(v_body) then raise exception 'badword'; end if;
  select owner_id into v_owner from public.aj_apps where id = p_app;
  if v_owner is null then raise exception 'app_not_found'; end if;
  -- 1분에 5개 넘게는 막기
  if (select count(*) from public.aj_feedback where author_id = uid and created_at > now() - interval '1 minute') >= 5 then raise exception 'too_fast'; end if;

  v_first := not exists (select 1 from public.aj_feedback where app_id = p_app and author_id = uid);
  insert into public.aj_feedback(app_id, author_id, kind, body) values (p_app, uid, 'free', v_body) returning id into v_id;
  update public.aj_apps set feedback_count = feedback_count + 1 where id = p_app;

  if v_owner <> uid then
    if v_first then
      select score into v_score from public.aj_profiles where id = uid for update;
      v_delta := aj_private.gain(v_score);
      update public.aj_profiles set score = score + v_delta where id = uid;
    end if;
    insert into public.aj_notifications(user_id, kind, actor_id, app_id, body)
    values (v_owner, case when aj_private.visited(v_owner, uid) then 'visit' else 'comment' end, uid, p_app, v_body);
  else
    -- 개발자 답글: 이 앱에 댓글 단 사람들에게
    insert into public.aj_notifications(user_id, kind, actor_id, app_id, body)
    select distinct f.author_id, 'comment', uid, p_app, v_body from public.aj_feedback f
    where f.app_id = p_app and f.author_id <> uid and not f.hidden limit 30;
  end if;
  return jsonb_build_object('id', v_id, 'delta', v_delta);
end $$;
revoke execute on function public.aj_comment(uuid, text) from public, anon;
grant execute on function public.aj_comment(uuid, text) to authenticated;

create or replace function public.aj_delete_comment(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_app uuid;
begin
  delete from public.aj_feedback where id = p_id and author_id = uid returning app_id into v_app;
  if v_app is not null then update public.aj_apps set feedback_count = greatest(0, feedback_count - 1) where id = v_app; end if;
end $$;
revoke execute on function public.aj_delete_comment(uuid) from public, anon;
grant execute on function public.aj_delete_comment(uuid) to authenticated;

-- ---------- 도움돼요: 앱 주인만, 댓글 쓴 사람 온도 오름 ----------
create or replace function public.aj_mark_helpful(p_feedback uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v_fb public.aj_feedback; v_owner uuid; v_new boolean; v_score int; v_delta int;
begin
  if uid is null then raise exception 'login_required'; end if;
  select * into v_fb from public.aj_feedback where id = p_feedback and not hidden;
  if v_fb.id is null then raise exception 'not_found'; end if;
  select owner_id into v_owner from public.aj_apps where id = v_fb.app_id;
  if v_owner <> uid then raise exception 'owner_only'; end if;
  if v_fb.author_id = uid then raise exception 'own_feedback'; end if;
  insert into public.aj_helpful(feedback_id, user_id) values (p_feedback, uid)
  on conflict do nothing returning true into v_new;
  if v_new then
    update public.aj_feedback set helpful_count = helpful_count + 1 where id = p_feedback;
    select score into v_score from public.aj_profiles where id = v_fb.author_id for update;
    v_delta := aj_private.gain(v_score);
    update public.aj_profiles set score = score + v_delta where id = v_fb.author_id;
    insert into public.aj_notifications(user_id, kind, actor_id, app_id, body, delta)
    values (v_fb.author_id, 'helpful', uid, v_fb.app_id, v_fb.body, v_delta);
  end if;
end $$;

-- ---------- 앱 올리기: 카테고리·날짜도 같이 ----------
drop function if exists public.aj_add_app(text, text, text, text[], text[], boolean, text);
create or replace function public.aj_add_app(
  p_url text, p_name text, p_icon text, p_screens text[], p_countries text[], p_all_countries boolean, p_tagline text,
  p_category text default null, p_released timestamptz default null, p_updated timestamptz default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v jsonb := public.aj_parse_link(p_url); v_id uuid; v_tag text := nullif(btrim(coalesce(p_tagline,'')), '');
begin
  if uid is null then raise exception 'login_required'; end if;
  if not exists (select 1 from public.aj_profiles where id = uid) then raise exception 'profile_required'; end if;
  if v is null then raise exception 'bad_link'; end if;
  if exists (select 1 from public.aj_apps where store_key = v->>'key') then raise exception 'duplicate'; end if;
  if p_icon is not null and p_icon !~ '^https://' then raise exception 'bad_icon'; end if;
  if aj_private.has_badword(p_name) or aj_private.has_badword(v_tag) then raise exception 'badword'; end if;
  if p_category is not null and p_category not in ('game','productivity','photo','life','health','edu','social','tools','money','fun','etc') then p_category := 'etc'; end if;
  insert into public.aj_apps(owner_id, platform, stage, store_key, url, name, icon_url, screenshots, countries, all_countries, tagline,
                             category, released_at, store_updated_at, meta_checked_at)
  values (uid, v->>'platform', v->>'stage', v->>'key', btrim(p_url), btrim(p_name), p_icon,
          coalesce((select array_agg(s) from unnest(p_screens) s where s ~ '^https://'), '{}')::text[],
          coalesce(p_countries, '{KR}'), coalesce(p_all_countries, false), v_tag,
          p_category, p_released, p_updated, now())
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.aj_add_app(text, text, text, text[], text[], boolean, text, text, timestamptz, timestamptz) from public, anon;
grant execute on function public.aj_add_app(text, text, text, text[], text[], boolean, text, text, timestamptz, timestamptz) to authenticated;

-- ---------- 하루 한 번 스토어 정보 새로 고침 ----------
select cron.schedule('aj-store-refresh', '17 */6 * * *', $$
  select net.http_post(
    url := 'https://ztxzqvnybiemgbhtrwiw.supabase.co/functions/v1/aj-store-meta',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"refresh":true}'::jsonb)
$$);
