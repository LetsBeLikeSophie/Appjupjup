'use client';
import { useApp } from '@/lib/ctx';
import { flag, countryName, type App, type Profile } from '@/lib/supabase';
import { Icon, IconButton, Temp, WhoIcon, WhoName } from './ui';
import { Page, Section, Sheet, SheetHeader } from './layout';
import { AppTile } from './app-parts';
import { APP_COST, PointsCard, TestSections, Ticket, type TestData } from './test-view';

type Lite = Pick<App, 'id' | 'name' | 'icon_url'>;

/** 내 정보 그리기 (데이터는 page에서) */
export function MeView({ profile, apps, gotApps, commentCount, onEditApp, onUpload, onSettings, test }: {
  profile: Profile; apps: App[]; gotApps: Lite[]; commentCount: number; test?: TestData;
  onEditApp: (a: App) => void; onUpload: () => void; onSettings: () => void;
}) {
  const { t, toast } = useApp();
  const who = { id: profile.id, nickname: profile.nickname, tag: profile.tag, score: profile.score, apps };
  return (
    <Page title={t.me} action={<IconButton label={t.settings} tone="white" onClick={onSettings}>{Icon.gear}</IconButton>}>
      <div className="tiles">
        {apps.length === 0 && <span className="tile"><WhoIcon who={who} size={64} /><span className="tile-name"><WhoName who={who} /></span></span>}
        {apps.map((a) => <AppTile key={a.id} app={a} size={64} star={a.is_primary && apps.length > 1} onClick={() => onEditApp(a)} />)}
        {apps.length < 3 && (
          <button className="tile" onClick={() => (test && apps.length > 0 && test.points < APP_COST ? toast(`🎫${APP_COST}${t.needT}`) : onUpload())} aria-label={t.upload}>
            <span className="add-icon">{Icon.plus}</span><span className="tile-name t-muted">{test && apps.length > 0 ? <Ticket n={APP_COST} /> : t.publish}</span>
          </button>
        )}
      </div>

      {test
        ? <PointsCard points={test.points} sub={`${t.gotN} ${gotApps.length} · ${t.commentN} ${commentCount}`} />
        : (
          <div className="temp-card">
            <Temp value={profile.score} big />
            <span className="t-sub">{t.gotN} {gotApps.length} · {t.commentN} {commentCount}</span>
          </div>
        )}

      {test && <TestSections d={test} />}

      <Section title={t.gotApps} aside={<span className="t-sub">{gotApps.length}</span>}>
        {gotApps.length > 0 && (
          <div className="tiles scroll">
            {gotApps.map((a) => <AppTile key={a.id} app={a} size={52} href={`/app/${a.id}`} />)}
          </div>
        )}
      </Section>
    </Page>
  );
}

const COUNTRIES = ['KR', 'US', 'JP', 'TW', 'VN', 'ID', 'TH', 'PH', 'IN', 'GB', 'DE', 'FR', 'CA', 'AU', 'BR', 'MX'];

/** 설정 한 줄: 누르면 OS 선택창 */
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

export function SettingsSheet({ open, profile, onClose, onSave, onLogout }: { open: boolean; profile: Profile; onClose: () => void; onSave: (p: Record<string, string>) => void; onLogout: () => void }) {
  const { t, locale } = useApp();
  const lang = profile.locale.startsWith('ko') ? 'ko' : 'en';
  return (
    <Sheet open={open} onClose={onClose} label={t.settings}>
      <SheetHeader title={t.settings} onClose={onClose} />
      <div className="settings">
        <SelectRow label={t.country} value={profile.country} current={`${flag(profile.country)} ${countryName(profile.country, locale)}`}
          options={Array.from(new Set([profile.country, ...COUNTRIES])).map((c) => ({ value: c, label: `${flag(c)} ${countryName(c, locale)}` }))}
          onChange={(v) => onSave({ country: v })} />
        <SelectRow label={t.language} value={lang} current={lang === 'ko' ? '한국어' : 'English'}
          options={[{ value: 'ko', label: '한국어' }, { value: 'en', label: 'English' }]}
          onChange={(v) => onSave({ locale: v })} />
      </div>
      <button className="link-btn" onClick={onLogout}>{t.logout}</button>
    </Sheet>
  );
}
