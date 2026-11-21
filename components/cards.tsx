'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, cardColor, flag, type App, type Feedback } from '@/lib/supabase';
import { AppIcon, Avatar, Icon, PromiseChip, Shots } from './ui';

function Countries({ app }: { app: App }) {
  const { t } = useApp();
  if (app.all_countries) return <span className="cc">🌐 {t.worldwide}</span>;
  const list = app.countries || [];
  return <span className="cc">{list.slice(0, 3).map(flag).join(' ')}{list.length > 3 ? ` +${list.length - 3}` : ''}</span>;
}

export function StackCard({ app, onOpen }: { app: App; onOpen?: () => void }) {
  const { t } = useApp();
  const c = cardColor(app.id);
  const body = (
    <>
      <div className="sc-main">
        <div className="row gap6">
          <span className="pill-line" style={{ borderColor: c.ink }}>{app.stage === 'live' ? t.live : t.test}</span>
          {app.owner && <PromiseChip value={app.owner.score} ink={c.ink} />}
        </div>
        <div className="sc-name">{app.name}</div>
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
      <div className="row between pad20">
        {onClose ? <button className="round" aria-label={t.close} onClick={onClose}>{Icon.chevDown}</button> : <a className="round" href="/" aria-label={t.close}>{Icon.chevDown}</a>}
        <span className="sub">{pos}</span>
      </div>
      <div className="row gap14 pad20">
        <AppIcon src={app.icon_url} size={72} />
        <div className="grow">
          <h1 className="d-name">{app.name}</h1>
          <div className="row gap6 wrap">
            <span className="pill-line">{app.stage === 'live' ? t.live : t.test}</span>
            {app.owner && <PromiseChip value={app.owner.score} bg="#F1F1EE" />}
            <Countries app={app} />
          </div>
        </div>
      </div>
      <div className="pl20"><Shots urls={app.screenshots} height={360} /></div>
      <div className="pad20"><FeedbackList app={app} /></div>
      <div className="d-foot">
        <div className="row gap8">
          <Avatar src={app.owner?.avatar_url} size={28} />
          <span className="bold grow">{app.owner?.nickname}</span>
          {!mine && <span className="sub small">{t.getNote}</span>}
        </div>
        {!mine && (
          <a className="btn dark" href={app.url} target="_blank" rel="noopener noreferrer"
            onClick={(e) => { if (!session) e.preventDefault(); download(app); }}>
            {Icon.down}{t.get}
          </a>
        )}
      </div>
    </section>
  );
}

/** 위아래로 넘기면 다음 앱 */
export function AppDetail({ apps, start, onClose }: { apps: App[]; start: number; onClose?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.children[start] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'start' });
  }, [start]);
  return (
    <div className="detail" ref={ref}>
      {apps.map((a, i) => <Slide key={a.id} app={a} pos={`${i + 1} / ${apps.length}`} onClose={onClose} />)}
    </div>
  );
}
