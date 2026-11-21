'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/ctx';
import { sb, APP_FIELDS, type App, type Notice } from '@/lib/supabase';
import { AppIcon, Avatar, Icon, PromiseChip } from '@/components/ui';

function ago(iso: string, locale: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (m < 60) return rtf.format(-m, 'minute');
  if (m < 1440) return rtf.format(-Math.round(m / 60), 'hour');
  return rtf.format(-Math.round(m / 1440), 'day');
}

export default function Alerts() {
  const { t, session, ready, openLogin, openFeedback, refreshUnread, locale } = useApp();
  const [list, setList] = useState<Notice[] | null>(null);

  useEffect(() => {
    if (!session) return;
    const db = sb();
    db.from('aj_notifications')
      .select('id, kind, body, delta, read_at, created_at, app_id, match_id, actor:aj_profiles!aj_notifications_actor_id_fkey(nickname, avatar_url), app:aj_apps(id, name, icon_url), match:aj_matches(due_at, a_result, b_result, user_a)')
      .order('created_at', { ascending: false }).limit(50)
      .then(async ({ data }) => {
        setList((data as unknown as Notice[]) || []);
        await db.from('aj_notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
        refreshUnread();
      });
  }, [session, refreshUnread]);

  const writeFor = async (appId: string) => {
    const { data } = await sb().from('aj_apps').select(APP_FIELDS).eq('id', appId).single();
    if (data) openFeedback(data as unknown as App);
  };

  if (ready && !session) {
    return (
      <div className="page"><h1 className="page-title">{t.alerts}</h1>
        <p className="sub">{t.guestMe}</p>
        <button className="btn dark" onClick={() => openLogin()}>{t.login}</button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">{t.alerts}</h1>
      {list?.length === 0 && <p className="sub">{t.noAlerts}</p>}
      <div className="alerts">
        {list?.map((n) => {
          const unread = !n.read_at;
          const who = n.actor?.nickname || '';
          const when = ago(n.created_at, locale);
          let open = false;
          if (n.kind === 'matched' && n.match) {
            const mineA = n.match.user_a === session?.user.id;
            open = (mineA ? n.match.a_result : n.match.b_result) == null && new Date(n.match.due_at) > new Date();
          }
          const days = n.match ? Math.max(0, Math.ceil((new Date(n.match.due_at).getTime() - Date.now()) / 86400000)) : 0;
          const title =
            n.kind === 'got' ? <><b>{who}</b>{t.nGot}</> :
            n.kind === 'matched' ? <><b>{who}</b>{t.nMatched}</> :
            n.kind === 'feedback' ? <><b>{who}</b>{t.nFeedback}</> :
            n.kind === 'kept' ? <b>{t.nKept}</b> : n.kind === 'missed' ? <b>{t.nMissed}</b> : <b>{t.nGrace}</b>;
          const sub =
            n.kind === 'got' ? (n.app ? <>{n.app.name} · {t.nGotSub} · {when}</> : when) :
            n.kind === 'matched' ? <>{n.app?.name} · {open ? `${t.nMatchedSub} · D-${days}` : when}</> :
            n.kind === 'feedback' ? <>“{n.body}”</> : <>{n.app?.name} · {when}</>;
          const inner = (
            <>
              {n.kind === 'kept' || n.kind === 'missed' || n.kind === 'grace' ? <AppIcon src={n.app?.icon_url} size={40} /> : <Avatar src={n.actor?.avatar_url} size={40} />}
              <span className="a-text"><span className="ellipsis">{title}</span><span className="a-sub ellipsis">{sub}</span></span>
              {n.delta != null && n.delta !== 0 ? <PromiseChip value={n.delta > 0 ? `+${n.delta}` : `${n.delta}`} bg="#F1F1EE" /> : null}
              {unread && <span className="udot" aria-label="new" />}
              {(n.kind === 'got' || n.kind === 'matched' || n.kind === 'feedback') && <span className="chev">{Icon.chevRight}</span>}
            </>
          );
          const cls = `arow ${open ? 'dark' : ''} ${unread && !open ? 'unread' : ''}`;
          if (n.kind === 'matched' && open && n.app_id) return <button key={n.id} className={cls} onClick={() => writeFor(n.app_id!)}>{inner}</button>;
          if (n.app_id && (n.kind === 'got' || n.kind === 'feedback' || n.kind === 'matched')) return <Link key={n.id} className={cls} href={`/app/${n.app_id}`}>{inner}</Link>;
          return <div key={n.id} className={cls}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
