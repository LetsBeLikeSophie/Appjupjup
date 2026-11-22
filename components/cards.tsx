'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, flag, countryName, type App, type Feedback } from '@/lib/supabase';
import { useIconColor } from '@/lib/useIconColor';
import { AppIcon, Avatar, Icon, PromiseChip, Shots } from './ui';

function Countries({ app, chip }: { app: App; chip?: boolean }) {
  const { t, locale } = useApp();
  const cls = chip ? 'mini-chip' : 'cc';
  if (app.all_countries) return <span className={cls}>🌐 {t.worldwide}</span>;
  const list = app.countries || [];
  if (!chip) return <span className="cc">{list.slice(0, 3).map(flag).join(' ')}{list.length > 3 ? ` +${list.length - 3}` : ''}</span>;
  return <span className={cls}>{flag(list[0])} {countryName(list[0], locale)}{list.length > 1 ? ` +${list.length - 1}` : ''}</span>;
}

export function StackCard({ app, onOpen }: { app: App; onOpen?: () => void }) {
  const { t } = useApp();
  const c = useIconColor(app.id, app.icon_url);
  const body = (
    <>
      <div className="sc-main">
        <div className="row gap6">
          <span className="tag-soft">{app.platform === 'ios' ? t.ios : t.android} · {app.stage === 'live' ? t.live : t.test}</span>
          {app.owner && <PromiseChip value={app.owner.score} ink={c.ink} />}
        </div>
        <div>
          <div className="sc-name">{app.name}</div>
          {app.tagline && <div className="sc-tagline">{app.tagline}</div>}
        </div>
        <div className="row gap8">
          <AppIcon src={app.icon_url} size={30} />
          <span className="ellipsis">{app.owner?.nickname}</span>
          <Countries app={app} />
        </div>
      </div>
      <div className="sc-shots"><Shots urls={app.screenshots.slice(0, 2)} height={168} tint="rgba(255,255,255,.6)" /></div>
    </>
  );
  return onOpen
    ? <button className="stackcard" style={{ background: c.bg, color: c.ink }} onClick={onOpen} aria-label={app.name}>{body}</button>
    : <div className="stackcard" style={{ background: c.bg, color: c.ink }}>{body}</div>;
}

function FeedbackList({ app }: { app: App }) {
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
    <div className="fb-box">
      <div className="row between">
        <div className="row gap6 bold">{Icon.chat}{t.feedback} {list.length}</div>
        {canWrite && <button className="chip-btn" onClick={() => openFeedback(app)}>{t.writeOne}</button>}
      </div>
      {list.length === 0 && <div className="sub">{t.noFeedback}</div>}
      {list.map((f) => (
        <div key={f.id} className="fb-row">
          <span className={f.kind === 'pumasi' ? 'tag-pumasi' : 'tag-free'}>{f.kind === 'pumasi' ? t.pumasi : t.free}</span>
          <span className="grow">{f.body}</span>
          <button className="mini" aria-label={t.helpful} onClick={() => helpful(f)}>{Icon.thumb}{f.helpful_count || ''}</button>
          <button className="mini" aria-label={t.report} onClick={() => report(f)}>{Icon.flag}</button>
        </div>
      ))}
    </div>
  );
}

function Slide({ app, pos, onClose }: { app: App; pos: string; onClose?: () => void }) {
  const { t, download, session } = useApp();
  const mine = session?.user.id === app.owner_id;
  return (
    <section className="slide" aria-label={app.name}>
      <div className="d-top">
        {onClose ? <button className="round sm" aria-label={t.back} onClick={onClose}>{Icon.back}</button> : <a className="round sm" href="/" aria-label={t.back}>{Icon.back}</a>}
        <span className="d-pos">{pos}</span>
      </div>
      <div className="d-head">
        <AppIcon src={app.icon_url} size={56} />
        <div className="grow">
          <h1 className="d-name">{app.name}</h1>
          {app.tagline && <p className="d-tagline">{app.tagline}</p>}
        </div>
      </div>
      <div className="d-chips">
        <span className="mini-chip">{app.platform === 'ios' ? t.ios : t.android} · {app.stage === 'live' ? t.live : t.test}</span>
        {app.owner && <PromiseChip value={app.owner.score} bg="#F1F1EE" />}
        <Countries app={app} chip />
        {app.owner && (
          <span className="mini-chip">
            <Avatar src={app.owner.avatar_url} size={18} />
            {app.owner.nickname}{app.owner.tag ? <span className="name-tag">#{app.owner.tag}</span> : null}
          </span>
        )}
      </div>
      <div className="pl20"><Shots urls={app.screenshots} height={320} /></div>
      <div className="pad20"><FeedbackList app={app} /></div>
      {mine ? <div className="d-mine sub small">{t.mineNote}</div> : (
        <div className="d-foot">
          <a className="btn dark" href={app.url} target="_blank" rel="noopener noreferrer"
            onClick={(e) => { if (!session) e.preventDefault(); download(app); }}>
            {Icon.down}{t.get}
          </a>
          <span className="sub small center-text">{t.getNote}</span>
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
      <span className="np-label">{t.nextApp}<span className="chev-down">{Icon.chevDown}</span></span>
      <span className="np-app"><AppIcon src={app.icon_url} size={28} /><b className="ellipsis">{app.name}</b></span>
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
