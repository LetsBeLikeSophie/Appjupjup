'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, type ReactNode } from 'react';
import { useApp } from '@/lib/ctx';
import { Icon, IconButton } from './ui';

/* ---------- 화면 틀: 좌우 20, 요소 간 16 ---------- */
export function Page({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="page">
      {title && <div className="page-head"><h1 className="t-title">{title}</h1>{action}</div>}
      {children}
    </div>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head"><h2 className="t-section">{title}</h2>{aside}</div>
      {children}
    </section>
  );
}

export function Loading() {
  const { t } = useApp();
  return <div className="loading">{t.loading}</div>;
}

export function Empty({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {title && <b className="t-card">{title}</b>}
      {children && <span className="t-body t-muted">{children}</span>}
    </div>
  );
}

/** 로그인 안 했을 때 같은 모양으로 */
export function GuestGate({ title, onLogin }: { title: string; onLogin: () => void }) {
  const { t } = useApp();
  return (
    <Page title={title}>
      <button className="btn primary" onClick={onLogin}>{t.login}</button>
    </Page>
  );
}

/* ---------- 목록 한 줄: 앞(아이콘) · 제목/보조 · 뒤 ---------- */
type RowProps = {
  leading?: ReactNode; title: ReactNode; time?: string; sub?: ReactNode; meta?: ReactNode; trailing?: ReactNode; chevron?: boolean;
  tone?: 'primary'; href?: string; onClick?: () => void; label?: string;
};
export function ListRow({ leading, title, time, sub, meta, trailing, chevron, tone, href, onClick, label }: RowProps) {
  const cls = `list-row ${tone || ''}`;
  const inner = (
    <>
      {leading}
      <span className="col grow">
        <span className="row-title"><span className="t-body ellipsis">{title}</span>{time && <span className="t-sub">{time}</span>}</span>
        {sub && <span className="t-sub ellipsis">{sub}</span>}
        {meta && <span className="t-sub">{meta}</span>}
      </span>
      {trailing}
      {chevron && <span className="chev">{Icon.chevRight}</span>}
    </>
  );
  if (href) return <Link className={cls} href={href} aria-label={label}>{inner}</Link>;
  if (onClick) return <button className={cls} onClick={onClick} aria-label={label}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

/* ---------- 하단 메뉴 ---------- */
export function TabBar() {
  const path = usePathname();
  const { unread, t } = useApp();
  // 앱 상세·밸런스 게임은 아래에 자기 버튼이 있어서 메뉴를 숨겨요
  if (path.startsWith('/app/') || path.startsWith('/game')) return null;
  // /demo 안에서는 시험용 메뉴 4칸 (테스트 칸은 아직 시험 중)
  const demo = path.startsWith('/demo');
  const items = demo ? [
    { href: '/demo', icon: Icon.home, label: t.appName },
    { href: '/demo/test', icon: Icon.flask, label: t.test },
    { href: '/demo/alerts', icon: Icon.bell, label: t.alerts, dot: true },
    { href: '/demo/me', icon: Icon.user, label: t.me },
  ] : [
    { href: '/', icon: Icon.home, label: t.appName },
    { href: '/alerts', icon: Icon.bell, label: t.alerts, dot: unread > 0 },
    { href: '/me', icon: Icon.user, label: t.me },
  ];
  return (
    <div className="tabwrap">
      <nav className="tabbar" aria-label="menu">
        {items.map((i) => {
          const on = i.href === '/' || i.href === '/demo' ? path === i.href : path.startsWith(i.href);
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

/* ---------- 시트: 아래에서 올라오고, 맨 위에서 아래로 쓸면 닫혀요 ---------- */
export function Sheet({ open, onClose, label, children, tall }: { open: boolean; onClose: () => void; label: string; children: ReactNode; tall?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number; active: boolean } | null>(null);
  if (!open) return null;

  const start = (e: React.TouchEvent) => {
    const el = ref.current;
    if (!el || el.scrollTop > 0) return;
    drag.current = { y: e.touches[0].clientY, dy: 0, active: true };
    el.style.transition = 'none';
  };
  const move = (e: React.TouchEvent) => {
    const d = drag.current, el = ref.current;
    if (!d?.active || !el) return;
    d.dy = Math.max(0, e.touches[0].clientY - d.y);
    el.style.transform = `translateY(${d.dy}px)`;
  };
  const end = () => {
    const d = drag.current, el = ref.current;
    drag.current = null;
    if (!d || !el) return;
    el.style.transition = 'transform .2s ease';
    if (d.dy > 110) { el.style.transform = 'translateY(100%)'; setTimeout(onClose, 180); }
    else el.style.transform = '';
  };

  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className={`sheet ${tall ? 'tall' : ''}`}
        onClick={(e) => e.stopPropagation()} onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={end}>
        <span className="grab" aria-hidden />
        {children}
      </div>
    </div>
  );
}

/** 시트 머리: [아이콘] 제목/보조 ··· [닫기]. 모든 시트 같은 모양 */
export function SheetHeader({ title, sub, leading, onClose }: { title: ReactNode; sub?: ReactNode; leading?: ReactNode; onClose: () => void }) {
  const { t } = useApp();
  return (
    <div className="sheet-head">
      {leading}
      <div className="grow">
        <h2 className="t-name clamp2">{title}</h2>
        {sub && <div className="t-sub">{sub}</div>}
      </div>
      <IconButton label={t.close} onClick={onClose}>{Icon.close}</IconButton>
    </div>
  );
}
