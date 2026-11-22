'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, APP_FIELDS, type App, type Notice } from '@/lib/supabase';
import { AppIcon, Avatar, PromiseChip } from '@/components/ui';
import { Empty, GuestGate, ListRow, Loading, Page } from '@/components/layout';

function ago(iso: string, locale: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (m < 60) return rtf.format(-m, 'minute');
  if (m < 1440) return rtf.format(-Math.round(m / 60), 'hour');
  return rtf.format(-Math.round(m / 1440), 'day');
}

/** 알림 한 줄. 할 일(피드백 남기기)이 있는 행만 검정 */
function AlertRow({ n, onWrite }: { n: Notice; onWrite: (appId: string) => void }) {
  const { t, session, locale } = useApp();
  const unread = !n.read_at;
  const who = n.actor?.nickname || '';
  const when = ago(n.created_at, locale);

  let todo = false;
  if (n.kind === 'matched' && n.match) {
    const mineA = n.match.user_a === session?.user.id;
    todo = (mineA ? n.match.a_result : n.match.b_result) == null && new Date(n.match.due_at) > new Date();
  }
  const days = n.match ? Math.max(0, Math.ceil((new Date(n.match.due_at).getTime() - Date.now()) / 86400000)) : 0;

  const title =
    n.kind === 'got' ? <><b>{who}</b>{t.nGot}</> :
    n.kind === 'matched' ? <><b>{who}</b>{t.nMatched}</> :
    n.kind === 'feedback' ? <><b>{who}</b>{t.nFeedback}</> :
    <b>{n.kind === 'kept' ? t.nKept : n.kind === 'missed' ? t.nMissed : t.nGrace}</b>;
  const sub =
    n.kind === 'got' ? (n.app ? <>{n.app.name} · {t.nGotSub} · {when}</> : when) :
    n.kind === 'matched' ? <>{n.app?.name} · {todo ? `${t.nMatchedSub} · D-${days}` : when}</> :
    n.kind === 'feedback' ? <>“{n.body}”</> : <>{n.app?.name} · {when}</>;

  const result = n.kind === 'kept' || n.kind === 'missed' || n.kind === 'grace';
  const linked = !!n.app_id && !result;
  const trailing = (
    <>
      {n.delta ? <PromiseChip value={n.delta > 0 ? `+${n.delta}` : `${n.delta}`} tone={todo ? 'glass' : 'soft'} /> : null}
      {unread && <span className="udot" aria-label="new" />}
    </>
  );

  return (
    <ListRow
      leading={result ? <AppIcon src={n.app?.icon_url} size={40} /> : <Avatar src={n.actor?.avatar_url} size={40} />}
      title={title} sub={sub} trailing={trailing} chevron={linked}
      tone={todo ? 'dark' : unread ? 'unread' : undefined}
      onClick={todo && n.app_id ? () => onWrite(n.app_id!) : undefined}
      href={!todo && linked ? `/app/${n.app_id}` : undefined}
    />
  );
}

export default function Alerts() {
  const { t, session, ready, openLogin, openFeedback, refreshUnread } = useApp();
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

  if (ready && !session) return <GuestGate title={t.alerts} onLogin={() => openLogin()} />;

  return (
    <Page title={t.alerts}>
      {list === null && <Loading />}
      {list?.length === 0 && <Empty>{t.noAlerts}</Empty>}
      <div className="list">
        {list?.map((n) => <AlertRow key={n.id} n={n} onWrite={writeFor} />)}
      </div>
    </Page>
  );
}
