'use client';
import { useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { useApp } from '@/lib/ctx';
import { hash, primaryApp, type App, type Person } from '@/lib/supabase';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const svg = (d: ReactNode, size = 22, sw = 2.2) => <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" {...P} strokeWidth={sw}>{d}</svg>;
export const Icon = {
  home: svg(<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />, 24),
  bell: svg(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></>, 24),
  user: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>, 24),
  down: svg(<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>, 20, 2.4),
  close: svg(<path d="M6 6l12 12M18 6 6 18" />, 18, 2.4),
  back: svg(<><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>, 22, 2.4),
  chevRight: svg(<path d="m9 6 6 6-6 6" />, 16, 2.6),
  plus: svg(<path d="M12 5v14M5 12h14" />, 22, 2.4),
  send: svg(<><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>, 22, 2.6),
  check: svg(<path d="m5 12 5 5 9-10" />, 14, 3),
  thumb: svg(<><path d="M7 10v11H3V10z" /><path d="M7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7" /></>, 14),
  flag: svg(<><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></>, 14),
  trash: svg(<><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>, 14),
  share: svg(<><path d="M12 3v13" /><path d="m7 8 5-5 5 5" /><path d="M5 14v6h14v-6" /></>, 20),
  gear: svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>, 20, 2),
  swords: svg(<><path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="m13 19 6-6" /><path d="m16 16 4 4" /><path d="m19 21 2-2" /><path d="M14.5 6.5 18 3h3v3l-3.5 3.5" /><path d="m5 14 4 4" /><path d="m7 17-3 3" /><path d="m3 19 2 2" /></>, 20, 2),
  reply: svg(<><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>, 16, 2.4),
  shuffle: svg(<><path d="M3 7h3.5c3 0 4 2 5.5 5s2.5 5 5.5 5H21" /><path d="m18 14 3 3-3 3" /><path d="M3 17h3.5c1.4 0 2.3-.4 3-1.2" /><path d="M14.5 8.2c.7-.8 1.6-1.2 3-1.2H21" /><path d="m18 4 3 3-3 3" /></>, 22, 2.2),
  flask: svg(<><path d="M9 3h6" /><path d="M10 3v6l-5.2 9a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9V3" /><path d="M7.5 15h9" /></>, 24),
  ticket: svg(<><path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" /><path d="M14 8v1.5M14 11.3v1.4M14 14.5V16" /></>, 16, 2.2),
  camera: svg(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>, 22, 2),
  lock: svg(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>, 18, 2.2),
  crown: svg(<><path d="m2 7 4.5 4L12 4l5.5 7L22 7l-2 12H4z" /></>, 22, 2),
  star: <svg aria-hidden width="14" height="14" viewBox="0 0 24 24"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="#FAB005" /></svg>,
  /** 온도(우리 화폐): 악수 */
  shake: (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" {...P} strokeWidth={2}>
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
      <path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" />
    </svg>
  ),
  img: svg(<><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></>, 22, 1.6),
  android: <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 9h12v8a1 1 0 0 1-1 1h-1v3a1.5 1.5 0 0 1-3 0v-3h-2v3a1.5 1.5 0 0 1-3 0v-3H7a1 1 0 0 1-1-1zM3.5 9A1.5 1.5 0 0 1 5 10.5v5a1.5 1.5 0 0 1-3 0v-5A1.5 1.5 0 0 1 3.5 9m17 0a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-3 0v-5A1.5 1.5 0 0 1 20.5 9M6 8a6 6 0 0 1 3.2-5.1l-1-1.6.8-.5 1 1.7A6 6 0 0 1 12 2c.7 0 1.4.1 2 .4l1-1.6.8.5-1 1.6A6 6 0 0 1 18 8zm3.5-3a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6m5 0a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6" /></svg>,
  apple: <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5s1.7-.8 3.3-.8 2 .8 3.3.8 2.2-1.2 3-2.5a10 10 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.3-4.1M13.9 5a4.3 4.3 0 0 0 1-3.1 4.4 4.4 0 0 0-2.9 1.5 4.1 4.1 0 0 0-1 3 3.6 3.6 0 0 0 2.9-1.4" /></svg>,
};

/* ---------- 줍줍이 동물 (앱 없는 사람) ---------- */
const ANIMALS = ['🐻', '🐰', '🦊', '🐱', '🐶', '🐼', '🐨', '🐹', '🐧', '🦔', '🐢', '🦦'];
export const animalOf = (seed: string | number) => ANIMALS[(typeof seed === 'number' ? seed : hash(seed)) % ANIMALS.length];

/** 이미지 못 불러오면 깨진 그림 대신 빈 자리로 */
function useImg(src?: string | null) {
  const [bad, setBad] = useState<string | null>(null);
  return { ok: !!src && bad !== src, onError: () => setBad(src || null) };
}

