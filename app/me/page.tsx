'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, APP_FIELDS, flag, countryName, type App } from '@/lib/supabase';
import { AppIcon, Avatar, Icon } from '@/components/ui';
import { UploadSheet } from '@/components/sheets';
import { MyAppSheet } from '@/components/myapp-sheet';

const COUNTRIES = ['KR', 'US', 'JP', 'TW', 'VN', 'ID', 'TH', 'PH', 'IN', 'GB', 'DE', 'FR', 'CA', 'AU', 'BR', 'MX'];

export default function Me() {
  const { t, locale, session, profile, ready, openLogin, refreshProfile, setUploadOpen, setProfileOpen, toast } = useApp();
  const [apps, setApps] = useState<App[]>([]);
  const [editing, setEditing] = useState<App | null>(null);

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
  const lang = profile.locale.startsWith('ko') ? 'ko' : 'en';

  return (
    <div className="page">
      <div className="me-head">
        <Avatar src={profile.avatar_url} size={56} />
        <div className="me-name grow ellipsis">{profile.nickname}{profile.tag ? <span className="name-tag">#{profile.tag}</span> : null}</div>
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
        {apps.length === 0 && <div className="empty-hint"><b>{t.firstApp}</b><span>{t.firstAppSub}</span></div>}
        {apps.map((a) => (
          <button key={a.id} className="myapp" onClick={() => setEditing(a)} aria-label={`${a.name} ${t.editApp}`}>
            <AppIcon src={a.icon_url} size={48} />
            <span className="grow">
              <span className="ma-name">{a.name}</span>
              {a.tagline && <span className="ma-tagline">{a.tagline}</span>}
              <span className="ma-meta">
                {a.is_primary && <span className="star-mini">{Icon.star}{t.primary}</span>}
                {a.platform === 'ios' ? t.ios : t.android} · {a.stage === 'live' ? t.live : t.test} · {t.feedback} {a.feedback_count}
              </span>
            </span>
            <span className="chev">{Icon.chevRight}</span>
          </button>
        ))}
        {apps.length < 3 && <button className="addslot" onClick={() => setUploadOpen(true)}>{Icon.plus}{t.addByLink}</button>}
      </div>

      <div className="section-head"><h2 className="h2">{t.settings}</h2></div>
      <div className="settings">
        <label className="set-row">
          <span>{t.country}</span>
          <span className="set-val">{flag(profile.country)} {countryName(profile.country, locale)}{Icon.chevRight}</span>
          <select aria-label={t.country} value={profile.country} onChange={(e) => saveProfile({ country: e.target.value })}>
            {Array.from(new Set([profile.country, ...COUNTRIES])).map((c) => <option key={c} value={c}>{flag(c)} {countryName(c, locale)}</option>)}
          </select>
        </label>
        <label className="set-row">
          <span>{t.language}</span>
          <span className="set-val">{lang === 'ko' ? '한국어' : 'English'}{Icon.chevRight}</span>
          <select aria-label={t.language} value={lang} onChange={(e) => saveProfile({ locale: e.target.value })}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>

      <button className="link-btn" onClick={async () => { await sb().auth.signOut(); location.href = '/'; }}>{t.logout}</button>
      <UploadSheet onDone={loadApps} />
      <MyAppSheet app={editing} onClose={() => setEditing(null)} onChanged={loadApps} />
    </div>
  );
}
