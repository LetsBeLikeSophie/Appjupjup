'use client';
import { useApp } from '@/lib/ctx';
import { flag, hash, isFresh, type App } from '@/lib/supabase';
import { AppIcon, Chip, Icon, type ChipTone } from './ui';

/** "KR, us jp" → ['KR','US','JP'] */
export function parseCountries(text: string) {
  return text.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter((x) => /^[A-Z]{2}$/.test(x));
}

/** 기기 아이콘 (테스트면 글자) */
export function PlatformChip({ platform, stage, tone }: { platform: App['platform']; stage: App['stage']; tone?: ChipTone }) {
  const { t } = useApp();
  return <Chip tone={tone} aria-label={platform === 'ios' ? t.ios : t.android}>{platform === 'ios' ? Icon.apple : Icon.android}{stage === 'test' ? t.test : null}</Chip>;
}

export function CategoryChip({ cat, tone }: { cat?: string | null; tone?: ChipTone }) {
  const { t } = useApp();
  if (!cat) return null;
  return <Chip tone={tone}>{t.cat[cat] || t.cat.etc}</Chip>;
}

/** 🌐 / 🇰🇷 +2 */
export function CountryChip({ all, countries, tone }: { all: boolean; countries: string[]; tone?: ChipTone }) {
  if (all) return <Chip tone={tone}>🌐</Chip>;
  if (!countries.length) return null;
  return <Chip tone={tone}>{flag(countries[0])}{countries.length > 1 ? ` +${countries.length - 1}` : ''}</Chip>;
}

/** 앱 칩 묶음: 카테고리 · 기기 · 나라 */
export function AppChips({ app, tone }: { app: Pick<App, 'platform' | 'stage' | 'all_countries' | 'countries' | 'category'>; tone?: ChipTone }) {
  return (
    <div className="chips">
      <CategoryChip cat={app.category} tone={tone} />
      <PlatformChip platform={app.platform} stage={app.stage} tone={tone} />
      <CountryChip all={app.all_countries} countries={app.countries || []} tone={tone} />
    </div>
  );
}

/** 출시 나라 고르기 */
export function CountryEditor({ world, setWorld, cc, setCc }: { world: boolean; setWorld: (v: boolean) => void; cc: string; setCc: (v: string) => void }) {
  const { t } = useApp();
  return (
    <>
      <label className="check"><input type="checkbox" checked={world} onChange={(e) => setWorld(e.target.checked)} /> 🌐 {t.worldwide}</label>
      {!world && <input className="field" aria-label={t.countries} placeholder={t.countriesHint} value={cc} onChange={(e) => setCc(e.target.value)} />}
    </>
  );
}

/** 앱마다 고정된 기울기 (-8 ~ 8도) */
export const tiltOf = (id: string) => ((hash(id + 't') % 17) - 8);

/** 아이콘에 붙는 표시는 하나만: 새로 나옴 → 주움 → 댓글 수 */
export function Marker({ app, got }: { app: App; got: boolean }) {
  if (isFresh(app) && !got) return <i className="mk-fresh" aria-label="new" />;
  if (got) return <span className="mk-got">{Icon.check}</span>;
  if (app.feedback_count > 0) return <span className="mk-count">{app.feedback_count > 9 ? '9+' : app.feedback_count}</span>;
  return null;
}

/** 똑바로 놓인 앱 하나 (내 정보·사람 시트·알림) */
export function AppTile({ app, size = 56, star, onClick, href }: { app: Pick<App, 'id' | 'name' | 'icon_url'> & { is_primary?: boolean }; size?: number; star?: boolean; onClick?: () => void; href?: string }) {
  const inner = (
    <>
      <AppIcon src={app.icon_url} size={size}>{star && <span className="mk-star">{Icon.star}</span>}</AppIcon>
      <span className="tile-name ellipsis" style={{ maxWidth: size + 24 }}>{app.name}</span>
    </>
  );
  if (href) return <a className="tile" href={href}>{inner}</a>;
  if (onClick) return <button className="tile" onClick={onClick}>{inner}</button>;
  return <span className="tile">{inner}</span>;
}

/** 한마디 입력: 홈 더미에서 앱이 말풍선으로 떠드는 10글자 */
export function SayInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const { t } = useApp();
  const n = [...value].length;
  return (
    <span className="say-input">
      <label className="sr" htmlFor={id}>{t.say}</label>
      <input id={id} className="field" placeholder={t.say} value={value}
        onChange={(e) => onChange([...e.target.value].slice(0, 10).join(''))} />
      <span className={`say-count ${n >= 10 ? 'full' : ''}`}>{n}/10</span>
    </span>
  );
}
