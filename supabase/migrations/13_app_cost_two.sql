-- 11-26 소피 확정: 앱 하나 = 🎫2 (첫 앱도), 가입하면 🎫2
alter table public.aj_profiles alter column tickets set default 2;
-- 아직 앱 없는 사람은 첫 앱을 바로 올릴 수 있게 🎫2까지 채움
update public.aj_profiles p set tickets = 2 where p.tickets < 2 and not exists (select 1 from public.aj_apps a where a.owner_id = p.id);

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
  if v_tickets < 2 then raise exception 'need_tickets'; end if;
  update public.aj_profiles set tickets = tickets - 2 where id = uid;
  insert into public.aj_apps(owner_id, platform, stage, store_key, url, name, icon_url, screenshots, countries, all_countries, tagline, say,
                             category, released_at, store_updated_at, meta_checked_at)
  values (uid, v->>'platform', v->>'stage', v->>'key', btrim(p_url), btrim(p_name), p_icon,
          coalesce((select array_agg(s) from unnest(p_screens) s where s ~ '^https://'), '{}')::text[],
          coalesce(p_countries, '{KR}'), coalesce(p_all_countries, false), v_tag, v_say,
          p_category, p_released, p_updated, now())
  returning id into v_id;
  return v_id;
end $$;
