'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useApp } from '@/lib/ctx';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export const Icon = {
  home: <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" {...P}><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" /></svg>,
  bell: <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" {...P}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>,
  user: <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>,
  down: <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" {...P}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>,
  close: <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" {...P} strokeWidth={2.4}><path d="M6 6l12 12M18 6 6 18" /></svg>,
  chevDown: <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" {...P} strokeWidth={2.4}><path d="m6 9 6 6 6-6" /></svg>,
  chevRight: <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" {...P} strokeWidth={2.6}><path d="m9 6 6 6-6 6" /></svg>,
  plus: <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" {...P} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>,
  chat: <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" {...P}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>,
  thumb: <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" {...P}><path d="M7 10v11H3V10z" /><path d="M7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7" /></svg>,
  flag: <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" {...P}><path d="M5 21V4" /><path d="M5 4h12l-2 4 2 4H5" /></svg>,
  star: <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" {...P}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" /></svg>,
  camera: <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" {...P} strokeWidth={2.4}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  send: <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" {...P} strokeWidth={2.4}><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>,
  shake: (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" {...P} strokeWidth={2}>
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
      <path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" />
    </svg>
  ),
  img: <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" {...P} strokeWidth={1.6}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></svg>,
};

export function AppIcon({ src, size = 48 }: { src?: string | null; size?: number }) {
  const r = Math.round(size * 0.24);
  if (src) return <img className="appicon" src={src} alt="" width={size} height={size} style={{ borderRadius: r }} />;
  return <span className="appicon ph" style={{ width: size, height: size, borderRadius: r }}>{Icon.img}</span>;
}

export function Avatar({ src, size = 40 }: { src?: string | null; size?: number }) {
  if (src) return <img className="avatar" src={src} alt="" width={size} height={size} />;
  return (
    <span className="avatar ph" style={{ width: size, height: size }}>
      <svg aria-hidden width={size * 0.86} height={size * 0.86} viewBox="0 0 24 24"><circle cx="12" cy="9" r="4.5" fill="rgba(255,255,255,.85)" /><path d="M3 24c0-5 4-8 9-8s9 3 9 8z" fill="rgba(255,255,255,.85)" /></svg>
    </span>
  );
}

export function PromiseChip({ value, ink = '#17181A', bg = 'rgba(255,255,255,.6)' }: { value: string | number; ink?: string; bg?: string }) {
  return (
    <span className="promise" style={{ color: ink, background: bg }} aria-label={`약속 점수 ${value}`}>
      {Icon.shake}{value}
    </span>
  );
}

export function Shots({ urls, height, tint = '#F1F1EE' }: { urls: string[]; height: number; tint?: string }) {
  const w = Math.round(height * 0.5);
  const list = urls.length ? urls : [null, null, null];
  return (
    <div className="shots" style={{ height }}>
      {list.map((u, i) =>
        u ? <img key={i} src={u} alt="" loading="lazy" style={{ height, borderRadius: Math.max(10, height * 0.07) }} />
          : <span key={i} className="shot-ph" style={{ width: w, height, background: tint, borderRadius: Math.max(10, height * 0.07) }}>{Icon.img}</span>,
      )}
    </div>
  );
}

export function TabBar() {
  const path = usePathname();
  const { unread, t } = useApp();
  const items = [
    { href: '/', icon: Icon.home, label: t.appName },
    { href: '/alerts', icon: Icon.bell, label: t.alerts, dot: unread > 0 },
    { href: '/me', icon: Icon.user, label: t.me },
  ];
  return (
    <div className="tabwrap">
      <nav className="tabbar" aria-label="menu">
        {items.map((i) => {
          const on = i.href === '/' ? path === '/' : path.startsWith(i.href);
          return (
            <Link key={i.href} href={i.href} aria-label={i.label} aria-current={on ? 'page' : undefined} className={on ? 'on' : ''}>
              {i.icon}
              {i.dot && <span className="dot" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Sheet({ open, onClose, label, children, bg }: { open: boolean; onClose: () => void; label: string; children: ReactNode; bg?: string }) {
  if (!open) return null;
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={label} className="sheet" style={bg ? { background: bg } : undefined} onClick={(e) => e.stopPropagation()}>
        <span className="grab" aria-hidden />
        {children}
      </div>
    </div>
  );
}

export function Toast() {
  const { toastMsg } = useApp();
  if (!toastMsg) return null;
  return <div className="toast" role="status">{toastMsg}</div>;
}
