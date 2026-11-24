import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

let client: SupabaseClient | null = null;

export function sb(): SupabaseClient {
  if (!client) client = createBrowserClient(SUPABASE_URL, KEY) as unknown as SupabaseClient;
  return client;
}

export type Profile = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  /** 온도: 100에서 시작, 깎이지 않아요 */
  score: number;
  country: string;
  locale: string;
  setup_done: boolean;
  tag: number | null;
};

/** 화면에 보이는 "나": 대표 앱이 있으면 그 앱, 없으면 줍줍이 #태그 */
export type Person = Pick<Profile, 'id' | 'nickname' | 'tag' | 'score'> & {
  apps?: Pick<App, 'id' | 'name' | 'icon_url' | 'is_primary'>[] | null;
};

export type App = {
  id: string;
  owner_id: string;
  platform: 'android' | 'ios';
  stage: 'live' | 'test';
  url: string;
  name: string;
  icon_url: string | null;
  screenshots: string[];
  is_primary: boolean;
  /** 댓글 수 */
  feedback_count: number;
  countries: string[];
  all_countries: boolean;
  tagline: string | null;
  category: string | null;
  released_at: string | null;
  store_updated_at: string | null;
  created_at: string;
  owner?: Person | null;
};

export type Comment = {
  id: string;
  app_id: string;
  author_id: string;
  body: string;
  helpful_count: number;
  created_at: string;
  author?: Person | null;
};

export type Notice = {
  id: string;
  kind: 'got' | 'comment' | 'helpful' | 'visit' | string;
  body: string | null;
  delta: number | null;
  read_at: string | null;
  created_at: string;
  app_id: string | null;
  actor?: Person | null;
  app?: Pick<App, 'id' | 'name' | 'icon_url' | 'owner_id'> | null;
};

export const PERSON = 'id, nickname, tag, score, apps:aj_apps(id, name, icon_url, is_primary)';
export const APP_FIELDS =
  `id, owner_id, platform, stage, url, name, icon_url, screenshots, is_primary, feedback_count, countries, all_countries, tagline, category, released_at, store_updated_at, created_at, owner:aj_profiles(${PERSON})`;
export const COMMENT_FIELDS = `id, app_id, author_id, body, helpful_count, created_at, author:aj_profiles(${PERSON})`;

/** 대표 앱 (없으면 첫 앱) */
export function primaryApp(p?: Person | null) {
  const list = p?.apps || [];
  return list.find((a) => a.is_primary) || list[0] || null;
}

/** 출시(또는 앱줍줍에 올라온 지) 14일 안 */
export function isFresh(a: Pick<App, 'released_at' | 'created_at'>) {
  const t = new Date(a.released_at || a.created_at).getTime();
  return Date.now() - t < 14 * 86400000;
}

/** 문자열 → 고정된 숫자 (자리·기울기를 앱마다 고정) */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** 스토어 링크 판별 (DB의 aj_parse_link와 같은 규칙) */
export function parseLink(raw: string) {
  const u = (raw || '').trim();
  let m = u.match(/^https:\/\/play\.google\.com\/store\/apps\/details\?(?:.*&)?id=([A-Za-z0-9_.]+)/);
  if (m) return { platform: 'android' as const, stage: 'live' as const, key: 'play:' + m[1].toLowerCase() };
  m = u.match(/^https:\/\/play\.google\.com\/apps\/(?:internal)?testing\/([A-Za-z0-9_.]+)/);
  if (m) return { platform: 'android' as const, stage: 'test' as const, key: 'play:' + m[1].toLowerCase() };
  m = u.match(/^https:\/\/apps\.apple\.com\/.*?\/id([0-9]+)/);
  if (m) return { platform: 'ios' as const, stage: 'live' as const, key: 'ios:' + m[1] };
  m = u.match(/^https:\/\/testflight\.apple\.com\/join\/([A-Za-z0-9]+)/);
  if (m) return { platform: 'ios' as const, stage: 'test' as const, key: 'tf:' + m[1] };
  return null;
}

export function devicePlatform(): 'android' | 'ios' | 'all' {
  if (typeof navigator === 'undefined') return 'all';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'all';
}

const PALETTE = [
  { bg: '#E8C27A', ink: '#4A3410' },
  { bg: '#C3B8D8', ink: '#3A2E55' },
  { bg: '#A6D2CC', ink: '#134A44' },
  { bg: '#DDA8AE', ink: '#5A2228' },
  { bg: '#CFD79E', ink: '#3B4214' },
  { bg: '#B4C2B9', ink: '#233329' },
];
/** 아이콘 색을 뽑기 전까지 쓰는 카드 색 (앱 id로 고정) */
export function cardColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function flag(cc: string) {
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/** 나라 코드를 그 언어의 나라 이름으로 (KR → 대한민국 / South Korea) */
export function countryName(cc: string, locale: string) {
  try { return new Intl.DisplayNames([locale], { type: 'region' }).of(cc) || cc; } catch { return cc; }
}
