'use client';
import { useApp } from '@/lib/ctx';
import { flag, countryName, type App } from '@/lib/supabase';
import { Avatar, Chip, NameTag, PromiseChip, type ChipTone } from './ui';

/** "KR, us jp" → ['KR','US','JP'] */
export function parseCountries(text: string) {
  return text.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter((x) => /^[A-Z]{2}$/.test(x));
}

/** Android · 출시 */
export function PlatformChip({ platform, stage, tone }: { platform: App['platform']; stage: App['stage']; tone?: ChipTone }) {
  const { t } = useApp();
  return <Chip tone={tone}>{platform === 'ios' ? t.ios : t.android} · {stage === 'live' ? t.live : t.test}</Chip>;
}

/** 🌐 전 세계 / 🇰🇷 한국 +2 */
export function CountryChip({ all, countries, tone }: { all: boolean; countries: string[]; tone?: ChipTone }) {
  const { t, locale } = useApp();
  if (all) return <Chip tone={tone}>🌐 {t.worldwide}</Chip>;
  if (!countries.length) return null;
  return <Chip tone={tone}>{flag(countries[0])} {countryName(countries[0], locale)}{countries.length > 1 ? ` +${countries.length - 1}` : ''}</Chip>;
}

/** 카드 위에 쓰는 짧은 국기 표시 */
export function CountryFlags({ app }: { app: App }) {
  const { t } = useApp();
  if (app.all_countries) return <span>🌐 {t.worldwide}</span>;
  const list = app.countries || [];
  return <span>{list.slice(0, 3).map(flag).join(' ')}{list.length > 3 ? ` +${list.length - 3}` : ''}</span>;
}

/** 앱 상세·미리보기 칩 묶음: 기기·단계 / 점수 / 나라 / 만든 사람 */
export function AppChips({ app, tone }: { app: Pick<App, 'platform' | 'stage' | 'all_countries' | 'countries' | 'owner'>; tone?: ChipTone }) {
  return (
    <div className="chips">
      <PlatformChip platform={app.platform} stage={app.stage} tone={tone} />
      {app.owner && <PromiseChip value={app.owner.score} tone={tone} />}
      <CountryChip all={app.all_countries} countries={app.countries || []} tone={tone} />
      {app.owner && (
        <Chip tone={tone}><Avatar src={app.owner.avatar_url} size={18} /><NameTag name={app.owner.nickname} tag={app.owner.tag} /></Chip>
      )}
    </div>
  );
}

/** 출시 나라 고르기 (앱 올리기·앱 수정 같이 씀) */
export function CountryEditor({ world, setWorld, cc, setCc }: { world: boolean; setWorld: (v: boolean) => void; cc: string; setCc: (v: string) => void }) {
  const { t } = useApp();
  return (
    <>
      <label className="check"><input type="checkbox" checked={world} onChange={(e) => setWorld(e.target.checked)} /> {t.worldwide}</label>
      {!world && <input className="field" aria-label={t.countries} placeholder={t.countriesHint} value={cc} onChange={(e) => setCc(e.target.value)} />}
    </>
  );
}
