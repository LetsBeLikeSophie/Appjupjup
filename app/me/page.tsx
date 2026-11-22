'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, APP_FIELDS, flag, countryName, type App, type Profile } from '@/lib/supabase';
import { AppIcon, Avatar, Icon, NameTag } from '@/components/ui';
import { Empty, GuestGate, ListRow, Loading, Page, Section } from '@/components/layout';
import { UploadSheet } from '@/components/sheets';
import { MyAppSheet } from '@/components/myapp-sheet';

const COUNTRIES = ['KR', 'US', 'JP', 'TW', 'VN', 'ID', 'TH', 'PH', 'IN', 'GB', 'DE', 'FR', 'CA', 'AU', 'BR', 'MX'];

function ScoreCard({ profile }: { profile: Profile }) {
  const { t } = useApp();
  return (
    <div className="score-card">
      <div>
        <div className="score-label">{Icon.shake}{t.score}</div>
        <div className="score-num">{profile.score}</div>
      </div>
      <div className="score-side">{t.start100}<br /><b>{t.kept} {profile.kept_count} · {t.missed} {profile.missed_count}</b></div>
    </div>
  );
}

function MyAppRow({ app, onOpen }: { app: App; onOpen: () => void }) {
  const { t } = useApp();
  return (
    <ListRow
      onClick={onOpen} label={`${app.name} ${t.editApp}`} chevron
      leading={<AppIcon src={app.icon_url} size={48} />}
      title={<b className="t-card">{app.name}</b>}
      sub={app.tagline}
      meta={
        <span className="row gap6">
          {app.is_primary && <span className="star-mini">{Icon.star}{t.primary}</span>}
          <span className="ellipsis">{app.platform === 'ios' ? t.ios : t.android} · {app.stage === 'live' ? t.live : t.test} · {t.feedback} {app.feedback_count}</span>
        </span>
      }
    />
  );
}

/** 설정 한 줄: 누르면 OS 선택창이 떠요 */
function SelectRow({ label, value, current, options, onChange }: { label: string; value: string; current: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <label className="set-row">
      <span>{label}</span>
      <span className="set-val">{current}{Icon.chevRight}</span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

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

  if (ready && !session) return <GuestGate title={t.me} onLogin={() => openLogin({ type: 'upload' })} />;
  if (!profile) return <Loading />;

  const saveProfile = async (patch: Record<string, string>) => {
    const { error } = await sb().from('aj_profiles').update(patch).eq('id', profile.id);
    if (error) toast(t.errGeneric); else refreshProfile();
  };
  const lang = profile.locale.startsWith('ko') ? 'ko' : 'en';

  return (
    <Page>
      <div className="me-head">
        <Avatar src={profile.avatar_url} size={56} />
        <div className="t-name grow ellipsis"><NameTag name={profile.nickname} tag={profile.tag} /></div>
        <button className="btn-sm white" onClick={() => setProfileOpen(true)}>{t.edit}</button>
      </div>

      <ScoreCard profile={profile} />

      <Section title={t.myApps} aside={<span className="t-sub">{apps.length} / 3</span>}>
        <div className="list">
          {apps.length === 0 && <Empty title={t.firstApp}>{t.firstAppSub}</Empty>}
          {apps.map((a) => <MyAppRow key={a.id} app={a} onOpen={() => setEditing(a)} />)}
          {apps.length < 3 && <button className="add-slot" onClick={() => setUploadOpen(true)}>{Icon.plus}{t.addByLink}</button>}
        </div>
      </Section>

      <Section title={t.settings}>
        <div className="settings">
          <SelectRow label={t.country} value={profile.country} current={`${flag(profile.country)} ${countryName(profile.country, locale)}`}
            options={Array.from(new Set([profile.country, ...COUNTRIES])).map((c) => ({ value: c, label: `${flag(c)} ${countryName(c, locale)}` }))}
            onChange={(v) => saveProfile({ country: v })} />
          <SelectRow label={t.language} value={lang} current={lang === 'ko' ? '한국어' : 'English'}
            options={[{ value: 'ko', label: '한국어' }, { value: 'en', label: 'English' }]}
            onChange={(v) => saveProfile({ locale: v })} />
        </div>
      </Section>

      <button className="link-btn" onClick={async () => { await sb().auth.signOut(); location.href = '/'; }}>{t.logout}</button>
      <UploadSheet onDone={loadApps} />
      <MyAppSheet app={editing} onClose={() => setEditing(null)} onChanged={loadApps} />
    </Page>
  );
}
