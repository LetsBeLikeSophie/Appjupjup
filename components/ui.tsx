'use client';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { useApp } from '@/lib/ctx';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export const Icon = {
  home: <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" {...P}><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" /></svg>,
  bell: <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" {...P}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>,
  user: <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>,
  down: <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" {...P}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>,
  close: <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" {...P} strokeWidth={2.4}><path d="M6 6l12 12M18 6 6 18" /></svg>,
  back: <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" {...P} strokeWidth={2.4}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>,
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

/** 이름 + #태그 */
export function NameTag({ name, tag }: { name?: string | null; tag?: number | null }) {
  return <>{name}{tag ? <span className="name-tag">#{tag}</span> : null}</>;
}

/** 모든 칩은 높이 26. tone: soft(회색) / glass(색 카드 위) / white / dark */
export type ChipTone = 'soft' | 'glass' | 'white' | 'dark';
export function Chip({ tone = 'soft', className = '', style, children, ...rest }: { tone?: ChipTone; className?: string; style?: CSSProperties; children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return <span className={`chip ${tone === 'soft' ? '' : tone} ${className}`} style={style} {...rest}>{children}</span>;
}

/** 약속 점수: 악수 + 숫자 */
export function PromiseChip({ value, tone = 'soft', ink }: { value: string | number; tone?: ChipTone; ink?: string }) {
  return (
    <Chip tone={tone} className="promise" style={ink ? { color: ink } : undefined} role="img" aria-label={`약속 점수 ${value}`}>
      {Icon.shake}{value}
    </Chip>
  );
}

/** 동그란 아이콘 버튼 (40). href가 있으면 링크 */
export function IconButton({ label, onClick, href, tone, children, disabled }: { label: string; onClick?: () => void; href?: string; tone?: 'glass' | 'dark'; children: ReactNode; disabled?: boolean }) {
  const cls = `icon-btn ${tone || ''}`;
  if (href) return <a className={cls} href={href} aria-label={label}>{children}</a>;
  return <button className={cls} aria-label={label} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function Shots({ urls, height, tint = '#F1F1EE', bleed }: { urls: string[]; height: number; tint?: string; bleed?: boolean }) {
  const w = Math.round(height * 0.5);
  const r = Math.max(10, Math.round(height * 0.07));
  const list = urls.length ? urls : [null, null, null];
  return (
    <div className={`shots ${bleed ? 'bleed' : ''}`} style={{ height }}>
      {list.map((u, i) =>
        u ? <img key={i} src={u} alt="" loading="lazy" style={{ height, borderRadius: r }} />
          : <span key={i} className="shot-ph" style={{ width: w, height, background: tint, borderRadius: r }}>{Icon.img}</span>,
      )}
    </div>
  );
}

export function Toast() {
  const { toastMsg } = useApp();
  if (!toastMsg) return null;
  return <div className="toast" role="status">{toastMsg}</div>;
}
