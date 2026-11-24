// 앱줍줍: 스토어 링크로 앱 이름·아이콘·스크린샷·카테고리·출시일·업데이트일 불러오기. Supabase에 배포돼 있어요 (verify_jwt: false).
// { url, country } → 미리보기 정보
// { refresh: true } → 하루 넘게 안 본 앱의 카테고리·날짜를 스토어에서 다시 읽어 저장 (스토어 정보만 쓰므로 누가 불러도 안전)
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
type Parsed = { platform: 'android' | 'ios'; stage: 'live' | 'test'; key: string; id: string };
function parse(raw: string): Parsed | null {
  const u = (raw || '').trim();
  let m = u.match(/^https:\/\/play\.google\.com\/store\/apps\/details\?(?:.*&)?id=([A-Za-z0-9_.]+)/);
  if (m) return { platform: 'android', stage: 'live', key: 'play:' + m[1].toLowerCase(), id: m[1] };
  m = u.match(/^https:\/\/play\.google\.com\/apps\/(?:internal)?testing\/([A-Za-z0-9_.]+)/);
  if (m) return { platform: 'android', stage: 'test', key: 'play:' + m[1].toLowerCase(), id: m[1] };
  m = u.match(/^https:\/\/apps\.apple\.com\/.*?\/id([0-9]+)/);
  if (m) return { platform: 'ios', stage: 'live', key: 'ios:' + m[1], id: m[1] };
  m = u.match(/^https:\/\/testflight\.apple\.com\/join\/([A-Za-z0-9]+)/);
  if (m) return { platform: 'ios', stage: 'test', key: 'tf:' + m[1], id: m[1] };
  return null;
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/* ---------- 카테고리: 스토어마다 다른 이름을 앱줍줍 칸으로 ---------- */
// game · productivity · photo · life · health · edu · social · tools · money · fun · etc
const IOS_GENRE: Record<string, string> = {
  '6014': 'game', '6007': 'productivity', '6000': 'productivity', '6008': 'photo', '6027': 'photo',
  '6012': 'life', '6023': 'life', '6003': 'life', '6024': 'life', '6001': 'life', '6010': 'life',
  '6013': 'health', '6020': 'health', '6017': 'edu', '6018': 'edu', '6006': 'edu', '6026': 'tools',
  '6005': 'social', '6002': 'tools', '6015': 'money', '6016': 'fun', '6011': 'fun', '6004': 'fun', '6009': 'life',
};
function playCategory(c?: string) {
  if (!c) return null;
  if (c.startsWith('GAME')) return 'game';
  const map: Record<string, string> = {
    PRODUCTIVITY: 'productivity', BUSINESS: 'productivity', PHOTOGRAPHY: 'photo', VIDEO_PLAYERS: 'photo', ART_AND_DESIGN: 'photo',
    LIFESTYLE: 'life', FOOD_AND_DRINK: 'life', TRAVEL_AND_LOCAL: 'life', SHOPPING: 'life', HOUSE_AND_HOME: 'life', MAPS_AND_NAVIGATION: 'life',
    WEATHER: 'life', PARENTING: 'life', AUTO_AND_VEHICLES: 'life', DATING: 'social', EVENTS: 'life', BEAUTY: 'life',
    HEALTH_AND_FITNESS: 'health', MEDICAL: 'health', EDUCATION: 'edu', BOOKS_AND_REFERENCE: 'edu', LIBRARIES_AND_DEMO: 'tools',
    SOCIAL: 'social', COMMUNICATION: 'social', TOOLS: 'tools', PERSONALIZATION: 'tools', FINANCE: 'money',
    ENTERTAINMENT: 'fun', MUSIC_AND_AUDIO: 'fun', COMICS: 'fun', NEWS_AND_MAGAZINES: 'fun', SPORTS: 'fun',
  };
  return map[c] || 'etc';
}

/* ---------- 날짜 ---------- */
const MON: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function playDate(html: string, labels: string[]) {
  for (const l of labels) {
    const m = html.match(new RegExp(`${l}</div><div[^>]*>([^<]+)<`));
    if (!m) continue;
    const s = m[1].trim();
    let d = s.match(/^(\d{4})\. ?(\d{1,2})\. ?(\d{1,2})/);
    if (d) return new Date(Date.UTC(+d[1], +d[2] - 1, +d[3])).toISOString();
    d = s.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/);
    if (d && d[1] in MON) return new Date(Date.UTC(+d[3], MON[d[1]], +d[2])).toISOString();
  }
  return null;
}

