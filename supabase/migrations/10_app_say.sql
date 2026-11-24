-- 10: 앱 "한마디" (홈 더미에서 말풍선으로 떠드는 10글자)
alter table public.aj_apps add column if not exists say text;
alter table public.aj_apps drop constraint if exists aj_apps_say_len;
alter table public.aj_apps add constraint aj_apps_say_len check (say is null or char_length(say) between 1 and 10);

grant update (say) on public.aj_apps to authenticated;

-- 수정할 때도 욕설 막기 (이름·한 줄 소개·한마디)
create or replace function aj_private.apps_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.say := nullif(btrim(coalesce(new.say, '')), '');
  if (new.name is distinct from old.name and aj_private.has_badword(new.name))
     or (new.tagline is distinct from old.tagline and aj_private.has_badword(new.tagline))
     or (new.say is distinct from old.say and aj_private.has_badword(new.say)) then
    raise exception 'badword';
  end if;
  return new;
end $$;
drop trigger if exists aj_apps_before_update on public.aj_apps;
create trigger aj_apps_before_update before update on public.aj_apps
  for each row execute function aj_private.apps_before_update();

-- 올리기에 한마디 추가
drop function if exists public.aj_add_app(text, text, text, text[], text[], boolean, text, text, timestamptz, timestamptz);
create or replace function public.aj_add_app(
  p_url text, p_name text, p_icon text, p_screens text[], p_countries text[], p_all_countries boolean, p_tagline text,
  p_category text default null, p_released timestamptz default null, p_updated timestamptz default null, p_say text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v jsonb := public.aj_parse_link(p_url); v_id uuid;
  v_tag text := nullif(btrim(coalesce(p_tagline,'')), ''); v_say text := nullif(btrim(coalesce(p_say,'')), '');
begin
  if uid is null then raise exception 'login_required'; end if;
  if not exists (select 1 from public.aj_profiles where id = uid) then raise exception 'profile_required'; end if;
  if v is null then raise exception 'bad_link'; end if;
  if exists (select 1 from public.aj_apps where store_key = v->>'key') then raise exception 'duplicate'; end if;
  if p_icon is not null and p_icon !~ '^https://' then raise exception 'bad_icon'; end if;
  if aj_private.has_badword(p_name) or aj_private.has_badword(v_tag) or aj_private.has_badword(v_say) then raise exception 'badword'; end if;
  if v_say is not null and char_length(v_say) > 10 then v_say := left(v_say, 10); end if;
  if p_category is not null and p_category not in ('game','productivity','photo','life','health','edu','social','tools','money','fun','etc') then p_category := 'etc'; end if;
  insert into public.aj_apps(owner_id, platform, stage, store_key, url, name, icon_url, screenshots, countries, all_countries, tagline, say,
                             category, released_at, store_updated_at, meta_checked_at)
  values (uid, v->>'platform', v->>'stage', v->>'key', btrim(p_url), btrim(p_name), p_icon,
          coalesce((select array_agg(s) from unnest(p_screens) s where s ~ '^https://'), '{}')::text[],
          coalesce(p_countries, '{KR}'), coalesce(p_all_countries, false), v_tag, v_say,
          p_category, p_released, p_updated, now())
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.aj_add_app(text, text, text, text[], text[], boolean, text, text, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.aj_add_app(text, text, text, text[], text[], boolean, text, text, timestamptz, timestamptz, text) to authenticated;
