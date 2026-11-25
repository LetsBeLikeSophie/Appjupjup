'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/ctx';
import { hash, isFresh, type App } from '@/lib/supabase';
import { AppIcon, Icon } from './ui';
import { Marker, tiltOf } from './app-parts';
import { Loading } from './layout';

/** 카테고리 칩: 전체 · 새로 나옴 · 앱이 있는 카테고리만 */
export function CatChips({ apps, cat, setCat, lead }: { apps: App[]; cat: string; setCat: (c: string) => void; lead?: ReactNode }) {
  const { t } = useApp();
  const counts = new Map<string, number>();
  apps.forEach((a) => a.category && counts.set(a.category, (counts.get(a.category) || 0) + 1));
  const cats = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!);
  const items = [{ k: 'all', l: t.all }, ...(apps.some(isFresh) ? [{ k: 'fresh', l: t.fresh }] : []), ...cats.map((k) => ({ k, l: t.cat[k] || t.cat.etc }))];
  return (
    <div className="cat-row" role="tablist">
      {lead}
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

export type Device = 'all' | 'android' | 'ios';
/** 접속한 폰으로 기본 기기 정하기 (컴퓨터는 전체) */
export function guessDevice(): Device {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'all';
}
export const byDevice = (apps: App[], d: Device) => (d === 'all' ? apps : apps.filter((a) => a.platform === d));

/** 기기 고르기: 안드로이드·아이폰 두 아이콘. 둘 다 켜짐 = 전체, 켜진 걸 다시 누르면 전체 */
function DeviceSeg({ device, setDevice }: { device: Device; setDevice: (d: Device) => void }) {
  const { t } = useApp();
  return (
    <div className="dev-seg">
      {(['android', 'ios'] as const).map((d) => (
        <button key={d} aria-label={d === 'ios' ? t.ios : t.android} aria-pressed={device === d}
          className={device === 'all' || device === d ? 'on' : ''} onClick={() => setDevice(device === d ? 'all' : d)}>
          {d === 'ios' ? Icon.apple : Icon.android}
        </button>
      ))}
    </div>
  );
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

/** 3겹 더미. 한 번에 42개만 쏟고 "다시 쏟기"로 다음 앱들. 끌어서 옮기면 맨 위로, 살짝 누르면 열기 */
/** 말풍선 한마디: 10글자까지 */
export const SAY_MAX = 10;
const sayOf = (a: App) => (a.say || '').trim() || undefined;
const PER_LAYER = 14, LAYERS = 3, COLS = 3, ROWS = 5;
export function IconHeap({ apps, gotIds, hrefOf, onPick, saveKey }: { apps: App[]; gotIds: Set<string>; hrefOf?: (a: App) => string; onPick?: (a: App) => void; saveKey?: string }) {
  const { t } = useApp();
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [wh, setWh] = useState<[number, number] | null>(null);
  const [deal, setDeal] = useState(0);
  // 옮긴 자리는 화면 비율(0~1)로 기억 → 폰에 저장, 다시 들어와도 그대로 (다시 쏟기 전까지)
  const moved = useRef(new Map<string, { x: number; y: number; z: number }>());
  const top = useRef(100);
  const store = saveKey ? `aj-heap:${saveKey}` : null;
  const save = (d: number) => {
    if (!store) return;
    try { localStorage.setItem(store, JSON.stringify({ deal: d, top: top.current, moved: [...moved.current] })); } catch {}
  };
  useEffect(() => {
    const el = box.current!;
    if (store) try {
      const v = JSON.parse(localStorage.getItem(store) || 'null');
      if (v) { moved.current = new Map(v.moved); top.current = v.top || 100; setDeal(v.deal || 0); }
    } catch {}
    const measure = () => { if (el.clientWidth > 0) setWh((o) => (o && o[0] === el.clientWidth && o[1] === el.clientHeight ? o : [el.clientWidth, el.clientHeight])); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 새로 나온 앱이 첫 판 맨 위로
  const ordered = [...apps.filter(isFresh), ...apps.filter((a) => !isFresh(a))];
  const per = PER_LAYER * LAYERS;
  const start = ordered.length > per ? (deal * per) % ordered.length : 0;
  const batch = ordered.length > per ? [...ordered, ...ordered].slice(start, start + per) : ordered;

  const redeal = () => { moved.current.clear(); top.current = 100; setBubbles([]); save(deal + 1); setDeal(deal + 1); };

  // 앱이 떠드는 말풍선: 맨 위에 보이는 앱 중 아무나, 짧게 떴다 사라짐 (동시에 최대 3개)
  const [bubbles, setBubbles] = useState<{ k: number; id: string; text: string; x: number; y: number }[]>([]);
  const seq = useRef(0);
  useEffect(() => {
    if (!wh) return;
    const tick = setInterval(() => {
      const els = [...box.current!.querySelectorAll<HTMLElement>('.heap-item[data-layer="0"]:not(.lift)')];
      if (!els.length) return;
      setBubbles((list) => {
        if (list.length >= 3) return list;
        const free = els.filter((e) => !list.some((b) => b.id === e.dataset.id));
        const el = free[Math.floor(Math.random() * free.length)];
        const text = el?.dataset.say;
        if (!el || !text) return list;
        const size = parseFloat(el.dataset.s!);
        const x = Math.min(wh[0] - 56, Math.max(56, parseFloat(el.dataset.x!) + size / 2));
        const k = ++seq.current;
        setTimeout(() => setBubbles((l) => l.filter((b) => b.k !== k)), 2600);
        return [...list, { k, id: el.dataset.id!, text, x, y: parseFloat(el.dataset.y!) }];
      });
    }, 1100);
    return () => clearInterval(tick);
  }, [wh, deal]);

  const down = (e: React.PointerEvent<HTMLElement>, a: App) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY;
    const ox = parseFloat(el.dataset.x!), oy = parseFloat(el.dataset.y!);
    const size = parseFloat(el.dataset.s!);
    const [W, H] = wh!;
    let drag = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!drag && Math.hypot(dx, dy) < 6) return;
      if (!drag) { setBubbles((l) => l.filter((b) => b.id !== a.id)); drag = true; el.style.zIndex = String(++top.current); el.classList.add('lift'); el.dataset.layer = '0'; }
      const x = Math.min(W - size, Math.max(0, ox + dx)), y = Math.min(H - size, Math.max(0, oy + dy));
      el.style.left = `${x}px`; el.style.top = `${y}px`;
      el.dataset.x = String(x); el.dataset.y = String(y);
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.classList.remove('lift');
      if (drag) { moved.current.set(a.id, { x: parseFloat(el.dataset.x!) / W, y: parseFloat(el.dataset.y!) / H, z: top.current }); save(deal); }
      else if (onPick) onPick(a);
      else router.push(hrefOf ? hrefOf(a) : `/app/${a.id}`);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  // 겹마다 3x5 칸에 하나씩 + 흔들기, 겹끼리는 반 칸 어긋나게 → 고르게 덮임
  const place = (a: App, i: number) => {
    const layer = Math.floor(i / PER_LAYER);
    const h = hash(a.id + ':' + deal);
    const size = (layer === 0 ? 64 : layer === 1 ? 58 : 52) + (h % 13);
    const order = [...Array(COLS * ROWS).keys()].sort((p, q) => hash(`${deal}:${layer}:${p}`) - hash(`${deal}:${layer}:${q}`));
    const cell = order[i % PER_LAYER];
    const cw = wh![0] / COLS, ch = wh![1] / ROWS;
    const off = layer === 1 ? 0.5 : layer === 2 ? -0.35 : 0;
    const jx = (((h >>> 6) % 100) / 100 - 0.5) * 0.7, jy = (((h >>> 13) % 100) / 100 - 0.5) * 0.7;
    const x = Math.min(wh![0] - size, Math.max(0, ((cell % COLS) + 0.5 + off * 0.5 + jx) * cw - size / 2));
    const y = Math.min(wh![1] - size, Math.max(0, (Math.floor(cell / COLS) + 0.5 + off + jy) * ch - size / 2));
    return { layer, size, x, y };
  };

  return (
    <>
      <div className="heap" ref={box}>
        {wh && batch.map((a, i) => {
          const p = place(a, i);
          const m = moved.current.get(a.id);
          const x = m ? Math.min(wh[0] - p.size, m.x * wh[0]) : p.x, y = m ? Math.min(wh[1] - p.size, m.y * wh[1]) : p.y;
          return (
            <span key={`${a.id}:${deal}`} className="heap-item" role="link" aria-label={a.name}
              data-id={a.id} data-say={sayOf(a)} data-x={x} data-y={y} data-s={p.size} data-layer={m ? 0 : p.layer}
              style={{ left: x, top: y, zIndex: m ? m.z : (LAYERS - p.layer) * 30 + (i % PER_LAYER), animationDelay: `${(LAYERS - 1 - p.layer) * 120 + (i % PER_LAYER) * 18}ms` }}
              onPointerDown={(e) => down(e, a)}>
              <AppIcon src={a.icon_url} size={p.size} tilt={tiltOf(a.id + deal)}><Marker app={a} got={gotIds.has(a.id)} /></AppIcon>
            </span>
          );
        })}
        {bubbles.map((b) => <span key={b.k} className="bubble" style={{ left: b.x, top: b.y }}>{b.text}</span>)}
      </div>
      {ordered.length > 1 && <button className="redeal" aria-label={t.redeal} onClick={redeal}>{Icon.shuffle}</button>}
    </>
  );
}

/** 홈 그리기 (데이터는 page에서) */
export function HomeView({ apps, cat, setCat, gotIds, gameHref, hrefOf, heap, onPick, device, setDevice }: { apps: App[] | null; cat: string; setCat: (c: string) => void; gotIds: Set<string>; gameHref?: string; hrefOf?: (a: App) => string; heap?: boolean; onPick?: (a: App) => void; device?: Device; setDevice?: (d: Device) => void }) {
  const { t } = useApp();
  const mine = apps && device ? byDevice(apps, device) : apps;
  const list = mine ? filterApps(mine, cat) : null;
  return (
    <div className="home">
      <header className="home-head">
        <h1 className="t-title">{t.appName}</h1>
        <Link className="game-btn" href={gameHref ?? `/game${cat !== 'all' ? `?cat=${cat}` : ''}`}>{Icon.swords}{t.game}</Link>
      </header>
      {mine && <CatChips apps={mine} cat={cat} setCat={setCat} lead={device && setDevice ? <DeviceSeg device={device} setDevice={setDevice} /> : undefined} />}
      {list === null && <Loading />}
      {list?.length === 0 && <div className="loading">{t.empty}</div>}
      {list && list.length > 0 && (heap
        ? <IconHeap key={`${device}:${cat}`} saveKey={`${device ?? 'all'}:${cat}`} apps={list} gotIds={gotIds} hrefOf={hrefOf} onPick={onPick} />
        : <IconField apps={list} gotIds={gotIds} hrefOf={hrefOf} />)}
    </div>
  );
}