/* ---------- 앱스토어 ---------- */
const CHECK = ['KR','US','JP','TW','HK','SG','VN','ID','TH','PH','MY','IN','GB','DE','FR','ES','IT','NL','CA','AU','NZ','BR','MX'];
// 앱스토어는 나라별 조회가 돼서 출시 나라를 자동으로 알아낼 수 있어요
async function appStoreCountries(id: string) {
  const res = await Promise.all(CHECK.map(async (c) => {
    try {
      const r = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=${c.toLowerCase()}`);
      const d = await r.json();
      return d?.resultCount > 0 ? c : null;
    } catch { return null; }
  }));
  const list = res.filter(Boolean) as string[];
  return { countries: list, allCountries: list.length >= CHECK.length - 2 };
}
async function appStore(id: string, country: string) {
  const r = await fetch(`https://itunes.apple.com/lookup?id=${id}&country=${country.toLowerCase()}`);
  const a = (await r.json())?.results?.[0];
  if (!a) return { available: false };
  const genre = String((a.genreIds as string[] | undefined)?.[0] || a.primaryGenreId || '');
  return {
    available: true, name: a.trackName as string, icon: (a.artworkUrl512 || a.artworkUrl100) as string,
    screenshots: ((a.screenshotUrls as string[]) || []).slice(0, 6),
    category: IOS_GENRE[genre] || 'etc',
    releasedAt: (a.releaseDate as string) || null, updatedAt: (a.currentVersionReleaseDate as string) || null,
  };
}

/* ---------- 구글 플레이 ---------- */
function meta(html: string, prop: string) {
  const m = html.match(new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]+)"`));
  return m ? m[1].replace(/&amp;/g, '&') : undefined;
}
async function playStore(pkg: string, country: string) {
  const r = await fetch(`https://play.google.com/store/apps/details?id=${pkg}&hl=ko&gl=${country}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36' },
  });
  if (r.status === 404) return { available: false };
  const html = await r.text();
  const title = meta(html, 'og:title')?.replace(/\s*-\s*Google Play.*$/, '');
  const icon = meta(html, 'og:image');
  const shots = new Set<string>();
  for (const m of html.matchAll(/<img[^>]+src="(https:\/\/play-lh\.googleusercontent\.com\/[^"=]+)[^"]*"[^>]*alt="[^"]*(?:스크린샷|Screenshot)[^"]*"/g)) {
    shots.add(m[1] + '=w720');
    if (shots.size >= 6) break;
  }
  return {
    available: !!title, name: title, icon, screenshots: [...shots],
    category: playCategory(html.match(/"applicationCategory":"([A-Z_]+)"/)?.[1]),
    releasedAt: playDate(html, ['출시일', 'Released on']),
    updatedAt: playDate(html, ['업데이트 날짜', 'Updated on']),
  };
}

async function lookup(p: Parsed, country: string) {
  if (p.platform === 'ios') return appStore(p.id, country);
  return playStore(p.id, country);
}

/* ---------- 저장된 앱 정보 새로 고치기 ---------- */
async function refresh() {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const since = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
  const { data } = await db.from('aj_apps').select('id, url, countries, all_countries')
    .or(`meta_checked_at.is.null,meta_checked_at.lt.${since}`).limit(20);
  let n = 0;
  for (const a of data || []) {
    const p = parse(a.url);
    const patch: Record<string, unknown> = { meta_checked_at: new Date().toISOString() };
    if (p && !(p.platform === 'ios' && p.stage === 'test')) {
      try {
        const cc = a.all_countries ? 'KR' : (a.countries?.[0] || 'KR');
        const info = await lookup(p, cc) as { category?: string | null; releasedAt?: string | null; updatedAt?: string | null };
        if (info.category) patch.category = info.category;
        if (info.releasedAt) patch.released_at = info.releasedAt;
        if (info.updatedAt) patch.store_updated_at = info.updatedAt;
      } catch { /* 다음에 다시 */ }
    }
    await db.from('aj_apps').update(patch).eq('id', a.id);
    n++;
  }
  return n;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let body: { url?: string; country?: string; refresh?: boolean };
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  if (body.refresh) return json({ refreshed: await refresh() });
  const p = parse(body.url || '');
  if (!p) return json({ error: 'bad_link' }, 400);
  const country = /^[A-Z]{2}$/.test(body.country || '') ? body.country! : 'KR';
  if (p.stage === 'test' && p.platform === 'ios') return json({ ...p, needsManual: true });
  try {
    if (p.platform === 'ios') {
      const [first, cc] = await Promise.all([appStore(p.id, country), appStoreCountries(p.id)]);
      const info = first.name || !cc.countries.length ? first : { ...(await appStore(p.id, cc.countries[0])), available: false };
      return json({ ...p, country, ...info, ...cc, countrySource: 'store', needsManual: !info.name });
    }
    const info = await playStore(p.id, country);
    if (p.stage === 'test' && !info.name) return json({ ...p, needsManual: true });
    // 구글 플레이는 출시 나라를 밖에서 알 수 없어서 전 세계로 시작해요
    return json({ ...p, country, ...info, countries: [], allCountries: true, countrySource: 'guess', needsManual: !info.name });
  } catch (_e) {
    return json({ ...p, country, needsManual: true });
  }
});
