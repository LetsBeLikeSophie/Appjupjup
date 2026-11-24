'use client';
import { useState } from 'react';
import { useApp } from '@/lib/ctx';
import type { App, Comment, Person } from '@/lib/supabase';
import { AppIcon, GetButton, Icon, IconButton, Shots, Temp, WhoIcon, WhoName } from './ui';
import { AppChips } from './app-parts';

function ago(iso: string, locale: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (m < 60) return rtf.format(-m, 'minute');
  if (m < 1440) return rtf.format(-Math.round(m / 60), 'hour');
  return rtf.format(-Math.round(m / 1440), 'day');
}
export { ago };

type Handlers = {
  onSend: (body: string) => Promise<boolean>;
  onHelpful: (c: Comment) => void;
  onReport: (c: Comment) => void;
  onDelete: (c: Comment) => void;
  onPerson: (p: Person) => void;
  onBack: () => void;
  onShare: () => void;
};

function CommentRow({ c, app, myId, h }: { c: Comment; app: App; myId?: string; h: Handlers }) {
  const { t, locale } = useApp();
  const isDev = c.author_id === app.owner_id;
  const mine = c.author_id === myId;
  const iOwn = myId === app.owner_id;
  return (
    <div className="cm">
      <button className="cm-who" onClick={() => c.author && h.onPerson(c.author)} aria-label="profile"><WhoIcon who={c.author} size={34} /></button>
      <div className="cm-body">
        <span className="cm-head">
          <button className="cm-name ellipsis" onClick={() => c.author && h.onPerson(c.author)}><WhoName who={c.author} /></button>
          {isDev ? <span className="dev-tag">{t.dev}</span> : c.author && <Temp value={c.author.score} />}
          <span className="t-sub">{ago(c.created_at, locale)}</span>
        </span>
        <p className="t-body">{c.body}</p>
        <span className="cm-acts">
          {iOwn && !isDev
            ? <button className={`mini ${c.helpful_count ? 'on' : ''}`} onClick={() => h.onHelpful(c)}>{Icon.thumb}{t.helpful}</button>
            : c.helpful_count > 0 && <span className="mini on">{Icon.thumb}{t.helpful}</span>}
          {mine
            ? <button className="mini ghost" aria-label={t.remove} onClick={() => h.onDelete(c)}>{Icon.trash}</button>
            : myId && <button className="mini ghost" aria-label={t.report} onClick={() => h.onReport(c)}>{Icon.flag}</button>}
        </span>
      </div>
    </div>
  );
}

/** 아래 고정: [나] 댓글 칸 · 받기 */
function CommentBar({ app, me, onSend }: { app: App; me: Person | null; onSend: (b: string) => Promise<boolean> }) {
  const { t, session, openLogin } = useApp();
  const [text, setText] = useState('');
  const [focus, setFocus] = useState(false);
  const [busy, setBusy] = useState(false);
  const mine = session?.user.id === app.owner_id;
  const send = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const ok = await onSend(text.trim());
    setBusy(false);
    if (ok) { setText(''); setFocus(false); (document.activeElement as HTMLElement | null)?.blur(); }
  };
  const open = focus || !!text;
  return (
    <div className="cbar">
      {open && !mine && (
        <div className="quick">
          {t.quick.map((q) => <button key={q} className="chip" onMouseDown={(e) => e.preventDefault()} onClick={() => setText((x) => (x ? x + ' ' : '') + q.replace(/^\S+\s/, ''))}>{q}</button>)}
        </div>
      )}
      <div className="cbar-row">
        {me && <WhoIcon who={me} size={36} />}
        <label className="sr" htmlFor="cm-in">{t.commentPh}</label>
        <input id="cm-in" className={`cbar-in ${open ? 'on' : ''}`} placeholder={t.commentPh} maxLength={100} value={text}
          onFocus={() => { if (!session) { openLogin(); return; } setFocus(true); }} onBlur={() => setFocus(false)}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} enterKeyHint="send" />
        {open
          ? <IconButton tone="primary" label={t.comments} disabled={!text.trim() || busy} onClick={send}>{Icon.send}</IconButton>
          : !mine && <GetButton app={app} />}
      </div>
    </div>
  );
}

/** 앱 상세 그리기 (데이터는 page에서) */
export function DetailView({ app, comments, me, from, h }: { app: App; comments: Comment[] | null; me: Person | null; from: App | null; h: Handlers }) {
  const { t } = useApp();
  return (
    <div className="detail">
      <div className="d-top">
        <IconButton label={t.back} onClick={h.onBack}>{Icon.back}</IconButton>
        <IconButton label={t.share} onClick={h.onShare}>{Icon.share}</IconButton>
      </div>
      {from && (
        <div className="ribbon"><AppIcon src={app.icon_url} size={24} />{Icon.chevRight}<AppIcon src={from.icon_url} size={24} /><span className="ellipsis">{t.visited}</span></div>
      )}
      <div className="d-hero">
        <AppIcon src={app.icon_url} size={88} />
        <h1 className="t-name">{app.name}</h1>
        {app.tagline && <p className="t-body t-muted">{app.tagline}</p>}
        <AppChips app={app} />
      </div>
      <Shots urls={app.screenshots} height={240} />
      <section className="comments" aria-label={t.comments}>
        {comments?.map((c) => <CommentRow key={c.id} c={c} app={app} myId={me?.id} h={h} />)}
      </section>
      <CommentBar app={app} me={me} onSend={h.onSend} />
    </div>
  );
}
