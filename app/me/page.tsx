'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, APP_FIELDS, cardColor, flag, type App } from '@/lib/supabase';
import { AppIcon, Avatar, Icon } from '@/components/ui';
import { UploadSheet } from '@/components/sheets';

const COUNTRIES = ['KR', 'US', 'JP', 'TW', 'VN', 'ID', 'TH', 'PH', 'IN', 'GB', 'DE', 'FR', 'CA', 'AU', 'BR', 'MX'];

export default function Me() {
  const { t, session, profile, ready, openLogin, refreshProfile, setUploadOpen, toast } = useApp();
  const [apps, setApps] = useState<App[]>([]);
  const [nick, setNick] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const loadApps = useCallback(() => {
    if (!session) return;
    sb().from('aj_apps').select(APP_FIELDS).eq('owner_id', session.user.id).order('created_at')
      .then(({ data }) => setApps((data as unknown as App[]) || []));
  }, [session]);
  useEffect(loadApps, [loadApps]);
  useEffect(() => { if (profile) setNick(profile.nickname); }, [profile]);

  if (ready && !session) {
    return (
      <div className="page">
        <h1 className="page-title">{t.me}</h1>
        <p className="sub">{t.guestMe}</p>
        <button className="btn dark" onClick={() => openLogin({ type: 'upload' })}>{t.login}</button>
      </div>
    );
  }
  if (!profile) return <div className="page sub">{t.loading}</div>;

  const upload = async (f: File) => {
    const ext = f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${profile.id}/avatar.${ext}`;
    const { error } = await sb().storage.from('aj-avatars').upload(path, f, { upsert: true, contentType: f.type });
    if (error) { toast(t.errGeneric); return; }
    const url = sb().storage.from('aj-avatars').getPublicUrl(path).data.publicUrl + `?v=${Date.now()}`;
    await sb().from('aj_profiles').update({ avatar_url: url }).eq('id', profile.id);
    refreshProfile();
  };
  const saveProfile = async (patch: Record<string, string>) => {
    const { error } = await sb().from('aj_profiles').update(patch).eq('id', profile.id);
    if (error) toast(t.errGeneric); else refreshProfile();
  };
  const makePrimary = async (id: string) => { await sb().rpc('aj_set_primary', { p_app: id }); loadApps(); };
  const remove = async (id: string) => { if (!confirm(t.remove + '?')) return; await sb().from('aj_apps').delete().eq('id', id); loadApps(); };

  return (
    <div className="page">
      <div className="row gap12">
        <button className="avatar-btn" aria-label={t.photoChange} onClick={() => file.current?.click()}>
          <Avatar src={profile.avatar_url} size={56} />
          <span className="cam">{Icon.camera}</span>
        </button>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <input className="nick" aria-label={t.nickname} value={nick} maxLength={20} onChange={(e) => setNick(e.target.value)}
          onBlur={() => nick.trim() && nick !== profile.nickname && saveProfile({ nickname: nick.trim() })} />
        </div>
      <div className="row gap8" style={{ marginTop: 12 }}>
        <select className="country" aria-label={t.country} value={profile.country} onChange={(e) => saveProfile({ country: e.target.value })}>
          {Array.from(new Set([profile.country, ...COUNTRIES])).map((c) => <option key={c} value={c}>{flag(c)} {c}</option>)}
        </select>
        <select className="country" aria-label={t.language} value={profile.locale.startsWith('ko') ? 'ko' : 'en'} onChange={(e) => saveProfile({ locale: e.target.value })}>
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="score-card">
        <div>
          <div className="sc-label">{Icon.shake}{t.score}</div>
          <div className="sc-num">{profile.score}</div>
        </div>
        <div className="sc-side">{t.start100}<br /><b>{t.kept} {profile.kept_count} · {t.missed} {profile.missed_count}</b></div>
      </div>

      <div className="row between pad-v"><h2 className="h2">{t.myApps}</h2><span className="sub">{apps.length} / 3</span></div>
      <div className="myapps">
        {apps.map((a) => {
          const c = cardColor(a.id);
          return (
            <div key={a.id} className={`myapp ${a.is_primary ? 'primary' : ''}`} style={{ background: c.bg, color: c.ink }}>
              <AppIcon src={a.icon_url} size={52} />
              <div className="grow"><div className="ma-name">{a.name}</div><div className="small bold">{a.stage === 'live' ? t.live : t.test} · {t.feedback} {a.feedback_count}</div></div>
              {a.is_primary
                ? <span className="badge">{Icon.star}{t.primary}</span>
                : <button className="round light" aria-label={t.makePrimary} onClick={() => makePrimary(a.id)}>{Icon.star}</button>}
              <button className="round light" aria-label={t.remove} onClick={() => remove(a.id)}>{Icon.close}</button>
            </div>
          );
        })}
        {apps.length < 3 && <button className="addslot" onClick={() => setUploadOpen(true)}>{Icon.plus}{t.addByLink}</button>}
      </div>

      <button className="link-btn" onClick={async () => { await sb().auth.signOut(); location.href = '/'; }}>{t.logout}</button>
      <UploadSheet onDone={loadApps} />
    </div>
  );
}
