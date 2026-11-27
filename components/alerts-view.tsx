'use client';
import Link from 'next/link';
import { useApp } from '@/lib/ctx';
import { primaryApp, type Notice } from '@/lib/supabase';
import { AppIcon, WhoIcon, WhoName } from './ui';
import { Empty, Loading, Page } from './layout';
import { ago } from './detail-view';

/** 알림 한 줄: 누르면 내 앱 댓글로, 앞 아이콘(그 사람 앱)을 누르면 답방 */
export function AlertRow({ n, myId }: { n: Notice; myId?: string }) {
  const { t, locale } = useApp();
  const when = ago(n.created_at, locale);
  const actorApp = primaryApp(n.actor);
  // 남이 내 앱에 왔을 때만 답방 카드 (개발자 답글·도움돼요는 아님)
  const canVisit = (n.kind === 'got' || n.kind === 'comment') && n.app?.owner_id === myId && !!actorApp;
  const href = n.app_id ? `/app/${n.app_id}${n.kind === 'comment' ? '#comments' : ''}` : '#';
  const unread = !n.read_at;

  const title =
    n.kind === 'helpful' ? <b>{t.nHelpful}</b> :
    n.kind === 'got' ? <><b><WhoName who={n.actor} /></b>{t.nGot}</> :
    n.kind === 'visit' ? <><b><WhoName who={n.actor} /></b>{t.nVisit}</> :
    <><b><WhoName who={n.actor} /></b> → {n.app?.name}</>;
  const sub = n.body ? <>“{n.body}”</> : n.app?.name;
  const leading = n.kind === 'helpful' ? <AppIcon src={n.app?.icon_url} size={40} /> : <WhoIcon who={n.actor} size={40} />;

  return (
    <div className="alert alert-main">
      {canVisit && actorApp
        ? <Link className="alert-who" href={`/app/${actorApp.id}?from=${n.app_id}`} aria-label={t.visit}>{leading}</Link>
        : leading}
      <Link className="alert-body" href={href}>
        <span className="col grow">
          <span className="row-title"><span className="t-body ellipsis">{title}</span><span className="t-sub">{when}</span></span>
          <span className="row gap6">
            {sub && <span className="t-sub ellipsis">{sub}</span>}
          </span>
        </span>
        {unread && <span className="udot" aria-label="new" />}
      </Link>
    </div>
  );
}

export function AlertsView({ list, myId }: { list: Notice[] | null; myId?: string }) {
  const { t } = useApp();
  return (
    <Page title={t.alerts}>
      {list === null && <Loading />}
      {list?.length === 0 && <Empty>{t.noAlerts}</Empty>}
      <div className="list">
        {list?.map((n) => <AlertRow key={n.id} n={n} myId={myId} />)}
      </div>
    </Page>
  );
}
