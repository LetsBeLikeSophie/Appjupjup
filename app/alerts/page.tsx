'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, PERSON, type Notice } from '@/lib/supabase';
import { GuestGate } from '@/components/layout';
import { AlertsView } from '@/components/alerts-view';

export default function Alerts() {
  const { t, session, ready, openLogin, refreshUnread } = useApp();
  const [list, setList] = useState<Notice[] | null>(null);

  useEffect(() => {
    if (!session) return;
    const db = sb();
    db.from('aj_notifications')
      .select(`id, kind, body, delta, read_at, created_at, app_id, actor:aj_profiles!aj_notifications_actor_id_fkey(${PERSON}), app:aj_apps(id, name, icon_url, owner_id)`)
      .in('kind', ['got', 'comment', 'helpful', 'visit'])
      .order('created_at', { ascending: false }).limit(50)
      .then(async ({ data }) => {
        setList((data as unknown as Notice[]) || []);
        await db.from('aj_notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
        refreshUnread();
      });
  }, [session, refreshUnread]);

  if (ready && !session) return <GuestGate title={t.alerts} onLogin={() => openLogin()} />;
  return <AlertsView list={list} myId={session?.user.id} />;
}
