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
    const info = p.platform === 'ios' ? await appStore(p.id, country) : await playStore(p.id, country);
    if (p.stage === 'test' && !info.name) return json({ ...p, needsManual: true });
    return json({ ...p, country, ...info, needsManual: !info.name });
  } catch (_e) {
    return json({ ...p, country, needsManual: true });
  }
});
