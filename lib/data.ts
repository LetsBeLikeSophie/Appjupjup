import { sb, APP_FIELDS, LIST_FIELDS, COMMENT_FIELDS, hash, type App, type Comment } from './supabase';

/** 하루 동안은 같은 순서, 날마다 섞여요 (모든 앱이 골고루 위에 오게) */
export function dailyShuffle<T extends { id: string }>(list: T[]) {
  const day = new Date().toISOString().slice(0, 10);
  return [...list].sort((a, b) => hash(a.id + day) - hash(b.id + day));
}

/** 내 나라에서 받을 수 있는 앱. 못 읽으면 throw (빈 목록과 나누려고) */
export async function loadApps(country: string) {
  // 최근 120개 (정렬 없이 limit 하면 어느 120개인지 매번 달라질 수 있음)
  const { data, error } = await sb().from('aj_apps').select(LIST_FIELDS)
    .or(`all_countries.eq.true,countries.cs.{${country}}`).order('created_at', { ascending: false }).limit(120);
  if (error) throw error;
  return dailyShuffle((data as unknown as App[]) || []);
}

/** 앱 하나. 없으면 null, 못 읽으면 throw */
export async function loadApp(id: string) {
  const { data, error } = await sb().from('aj_apps').select(APP_FIELDS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as App | null;
}

export async function loadComments(appId: string) {
  const { data } = await sb().from('aj_feedback').select(COMMENT_FIELDS).eq('app_id', appId).order('created_at', { ascending: true }).limit(100);
  return (data as unknown as Comment[]) || [];
}
