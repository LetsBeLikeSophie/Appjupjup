'use client';
import Link from 'next/link';
import { useApp } from '@/lib/ctx';
import { hash, isFresh, type App } from '@/lib/supabase';
import { AppIcon, Icon } from './ui';
import { Marker, tiltOf } from './app-parts';
import { Loading } from './layout';

/** 카테고리 칩: 전체 · 새로 나옴 · 앱이 있는 카테고리만 */
export function CatChips({ apps, cat, setCat }: { apps: App[]; cat: string; setCat: (c: string) => void }) {
  const { t } = useApp();
  const counts = new Map<string, number>();
  apps.forEach((a) => a.category && counts.set(a.category, (counts.get(a.category) || 0) + 1));
  const cats = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!);
  const items = [{ k: 'all', l: t.all }, ...(apps.some(isFresh) ? [{ k: 'fresh', l: t.fresh }] : []), ...cats.map((k) => ({ k, l: t.cat[k] || t.cat.etc }))];
  return (
    <div className="cat-row" role="tablist">
      {items.map((i) => (
        <button key={i.k} role="tab" aria-selected={cat === i.k} className={`cat ${cat === i.k ? 'on' : ''}`} onClick={() => setCat(i.k)}>{i.l}</button>
      ))}
    </div>
  );
}

export function filterApps(apps: App[], cat: string) {
  if (cat === 'all') return apps;
  if (cat === 'fresh') return apps.filter(isFresh);
  return apps.filter((a) => a.category === cat);
}

/** 바닥에 흩어진 아이콘. 자리·크기·기울기는 앱마다 고정 */
export function IconField({ apps, gotIds, hrefOf }: { apps: App[]; gotIds: Set<string>; hrefOf?: (a: App) => string }) {
  return (
    <div className="field-icons">
      {apps.map((a, i) => {
        const h = hash(a.id);
        const size = 62 + (h % 23);                 // 62 ~ 84
        const dx = ((h >>> 5) % 21) - 10;            // -10 ~ 10
        const dy = ((h >>> 10) % 25) - 12 + (i % 3 === 1 ? 28 : 0); // 가운데 줄은 살짝 아래로
        return (
          <Link key={a.id} href={hrefOf ? hrefOf(a) : `/app/${a.id}`} className="pick-cell" aria-label={a.name}>
            <span className="pick-item" style={{ transform: `translate(${dx}px, ${dy}px)` }}>
              <AppIcon src={a.icon_url} size={size} tilt={tiltOf(a.id)}><Marker app={a} got={gotIds.has(a.id)} /></AppIcon>
              <span className="pick-name ellipsis">{a.name}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** 홈 그리기 (데이터는 page에서) */
export function HomeView({ apps, cat, setCat, gotIds, gameHref, hrefOf }: { apps: App[] | null; cat: string; setCat: (c: string) => void; gotIds: Set<string>; gameHref?: string; hrefOf?: (a: App) => string }) {
  const { t } = useApp();
  const list = apps ? filterApps(apps, cat) : null;
  return (
    <div className="home">
      <header className="home-head">
        <h1 className="t-title">{t.appName}</h1>
        <Link className="game-btn" href={gameHref ?? `/game${cat !== 'all' ? `?cat=${cat}` : ''}`}>{Icon.swords}{t.game}</Link>
      </header>
      {apps && <CatChips apps={apps} cat={cat} setCat={setCat} />}
      {list === null && <Loading />}
      {list?.length === 0 && <div className="loading">{t.empty}</div>}
      {list && <IconField apps={list} gotIds={gotIds} hrefOf={hrefOf} />}
    </div>
  );
}
