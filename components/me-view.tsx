'use client';
import { useApp } from '@/lib/ctx';
import { flag, countryName, type App, type Profile } from '@/lib/supabase';
import { AppIcon, Avatar, Icon, NameTag } from './ui';
import { Empty, ListRow, Page, Section } from './layout';

const COUNTRIES = ['KR', 'US', 'JP', 'TW', 'VN', 'ID', 'TH', 'PH', 'IN', 'GB', 'DE', 'FR', 'CA', 'AU', 'BR', 'MX'];

export function ScoreCard({ profile }: { profile: Profile }) {
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

/** 내 정보 화면 그리기 (데이터는 page에서) */
export function MeView({ profile, apps, onEditApp, onUpload, onEditProfile, onSave, onLogout }: {
  profile: Profile; apps: App[]; onEditApp: (a: App) => void; onUpload: () => void; onEditProfile: () => void;
  onSave: (patch: Record<string, string>) => void; onLogout: () => void;
}) {
  const { t, locale } = useApp();
  const lang = profile.locale.startsWith('ko') ? 'ko' : 'en';
  return (
    <Page>
      <div className="me-head">
        <Avatar src={profile.avatar_url} size={56} />
        <div className="t-name grow ellipsis"><NameTag name={profile.nickname} tag={profile.tag} /></div>
        <button className="btn-sm white" onClick={onEditProfile}>{t.edit}</button>
      </div>

      <ScoreCard profile={profile} />

      <Section title={t.myApps} aside={<span className="t-sub">{apps.length} / 3</span>}>
        <div className="list">
          {apps.length === 0 && <Empty title={t.firstApp}>{t.firstAppSub}</Empty>}
          {apps.map((a) => <MyAppRow key={a.id} app={a} onOpen={() => onEditApp(a)} />)}
          {apps.length < 3 && <button className="add-slot" onClick={onUpload}>{Icon.plus}{t.addByLink}</button>}
        </div>
      </Section>

      <Section title={t.settings}>
        <div className="settings">
          <SelectRow label={t.country} value={profile.country} current={`${flag(profile.country)} ${countryName(profile.country, locale)}`}
            options={Array.from(new Set([profile.country, ...COUNTRIES])).map((c) => ({ value: c, label: `${flag(c)} ${countryName(c, locale)}` }))}
            onChange={(v) => onSave({ country: v })} />
          <SelectRow label={t.language} value={lang} current={lang === 'ko' ? '한국어' : 'English'}
            options={[{ value: 'ko', label: '한국어' }, { value: 'en', label: 'English' }]}
            onChange={(v) => onSave({ locale: v })} />
        </div>
      </Section>

      <button className="link-btn" onClick={onLogout}>{t.logout}</button>
    </Page>
  );
}
