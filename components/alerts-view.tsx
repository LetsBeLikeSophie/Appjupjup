'use client';
import { useApp } from '@/lib/ctx';
import type { Notice } from '@/lib/supabase';
import { AppIcon, Avatar, PromiseChip } from './ui';
import { Empty, ListRow, Loading, Page } from './layout';

function ago(iso: string, locale: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (m < 60) return rtf.format(-m, 'minute');
  if (m < 1440) return rtf.format(-Math.round(m / 60), 'hour');
  return rtf.format(-Math.round(m / 1440), 'day');
}

/** 알림 한 줄. 할 일(피드백 남기기)이 있는 행만 검정 */
export function AlertRow({ n, myId, onWrite }: { n: Notice; myId?: string; onWrite: (appId: string) => void }) {
  const { t, locale } = useApp();
  const unread = !n.read_at;
  const who = n.actor?.nickname || '';
  const when = ago(n.created_at, locale);

  let todo = false;
  if (n.kind === 'matched' && n.match) {
    const mineA = n.match.user_a === myId;
    todo = (mineA ? n.match.a_result : n.match.b_result) == null && new Date(n.match.due_at) > new Date();
  }
  const days = n.match ? Math.max(0, Math.ceil((new Date(n.match.due_at).getTime() - Date.now()) / 86400000)) : 0;

  const title =
    n.kind === 'got' ? <><b>{who}</b>{t.nGot}</> :
    n.kind === 'matched' ? <><b>{who}</b>{t.nMatched}</> :
    n.kind === 'feedback' ? <><b>{who}</b>{t.nFeedback}</> :
    <b>{n.kind === 'kept' ? t.nKept : n.kind === 'missed' ? t.nMissed : t.nGrace}</b>;
  const sub =
    n.kind === 'got' ? <>{t.nGotSub} · {n.app?.name}</> :
    n.kind === 'matched' ? (todo ? <>D-{days} · {t.nMatchedSub}</> : n.app?.name) :
    n.kind === 'feedback' ? <>“{n.body}”</> : n.app?.name;

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
      title={title} time={when} sub={sub} trailing={trailing} chevron={linked}
      tone={todo ? 'primary' : undefined}
      onClick={todo && n.app_id ? () => onWrite(n.app_id!) : undefined}
      href={!todo && linked ? `/app/${n.app_id}` : undefined}
    />
  );
}

export function AlertsView({ list, myId, onWrite }: { list: Notice[] | null; myId?: string; onWrite: (appId: string) => void }) {
  const { t } = useApp();
  return (
    <Page title={t.alerts}>
      {list === null && <Loading />}
      {list?.length === 0 && <Empty>{t.noAlerts}</Empty>}
      <div className="list">
        {list?.map((n) => <AlertRow key={n.id} n={n} myId={myId} onWrite={onWrite} />)}
      </div>
    </Page>
  );
}