/** 앱 아이콘. tilt는 홈·밸런스 게임에서만 */
export function AppIcon({ src, size = 48, tilt = 0, children }: { src?: string | null; size?: number; tilt?: number; children?: ReactNode }) {
  const r = Math.round(size * 0.24);
  const img = useImg(src);
  const style: CSSProperties = { width: size, height: size, borderRadius: r, transform: tilt ? `rotate(${tilt}deg)` : undefined };
  return (
    <span className="appicon-wrap" style={style}>
      {img.ok
        ? <img className="appicon" src={src!} alt="" width={size} height={size} style={{ borderRadius: r }} onError={img.onError} />
        : <span className="appicon ph" style={{ width: size, height: size, borderRadius: r }}>{Icon.img}</span>}
      {children}
    </span>
  );
}

/** 사람 = 대표 앱 아이콘, 앱 없으면 동물 */
export function WhoIcon({ who, size = 34 }: { who?: Person | null; size?: number }) {
  const app = primaryApp(who);
  if (app) return <AppIcon src={app.icon_url} size={size} />;
  return <span className="who-animal" style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}>{animalOf(who?.tag || who?.id || 0)}</span>;
}

/** 사람 이름 = 대표 앱 이름, 없으면 줍줍이 #태그 */
export function WhoName({ who }: { who?: Person | null }) {
  const app = primaryApp(who);
  if (app) return <>{app.name}</>;
  return <>{who?.nickname}{who?.tag ? <span className="name-tag">#{who.tag}</span> : null}</>;
}

/** 모든 칩은 높이 26. tone: soft(회색) / white / primary(오렌지) */
export type ChipTone = 'soft' | 'white' | 'primary';
export function Chip({ tone = 'soft', className = '', style, children, ...rest }: { tone?: ChipTone; className?: string; style?: CSSProperties; children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return <span className={`chip ${tone === 'soft' ? '' : tone} ${className}`} style={style} {...rest}>{children}</span>;
}

/** 온도: 악수 + 숫자 */
export function Temp({ value, big }: { value: number | string; big?: boolean }) {
  const { t } = useApp();
  return <span className={`temp ${big ? 'big' : ''}`} role="img" aria-label={`${t.temp} ${value}`}>{Icon.shake}{value}</span>;
}

/** 동그란 아이콘 버튼 (40). href가 있으면 링크 */
export function IconButton({ label, onClick, href, tone, children, disabled }: { label: string; onClick?: () => void; href?: string; tone?: 'white' | 'primary'; children: ReactNode; disabled?: boolean }) {
  const cls = `icon-btn ${tone || ''}`;
  if (href) return <a className={cls} href={href} aria-label={label}>{children}</a>;
  return <button className={cls} aria-label={label} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function Shots({ urls, height }: { urls: string[]; height: number }) {
  const w = Math.round(height * 0.5);
  const r = Math.max(10, Math.round(height * 0.07));
  const [bad, setBad] = useState<string[]>([]);
  const good = urls.filter((u) => !bad.includes(u));
  const list = good.length ? good : [null, null, null];
  return (
    <div className="shots" style={{ height }}>
      {list.map((u, i) =>
        u ? <img key={u} src={u} alt="" loading="lazy" style={{ height, borderRadius: r }} onError={() => setBad((b) => [...b, u])} />
          : <span key={i} className="shot-ph" style={{ width: w, height, borderRadius: r }}>{Icon.img}</span>,
      )}
    </div>
  );
}

/** 받기: 스토어로 가면서 주움 기록. 로그인 전이면 로그인부터 */
export function GetButton({ app, big, children }: { app: App; big?: boolean; children?: ReactNode }) {
  const { session, openLogin, download, gotIds, t } = useApp();
  const got = gotIds.has(app.id);
  return (
    <a className={big ? 'btn primary' : `get-btn ${got ? 'done' : ''}`} href={app.url} target="_blank" rel="noopener noreferrer"
      onClick={(e) => { if (!session) { e.preventDefault(); openLogin({ type: 'download', appId: app.id, url: app.url }); return; } download(app); }}>
      {children ?? (got ? <>{Icon.check}{t.got}</> : <>{Icon.down}{t.get}</>)}
    </a>
  );
}

export function Toast() {
  const { toastMsg } = useApp();
  if (!toastMsg) return null;
  return <div className="toast" role="status">{toastMsg}</div>;
}

/** 받기 누른 순간: 아이콘이 크게 떴다 사라져요 */
export function PickedPop() {
  const { picked, t } = useApp();
  if (!picked) return null;
  return (
    <div className="picked" role="status" aria-label={t.gotToast}>
      <AppIcon src={picked.icon_url} size={112}><span className="picked-check">{Icon.check}</span></AppIcon>
      <b className="t-name">{t.gotToast}</b>
    </div>
  );
}
