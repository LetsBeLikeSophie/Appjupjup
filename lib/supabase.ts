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
  score: number;
  grace_left: number;
  kept_count: number;
  missed_count: number;
  country: string;
  locale: string;
  setup_done: boolean;
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
  feedback_count: number;
  countries: string[];
  all_countries: boolean;
  created_at: string;
  owner?: Pick<Profile, 'nickname' | 'score' | 'avatar_url'> | null;
};

export type Feedback = {
  id: string;
  app_id: string;
  author_id: string;
  kind: 'pumasi' | 'free';
  body: string;
  helpful_count: number;
  created_at: string;
  author?: Pick<Profile, 'nickname' | 'avatar_url'> | null;
};

export type Notice = {
  id: string;
  kind: 'got' | 'matched' | 'feedback' | 'kept' | 'missed' | 'grace';
  body: string | null;
  delta: number | null;
  read_at: string | null;
  created_at: string;
  app_id: string | null;
  match_id: string | null;
  actor?: Pick<Profile, 'nickname' | 'avatar_url'> | null;
  app?: Pick<App, 'id' | 'name' | 'icon_url'> | null;
  match?: { due_at: string; a_result: string | null; b_result: string | null; user_a: string } | null;
};

export const APP_FIELDS =
  'id, owner_id, platform, stage, url, name, icon_url, screenshots, is_primary, feedback_count, countries, all_countries, created_at, owner:aj_profiles(nickname, score, avatar_url)';

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
