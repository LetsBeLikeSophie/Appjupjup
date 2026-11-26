'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp, errKey } from '@/lib/ctx';
import { sb, SUPABASE_URL, parseLink, type App } from '@/lib/supabase';
import { AppIcon, Icon, IconButton, Shots } from './ui';
import { Sheet, SheetHeader } from './layout';
import { AppChips, CountryEditor, SayInput, parseCountries } from './app-parts';

/** 아이콘 몇 개를 살짝 겹쳐 놓은 그림 (로그인·첫 입장) */
function IconPile({ apps }: { apps: Pick<App, 'id' | 'icon_url'>[] }) {
  const tilts = [-10, 5, 9];
  return (
    <div className="pile" aria-hidden>
      {apps.slice(0, 3).map((a, i) => <AppIcon key={a.id} src={a.icon_url} size={i === 1 ? 64 : 54} tilt={tilts[i]} />)}
    </div>
  );
}

/* ---------- 첫 입장: 앱 만들어요 / 구경할래요 ---------- */
export function WelcomeSheet({ sample, force }: { sample: Pick<App, 'id' | 'icon_url'>[]; force?: boolean }) {
  const { welcomeOpen, closeWelcome, t } = useApp();
  if (!welcomeOpen && !force) return null;
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-label={t.appName}>
      <h1 className="t-title">{t.appName}</h1>
      <button className="choice" onClick={() => closeWelcome(true)}>
        <span className="choice-ics"><span className="add-icon">{Icon.plus}</span></span>
        <b className="t-name">{t.welcomeDev}</b>
      </button>
      <button className="choice" onClick={() => closeWelcome(false)}>
        <IconPile apps={sample} />
        <b className="t-name">{t.welcomeLook}</b>
      </button>
    </div>
  );
}

