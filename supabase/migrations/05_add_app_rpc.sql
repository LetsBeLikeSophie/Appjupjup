-- 아직 적용 전: Supabase 확인 질문에 답이 필요해요.
-- 앱 등록을 링크 검사 함수(aj_add_app)로만 받게 바꿔서, 링크를 살짝 바꿔 중복 검사를 피하는 걸 막아요.

create or replace function public.aj_parse_link(p_url text) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare u text := btrim(coalesce(p_url,'')); m text[];
begin
  m := regexp_match(u, '^https://play\.google\.com/store/apps/details\?(?:.*&)?id=([A-Za-z0-9_.]+)');
  if m is not null then return jsonb_build_object('platform','android','stage','live','key','play:'||lower(m[1]),'id',m[1]); end if;
  m := regexp_match(u, '^https://play\.google\.com/apps/(?:internal)?testing/([A-Za-z0-9_.]+)');
  if m is not null then return jsonb_build_object('platform','android','stage','test','key','play:'||lower(m[1]),'id',m[1]); end if;
  m := regexp_match(u, '^https://apps\.apple\.com/.*?/id([0-9]+)');
  if m is not null then return jsonb_build_object('platform','ios','stage','live','key','ios:'||m[1],'id',m[1]); end if;
  m := regexp_match(u, '^https://testflight\.apple\.com/join/([A-Za-z0-9]+)');
  if m is not null then return jsonb_build_object('platform','ios','stage','test','key','tf:'||m[1],'id',m[1]); end if;
  return null;
end $$;
grant execute on function public.aj_parse_link(text) to anon, authenticated;

create or replace function public.aj_find_app_by_link(p_url text) returns uuid
language sql stable security invoker set search_path = '' as $$
  select id from public.aj_apps where store_key = (public.aj_parse_link(p_url)->>'key')
$$;
grant execute on function public.aj_find_app_by_link(text) to anon, authenticated;

create or replace function public.aj_add_app(
  p_url text, p_name text, p_icon text, p_screens text[], p_countries text[], p_all_countries boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v jsonb := public.aj_parse_link(p_url); v_id uuid;
begin
  if uid is null then raise exception 'login_required'; end if;
  if not exists (select 1 from public.aj_profiles where id = uid) then raise exception 'profile_required'; end if;
  if v is null then raise exception 'bad_link'; end if;
  if exists (select 1 from public.aj_apps where store_key = v->>'key') then raise exception 'duplicate'; end if;
  if p_icon is not null and p_icon !~ '^https://' then raise exception 'bad_icon'; end if;
  insert into public.aj_apps(owner_id, platform, stage, store_key, url, name, icon_url, screenshots, countries, all_countries)
  values (uid, v->>'platform', v->>'stage', v->>'key', btrim(p_url), btrim(p_name), p_icon,
          coalesce((select array_agg(s) from unnest(p_screens) s where s ~ '^https://'), '{}')::text[],
          coalesce(p_countries, '{KR}'), coalesce(p_all_countries, false))
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.aj_add_app(text, text, text, text[], text[], boolean) from public, anon;
grant execute on function public.aj_add_app(text, text, text, text[], text[], boolean) to authenticated;

-- 앱 직접 등록은 막고 aj_add_app으로만
revoke insert on public.aj_apps from authenticated;
drop policy if exists aj_apps_insert_own on public.aj_apps;
