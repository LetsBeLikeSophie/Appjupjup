import { sb, APP_FIELDS, COMMENT_FIELDS, hash, type App, type Comment } from './supabase';

/** 하루 동안은 같은 순서, 날마다 섞여요 (모든 앱이 골고루 위에 오게) */
export function dailyShuffle<T extends { id: string }>(list: T[]) {
  const day = new Date().toISOString().slice(0, 10);
  return [...list].sort((a, b) => hash(a.id + day) - hash(b.id + day));
}

/** 내 나라에서 받을 수 있는 앱 */
export async function loadApps(country: string) {
  const { data } = await sb().from('aj_apps').select(APP_FIELDS)
    .or(`all_countries.eq.true,countries.cs.{${country}}`).limit(120);
  return dailyShuffle((data as unknown as App[]) || []);
}

export async function loadApp(id: string) {
  const { data } = await sb().from('aj_apps').select(APP_FIELDS).eq('id', id).maybeSingle();
  return data as unknown as App | null;
}

export async function loadComments(appId: string) {
  const { data } = await sb().from('aj_feedback').select(COMMENT_FIELDS).eq('app_id', appId).order('created_at', { ascending: true }).limit(100);
  return (data as unknown as Comment[]) || [];
}