/* ---------- 로그인 ---------- */
export function LoginSheet({ sample, force }: { sample: Pick<App, 'id' | 'icon_url'>[]; force?: boolean }) {
  const { loginOpen: open, closeLogin, t } = useApp();
  const loginOpen = open || !!force;
  const [skipUrl, setSkipUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!loginOpen) return;
    try { const p = JSON.parse(localStorage.getItem('aj_pending') || 'null'); setSkipUrl(p?.type === 'download' ? p.url : null); } catch { setSkipUrl(null); }
  }, [loginOpen]);

  const go = (provider: 'kakao' | 'google') =>
    sb().auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(location.pathname)}` } });

  return (
    <Sheet open={loginOpen} onClose={closeLogin} label={t.loginTitle}>
      <IconPile apps={sample} />
      <h2 className="t-name" style={{ textAlign: 'center' }}>{t.loginTitle}</h2>
      <button className="btn kakao" onClick={() => go('kakao')}>
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24"><path d="M12 4C7 4 3 7.1 3 11c0 2.5 1.7 4.7 4.2 6l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.3 0 .7.1 1 .1 5 0 9-3.1 9-7s-4-7.3-9-7.3z" fill="#191919" /></svg>
        {t.loginKakao}
      </button>
      <button className="btn soft" onClick={() => go('google')}>
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4" /><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853" /><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1A10 10 0 0 0 2 12c0 1.6.4 3.2 1.1 4.6L6.4 14z" fill="#FBBC05" /><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.8 9.4 6 12 6z" fill="#EA4335" /></svg>
        {t.loginGoogle}
      </button>
      {skipUrl && <a className="sheet-skip" href={skipUrl} target="_blank" rel="noopener noreferrer" onClick={closeLogin}>{t.loginSkip}</a>}
      <p className="t-sub" style={{ textAlign: 'center' }}>{t.loginNote}</p>
    </Sheet>
  );
}

/* ---------- 앱 올리기: 링크만 붙이면 나머지는 자동 ---------- */
type Meta = {
  name?: string; icon?: string; screenshots?: string[]; needsManual?: boolean; countries?: string[]; allCountries?: boolean;
  category?: string | null; releasedAt?: string | null; updatedAt?: string | null;
};

export function UploadSheet() {
  const { uploadOpen, setUploadOpen, t, country, toast, refreshMine } = useApp();
  const [url, setUrl] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'bad' | 'dup'>('idle');
  const [meta, setMeta] = useState<Meta>({});
  const [dupId, setDupId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [world, setWorld] = useState(false);
  const [cc, setCc] = useState(country);
  const [editCc, setEditCc] = useState(false);
  const [tagline, setTagline] = useState('');
  const [say, setSay] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (uploadOpen) { setUrl(''); setState('idle'); setMeta({}); setName(''); setCc(country); setWorld(false); setEditCc(false); setTagline(''); } }, [uploadOpen, country]);

  const check = (u: string) => {
    setUrl(u);
    if (timer.current) clearTimeout(timer.current);
    if (!u.trim()) { setState('idle'); return; }
    if (!parseLink(u)) { setState('bad'); return; }
    timer.current = setTimeout(async () => {
      setState('loading');
      const { data: existing } = await sb().rpc('aj_find_app_by_link', { p_url: u.trim() });
      if (existing) { setDupId(existing as string); setState('dup'); return; }
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/aj-store-meta`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u.trim(), country }),
        });
        const m = (await r.json()) as Meta;
        setMeta(m); setName(m.name || '');
        if (m.allCountries) setWorld(true);
        else if (m.countries?.length) { setWorld(false); setCc(m.countries.join(', ')); }
      } catch { setMeta({ needsManual: true }); }
      setState('ok');
    }, 400);
  };

  const submit = async () => {
    setBusy(true);
    const countries = parseCountries(cc);
    const { error } = await sb().rpc('aj_add_app', {
      p_url: url.trim(), p_name: name.trim(), p_icon: meta.icon || null, p_screens: meta.screenshots || [],
      p_countries: countries.length ? countries : [country], p_all_countries: world, p_tagline: tagline.trim() || null, p_say: say.trim() || null,
      p_category: meta.category || null, p_released: meta.releasedAt || null, p_updated: meta.updatedAt || null,
    });
    setBusy(false);
    if (error) {
      const k = errKey(error);
      toast(k === 'need_tickets' ? `🎫2${t.needT}` : k === 'badword' ? t.fbBad : k === 'app_limit' ? t.limit : k === 'duplicate' ? t.dup : k === 'bad_link' ? t.badLink : t.errGeneric);
      return;
    }
    setUploadOpen(false); refreshMine();
  };

  const p = parseLink(url);
  const paste = async () => { try { const txt = await navigator.clipboard.readText(); if (txt) check(txt.trim()); } catch { /* 권한 거절 */ } };
  const msg = state === 'bad' ? t.badLink : state === 'dup' ? t.dup : state === 'ok' && meta.needsManual ? t.loadFail : null;

  return (
    <Sheet open={uploadOpen} onClose={() => setUploadOpen(false)} label={t.upload} tall>
      <SheetHeader title={t.upload} onClose={() => setUploadOpen(false)} />
      <div className="form">
        <div className={`field-wrap ${state === 'bad' || state === 'dup' ? 'bad' : ''}`}>
          <label className="sr" htmlFor="applink">{t.pasteLink}</label>
          <input id="applink" type="url" inputMode="url" placeholder={t.pasteLink} value={url} onChange={(e) => check(e.target.value)} />
          {url
            ? <IconButton label={t.clear} onClick={() => check('')}>{Icon.close}</IconButton>
            : <button className="btn-sm primary" onClick={paste}>{t.paste}</button>}
        </div>
        {msg && <span className={`msg ${state === 'ok' ? '' : 'err'}`}>{msg}</span>}
      </div>

      {state === 'dup' && dupId ? (
        <a className="btn soft" href={`/app/${dupId}`}>{t.dupSee}</a>
      ) : state === 'ok' && p ? (
        <>
          {meta.needsManual && <input className="field" placeholder={t.appName2} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />}
          <div className="preview">
            <AppIcon src={meta.icon} size={80} />
            <b className="t-card">{name || t.appName2}</b>
            <AppChips app={{ platform: p.platform, stage: p.stage, all_countries: world, countries: parseCountries(cc), category: meta.category || null }} tone="white" />
            {meta.screenshots?.length ? <Shots urls={meta.screenshots} height={160} /> : null}
            <button className="btn-sm ghost" onClick={() => setEditCc((v) => !v)}>{t.countries}{Icon.chevRight}</button>
          </div>
          {editCc && <div className="form"><CountryEditor world={world} setWorld={setWorld} cc={cc} setCc={setCc} /></div>}
          <label className="sr" htmlFor="tagline">{t.tagline}</label>
          <input id="tagline" className="field" placeholder={t.tagline} maxLength={60} value={tagline} onChange={(e) => setTagline(e.target.value)} />
          <SayInput id="say" value={say} onChange={setSay} />
          <div className="sheet-foot">
            <button className="btn primary" disabled={busy || !name.trim()} onClick={submit}>{t.publish}</button>
          </div>
        </>
      ) : (
        <div className={`preview ${state === 'loading' ? 'pulse' : ''}`} aria-hidden>
          <span className="sk" style={{ width: 80, height: 80, borderRadius: 19 }} />
          <span className="sk sk-line short" />
          <div className="sk-shots"><span className="sk" /><span className="sk" /><span className="sk" /></div>
        </div>
      )}
    </Sheet>
  );
}
