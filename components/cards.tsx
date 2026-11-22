'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, type App, type Feedback } from '@/lib/supabase';
import { useIconColor } from '@/lib/useIconColor';
import { AppIcon, Chip, Icon, IconButton, PromiseChip, Shots } from './ui';
import { AppChips, CountryFlags, PlatformChip } from './app-parts';

/* ---------- 홈 카드: 아이콘 색 배경, 안쪽 16 ---------- */
export function StackCard({ app, onOpen }: { app: App; onOpen?: () => void }) {
  const c = useIconColor(app.id, app.icon_url);
  const body = (
    <>
      <div className="sc-main">
        <div className="row gap6">
          <PlatformChip platform={app.platform} stage={app.stage} tone="glass" />
          {app.owner && <PromiseChip value={app.owner.score} tone="glass" ink={c.ink} />}
        </div>
        <div>
          <div className="t-name clamp3">{app.name}</div>
          {app.tagline && <div className="sc-tagline clamp1">{app.tagline}</div>}
        </div>
        <div className="sc-owner">
          <AppIcon src={app.icon_url} size={28} />
          <span className="ellipsis">{app.owner?.nickname}</span>
          <CountryFlags app={app} />
        </div>
      </div>
      <div className="sc-shots"><Shots urls={app.screenshots.slice(0, 2)} height={164} tint="rgba(255,255,255,.6)" /></div>
    </>
  );
  const style = { background: c.bg, color: c.ink };
  return onOpen
    ? <button className="stackcard" style={style} onClick={onOpen} aria-label={app.name}>{body}</button>
    : <div className="stackcard" style={style}>{body}</div>;
}

/* ---------- 한 줄 피드백 목록 ---------- */
function FeedbackBox({ app }: { app: App }) {
  const { t, session, openLogin, toast, openFeedback } = useApp();
  const [list, setList] = useState<Feedback[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const load = () => {
    sb().from('aj_feedback').select('id, app_id, author_id, kind, body, helpful_count, created_at, author:aj_profiles(nickname, avatar_url)')
      .eq('app_id', app.id).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setList((data as unknown as Feedback[]) || []));
  };
  useEffect(load, [app.id]);
  useEffect(() => {
    if (!session) { setCanWrite(false); return; }
    Promise.all([
      sb().from('aj_downloads').select('id').eq('app_id', app.id).eq('user_id', session.user.id).limit(1),
      sb().from('aj_feedback').select('id').eq('app_id', app.id).eq('author_id', session.user.id).limit(1),
    ]).then(([d, f]) => setCanWrite(!!d.data?.length && !f.data?.length && app.owner_id !== session.user.id));
  }, [app.id, app.owner_id, session]);

  const helpful = async (f: Feedback) => {
    if (!session) return openLogin();
    const { error } = await sb().rpc('aj_mark_helpful', { p_feedback: f.id });
    if (!error) load();
  };
  const report = async (f: Feedback) => {
    if (!session) return openLogin();
    await sb().rpc('aj_report_feedback', { p_feedback: f.id });
    toast('✓ ' + t.report);
  };
  return (
    <div className="card soft">
      <div className="row between">
        <span className="row gap6 t-card">{Icon.chat}{t.feedback} {list.length}</span>
        {canWrite && <button className="btn-sm dark" onClick={() => openFeedback(app)}>{t.writeOne}</button>}
      </div>
      {list.length === 0 && <span className="t-sub">{t.noFeedback}</span>}
      {list.map((f) => (
        <div key={f.id} className="fb-row">
          <Chip tone={f.kind === 'pumasi' ? 'dark' : 'white'}>{f.kind === 'pumasi' ? t.pumasi : t.free}</Chip>
          <span className="grow t-body">{f.body}</span>
          <button className="mini" aria-label={t.helpful} onClick={() => helpful(f)}>{Icon.thumb}{f.helpful_count || ''}</button>
          <button className="mini" aria-label={t.report} onClick={() => report(f)}>{Icon.flag}</button>
        </div>
      ))}
    </div>
  );
}

/* ---------- 앱 상세 한 장: 모든 줄이 좌우 20에 맞춰요 ---------- */
function Slide({ app, pos, onClose }: { app: App; pos: string; onClose?: () => void }) {
  const { t, download, session } = useApp();
  const mine = session?.user.id === app.owner_id;
  return (
    <section className="slide" aria-label={app.name}>
      <div className="row between gutter">
        {onClose ? <IconButton label={t.back} onClick={onClose}>{Icon.back}</IconButton> : <IconButton label={t.back} href="/">{Icon.back}</IconButton>}
        <span className="t-sub">{pos}</span>
      </div>
      <div className="d-head gutter">
        <AppIcon src={app.icon_url} size={56} />
        <div className="col grow">
          <h1 className="t-name clamp2">{app.name}</h1>
          {app.tagline && <p className="t-body t-muted clamp2">{app.tagline}</p>}
        </div>
      </div>
      <div className="gutter"><AppChips app={app} /></div>
      <Shots urls={app.screenshots} height={320} bleed />
      <div className="gutter"><FeedbackBox app={app} /></div>
      {mine ? <p className="d-mine t-sub">{t.mineNote}</p> : (
        <div className="d-foot">
          <a className="btn dark" href={app.url} target="_blank" rel="noopener noreferrer"
            onClick={(e) => { if (!session) e.preventDefault(); download(app); }}>
            {Icon.down}{t.get}
          </a>
          <span className="t-sub">{t.getNote}</span>
        </div>
      )}
    </section>
  );
}

function NextPeek({ app, onSeen }: { app: App; onSeen: () => void }) {
  const { t } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (timer) clearTimeout(timer);
      if (e.isIntersecting) timer = setTimeout(onSeen, 1200);
    }, { threshold: 0.9 });
    io.observe(el);
    return () => { io.disconnect(); if (timer) clearTimeout(timer); };
  }, [onSeen]);
  return (
    <div className="next-peek" ref={ref}>
      <span className="np-label t-sub">{t.nextApp}{Icon.chevDown}</span>
      <span className="np-app"><AppIcon src={app.icon_url} size={32} /><b className="t-body ellipsis">{app.name}</b></span>
    </div>
  );
}

/** 위아래로 읽다가 맨 아래에서 더 내리면 다음 앱 */
export function AppDetail({ apps, start, onClose }: { apps: App[]; start: number; onClose?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { toast, t } = useApp();
  useEffect(() => {
    const el = ref.current?.querySelectorAll('.slide')[start] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'start' });
  }, [start]);
  const hinted = useRef(false);
  const hint = () => {
    if (hinted.current) return;
    hinted.current = true;
    try { if (localStorage.getItem('aj_hint_next')) return; localStorage.setItem('aj_hint_next', '1'); } catch {}
    toast(t.nextHint);
  };
  return (
    <div className="detail" ref={ref}>
      {apps.map((a, i) => (
        <div key={a.id}>
          <Slide app={a} pos={`${i + 1} / ${apps.length}`} onClose={onClose} />
          {i < apps.length - 1 && <NextPeek app={apps[i + 1]} onSeen={hint} />}
        </div>
      ))}
    </div>
  );
}
