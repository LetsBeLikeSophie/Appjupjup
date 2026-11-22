'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, APP_FIELDS, flag, countryName, type App } from '@/lib/supabase';
import { AppIcon, Avatar, Icon } from '@/components/ui';
import { UploadSheet } from '@/components/sheets';

const COUNTRIES = ['KR', 'US', 'JP', 'TW', 'VN', 'ID', 'TH', 'PH', 'IN', 'GB', 'DE', 'FR', 'CA', 'AU', 'BR', 'MX'];

export default function Me() {
  const { t, locale, session, profile, ready, openLogin, refreshProfile, setUploadOpen, setProfileOpen, toast } = useApp();
  const [apps, setApps] = useState<App[]>([]);

  const loadApps = useCallback(() => {
    if (!session) return;
    sb().from('aj_apps').select(APP_FIELDS).eq('owner_id', session.user.id).order('created_at')
      .then(({ data }) => setApps((data as unknown as App[]) || []));
  }, [session]);
  useEffect(loadApps, [loadApps]);

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

  const saveProfile = async (patch: Record<string, string>) => {
    const { error } = await sb().from('aj_profiles').update(patch).eq('id', profile.id);
    if (error) toast(t.errGeneric); else refreshProfile();
  };
  const makePrimary = async (id: string) => { await sb().rpc('aj_set_primary', { p_app: id }); loadApps(); };
  const remove = async (a: App) => {
    if (!confirm(`${a.name}\n${t.remove}?`)) return;
    await sb().from('aj_apps').delete().eq('id', a.id);
    loadApps();
  };

  return (
    <div className="page">
      <div className="me-head">
        <Avatar src={profile.avatar_url} size={64} />
        <div className="grow">
          <div className="me-name ellipsis">{profile.nickname}{profile.tag ? <span className="name-tag">#{profile.tag}</span> : null}</div>
          <div className="row gap6" style={{ marginTop: 8 }}>
            <select className="chip-select" aria-label={t.country} value={profile.country} onChange={(e) => saveProfile({ country: e.target.value })}>
              {Array.from(new Set([profile.country, ...COUNTRIES])).map((c) => <option key={c} value={c}>{flag(c)} {countryName(c, locale)}</option>)}
            </select>
            <select className="chip-select" aria-label={t.language} value={profile.locale.startsWith('ko') ? 'ko' : 'en'} onChange={(e) => saveProfile({ locale: e.target.value })}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        <button className="chip-btn soft" onClick={() => setProfileOpen(true)}>{t.edit}</button>
      </div>

      <div className="score-card">
        <div>
          <div className="sc-label">{Icon.shake}{t.score}</div>
          <div className="sc-num">{profile.score}</div>
        </div>
        <div className="sc-side">{t.start100}<br /><b>{t.kept} {profile.kept_count} · {t.missed} {profile.missed_count}</b></div>
      </div>

      <div className="section-head"><h2 className="h2">{t.myApps}</h2><span className="sub">{apps.length} / 3</span></div>
      <div className="myapps">
        {apps.map((a) => (
          <div key={a.id} className="myapp">
            <AppIcon src={a.icon_url} size={56} />
            <div className="grow">
              <div className="ma-name">{a.name}</div>
              {a.tagline && <div className="ma-tagline">{a.tagline}</div>}
              <div className="ma-meta">
                {a.platform === 'ios' ? t.ios : t.android} · {a.stage === 'live' ? t.live : t.test} · {t.feedback} {a.feedback_count}
              </div>
              <div className="ma-actions">
                {a.is_primary
                  ? <span className="badge">{Icon.star}{t.primary}</span>
                  : <button className="text-btn" onClick={() => makePrimary(a.id)}>{Icon.star}{t.makePrimary}</button>}
                <button className="text-btn muted" onClick={() => remove(a)}>{t.remove}</button>
              </div>
            </div>
          </div>
        ))}
        {apps.length === 0 && (
          <div className="empty-hint"><b>{t.firstApp}</b><span>{t.firstAppSub}</span></div>
        )}
        {apps.length < 3 && <button className="addslot" onClick={() => setUploadOpen(true)}>{Icon.plus}{t.addByLink}</button>}
      </div>

      <button className="link-btn" onClick={async () => { await sb().auth.signOut(); location.href = '/'; }}>{t.logout}</button>
      <UploadSheet onDone={loadApps} />
    </div>
  );
}
