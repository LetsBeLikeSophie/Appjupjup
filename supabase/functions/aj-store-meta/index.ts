// 앱줍줍: 스토어 링크로 앱 이름·아이콘·스크린샷 불러오기 (읽기 전용). Supabase에 배포돼 있어요 (verify_jwt: false).
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
  return { available: true, name: a.trackName as string, icon: (a.artworkUrl512 || a.artworkUrl100) as string, screenshots: ((a.screenshotUrls as string[]) || []).slice(0, 6) };
}
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
  return { available: !!title, name: title, icon, screenshots: [...shots] };
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let body: { url?: string; country?: string };
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
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
