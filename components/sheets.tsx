'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp, errKey } from '@/lib/ctx';
import { sb, SUPABASE_URL, parseLink, flag, countryName, type App } from '@/lib/supabase';
import { useIconColor } from '@/lib/useIconColor';
import { AppIcon, Icon, PromiseChip, Sheet, Shots } from './ui';

/* ---------- 로그인 ---------- */
export function LoginSheet() {
  const { loginOpen, closeLogin, t } = useApp();
  const [skipUrl, setSkipUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!loginOpen) return;
    try { const p = JSON.parse(localStorage.getItem('aj_pending') || 'null'); setSkipUrl(p?.type === 'download' ? p.url : null); } catch { setSkipUrl(null); }
  }, [loginOpen]);

  const go = (provider: 'kakao' | 'google') =>
    sb().auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(location.pathname)}` } });

  return (
    <Sheet open={loginOpen} onClose={closeLogin} label={t.loginTitle}>
      <div className="sheet-head">
        <h2>{t.loginTitle}</h2>
        <button className="round" aria-label={t.close} onClick={closeLogin}>{Icon.close}</button>
      </div>
      <ul className="why">
        <li><span>{Icon.shake}</span>{t.loginWhy1}</li>
        <li><span>{Icon.bell}</span>{t.loginWhy2}</li>
        <li><span>{Icon.plus}</span>{t.loginWhy3}</li>
      </ul>
      <button className="btn kakao" onClick={() => go('kakao')}>
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24"><path d="M12 4C7 4 3 7.1 3 11c0 2.5 1.7 4.7 4.2 6l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.3 0 .7.1 1 .1 5 0 9-3.1 9-7s-4-7.3-9-7.3z" fill="#191919" /></svg>
        {t.loginKakao}
      </button>
      <button className="btn google" onClick={() => go('google')}>
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4" /><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853" /><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1A10 10 0 0 0 2 12c0 1.6.4 3.2 1.1 4.6L6.4 14z" fill="#FBBC05" /><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.8 9.4 6 12 6z" fill="#EA4335" /></svg>
        {t.loginGoogle}
      </button>
      {skipUrl && <a className="skip" href={skipUrl} target="_blank" rel="noopener noreferrer" onClick={closeLogin}>{t.loginSkip}</a>}
      <p className="fine">{t.loginNote}</p>
    </Sheet>
  );
}

/* ---------- 한 줄 피드백 ---------- */
export function FeedbackSheet() {
  const { feedbackApp: app, openFeedback, t, toast, session } = useApp();
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [pumasi, setPumasi] = useState(false);
  useEffect(() => {
    setText(''); setErr('');
    if (!app || !session) return;
    // 이 앱으로 열린 품앗이가 있는지 (점수 표시용)
    sb().from('aj_matches').select('id')
      .or(`and(user_a.eq.${session.user.id},app_a.eq.${app.id},a_result.is.null),and(user_b.eq.${session.user.id},app_b.eq.${app.id},b_result.is.null)`)
      .gt('due_at', new Date().toISOString()).limit(1)
      .then(({ data }) => setPumasi(!!data?.length));
  }, [app, session]);
  const c = useIconColor(app?.id || 'x', app?.icon_url);
  if (!app) return null;
  const send = async () => {
    setBusy(true); setErr('');
    const { data, error } = await sb().rpc('aj_leave_feedback', { p_app: app.id, p_body: text });
    setBusy(false);
    if (error) {
      const k = errKey(error);
      setErr(k === 'badword' ? t.fbBad : k === 'download_required' ? t.needDownload : k === 'already' ? t.already : t.errGeneric);
      return;
    }
    toast(data?.delta ? `${t.nKept} +${data.delta}` : t.fbSent);
    openFeedback(null);
  };
  return (
    <Sheet open onClose={() => openFeedback(null)} label={t.fbTitle} bg={c.bg}>
      <div className="sheet-head" style={{ color: c.ink }}>
        <div className="row gap12">
          <AppIcon src={app.icon_url} size={48} />
          <div><h2>{app.name}</h2><div className="sub">{app.owner?.nickname}</div></div>
        </div>
        <button className="round" aria-label={t.close} onClick={() => openFeedback(null)}>{Icon.close}</button>
      </div>
      <label className="sr" htmlFor="fb">{t.fbTitle}</label>
      <textarea id="fb" rows={3} maxLength={100} value={text} onChange={(e) => setText(e.target.value)} className={err ? 'bad' : ''} />
      <div className="fb-meta" style={{ color: c.ink }}><span className="err">{err}</span><span>{text.length} / 100</span></div>
      <div className="row gap10" style={{ color: c.ink }}>
        {pumasi ? <><PromiseChip value="+3" ink={c.ink} /><span className="sub">{t.fbPumasi}</span></>
                : <><span className="tag-free">{t.free}</span><span className="sub">{t.fbFree}</span></>}
        <button className="send" aria-label={t.send} disabled={!text.trim() || busy} onClick={send}>{Icon.send}</button>
      </div>
    </Sheet>
  );
}

/* ---------- 앱 올리기 ---------- */
type Meta = { name?: string; icon?: string; screenshots?: string[]; available?: boolean; needsManual?: boolean; countries?: string[]; allCountries?: boolean; countrySource?: 'store' | 'guess' };

export function UploadSheet({ onDone }: { onDone?: () => void }) {
  const { uploadOpen, setUploadOpen, t, country, locale, toast } = useApp();
  const [url, setUrl] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'bad' | 'dup'>('idle');
  const [meta, setMeta] = useState<Meta>({});
  const [dupApp, setDupApp] = useState<App | null>(null);
  const [name, setName] = useState('');
  const [world, setWorld] = useState(false);
  const [cc, setCc] = useState(country);
  const [busy, setBusy] = useState(false);
  const [editCc, setEditCc] = useState(false);
  const [tagline, setTagline] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (uploadOpen) { setUrl(''); setState('idle'); setMeta({}); setName(''); setCc(country); setWorld(false); setEditCc(false); setTagline(''); } }, [uploadOpen, country]);

  const check = (u: string) => {
    setUrl(u);
    if (timer.current) clearTimeout(timer.current);
    if (!u.trim()) { setState('idle'); return; }
    const p = parseLink(u);
    if (!p) { setState('bad'); return; }
    timer.current = setTimeout(async () => {
      setState('loading');
      const { data: existing } = await sb().rpc('aj_find_app_by_link', { p_url: u.trim() });
      if (existing) {
        const { data } = await sb().from('aj_apps').select('id, name, icon_url, screenshots, stage, owner:aj_profiles(nickname, score, avatar_url)').eq('id', existing).single();
        setDupApp(data as unknown as App); setState('dup'); return;
      }
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
    const countries = cc.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter((x) => /^[A-Z]{2}$/.test(x));
    const { error } = await sb().rpc('aj_add_app', {
      p_url: url.trim(), p_name: name.trim(), p_icon: meta.icon || null, p_screens: meta.screenshots || [],
      p_countries: countries.length ? countries : [country], p_all_countries: world, p_tagline: tagline.trim() || null,
    });
    setBusy(false);
    if (error) {
      const k = errKey(error);
      toast(k === 'badword' ? t.fbBad : k === 'app_limit' ? t.limit : k === 'duplicate' ? t.dup : k === 'bad_link' ? t.badLink : t.errGeneric);
      return;
    }
    setUploadOpen(false); onDone?.();
  };

  const p = parseLink(url);

  const status =
    state === 'loading' ? <span className="msg">{t.loading}</span> :
    state === 'bad' ? <span className="msg err">{t.badLink}</span> :
    state === 'dup' ? <span className="msg err">{t.dup}</span> :
    state === 'ok' && p ? (
      <span className={`msg ${meta.needsManual ? '' : 'ok'}`}>
        {meta.needsManual
          ? (p.stage === 'test' ? t.needsManual : t.loadFail)
          : `${p.platform === 'android' ? 'Google Play' : 'App Store'} · ${t.okLoaded}`}
      </span>
    ) : <span className="msg muted">{t.pasteHint}</span>;

  const paste = async () => {
    try { const txt = await navigator.clipboard.readText(); if (txt) check(txt.trim()); } catch { /* 권한 거절 */ }
  };

  return (
    <Sheet open={uploadOpen} onClose={() => setUploadOpen(false)} label={t.upload} tall>
      <div className="sheet-head">
        <h2>{t.upload}</h2>
        <button className="round" aria-label={t.close} onClick={() => setUploadOpen(false)}>{Icon.close}</button>
      </div>

      <div className={`field-wrap ${state === 'bad' || state === 'dup' ? 'bad' : ''}`}>
        <label className="sr" htmlFor="applink">{t.pasteLink}</label>
        <input id="applink" type="url" inputMode="url" placeholder={t.pasteLink} value={url} onChange={(e) => check(e.target.value)} />
        {url
          ? <button className="field-clear" aria-label={t.clear} onClick={() => check('')}>{Icon.close}</button>
          : <button className="field-action" onClick={paste}>{t.paste}</button>}
      </div>
      {status}

      {/* 미리보기 자리는 항상 같은 크기로 있어서 시트가 튀지 않아요 */}
      {state === 'dup' && dupApp ? (
        <>
          <div className="preview">
            <div className="pv-head">
              <AppIcon src={dupApp.icon_url} size={56} />
              <div className="grow"><div className="pv-name">{dupApp.name}</div></div>
            </div>
            {dupApp.screenshots?.length ? <Shots urls={dupApp.screenshots} height={220} /> : null}
          </div>
          <div className="row gap8">
            <a className="btn dark grow" href={`/app/${dupApp.id}`}>{t.dupSee}</a>
            <button className="btn soft auto" onClick={() => toast(t.dupMineNote)}>{Icon.flag} {t.dupMine}</button>
          </div>
        </>
      ) : state === 'ok' && p ? (
        <>
          {meta.needsManual && (
            <input className="field" placeholder={t.appName2} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <div className="preview">
            <div className="pv-head">
              <AppIcon src={meta.icon} size={56} />
              <div className="grow">
                <div className="pv-name">{name || t.appName2}</div>
                {tagline.trim() && <div className="pv-tagline">{tagline}</div>}
              </div>
            </div>
            <div className="d-chips flush">
              <span className="mini-chip">{p.platform === 'ios' ? t.ios : t.android} · {p.stage === 'live' ? t.live : t.test}</span>
              <span className="mini-chip">{world ? `🌐 ${t.worldwide}` : cc.split(/[,\s]+/).filter(Boolean).slice(0, 2).map((x) => `${flag(x.toUpperCase())} ${countryName(x.toUpperCase(), locale)}`).join(', ')}</span>
            </div>
            {meta.screenshots?.length ? <Shots urls={meta.screenshots} height={220} /> : null}
          </div>
          <label className="sr" htmlFor="tagline">{t.tagline}</label>
          <input id="tagline" className="field" placeholder={t.tagline} maxLength={60} value={tagline} onChange={(e) => setTagline(e.target.value)} />
          <div className="cc-box">
            <div className="row between gap12">
              <div className="grow sub small">{meta.countrySource === 'store' ? t.dataFromStore : meta.countrySource === 'guess' ? t.dataGuess : t.countries}</div>
              <button className="text-btn" onClick={() => setEditCc((v) => !v)}>{t.change}</button>
            </div>
            {editCc && (
              <div className="countries">
                <label className="row gap8"><input type="checkbox" checked={world} onChange={(e) => setWorld(e.target.checked)} /> {t.worldwide}</label>
                {!world && <input className="field" aria-label={t.countries} placeholder={t.countriesHint} value={cc} onChange={(e) => setCc(e.target.value)} />}
              </div>
            )}
          </div>
          <div className="honor">{Icon.shake}<span>{t.honor}</span></div>
          <button className="btn dark" disabled={busy || !name.trim()} onClick={submit}>{t.publish}</button>
        </>
      ) : (
        <div className={`preview skeleton ${state === 'loading' ? 'pulse' : ''}`} aria-hidden>
          <div className="pv-head">
            <span className="sk sk-icon" />
            <div className="grow"><span className="sk sk-line" /><span className="sk sk-line short" /></div>
          </div>
          <div className="sk-shots"><span className="sk" /><span className="sk" /><span className="sk" /></div>
        </div>
      )}
    </Sheet>
  );
}

