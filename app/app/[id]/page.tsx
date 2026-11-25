'use client';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, errKey } from '@/lib/ctx';
import { sb, type App, type Comment, type Person } from '@/lib/supabase';
import { loadApp, loadComments } from '@/lib/data';
import { DetailView } from '@/components/detail-view';
import { PersonSheet } from '@/components/person-sheet';

export default function AppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t, session, profile, myApps, openLogin, toast, refreshProfile } = useApp();
  const [app, setApp] = useState<App | null | undefined>(undefined);
  const [from, setFrom] = useState<App | null>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [person, setPerson] = useState<Person | null>(null);

  const reload = useCallback(() => loadComments(id).then(setComments), [id]);
  useEffect(() => {
    loadApp(id).then(setApp);
    reload();
    const f = new URLSearchParams(location.search).get('from');
    if (f) loadApp(f).then(setFrom);
  }, [id, reload]);

  const me = useMemo<Person | null>(() => profile && ({
    id: profile.id, nickname: profile.nickname, tag: profile.tag, score: profile.score,
    apps: myApps.map((a) => ({ id: a.id, name: a.name, icon_url: a.icon_url, is_primary: a.is_primary })),
  }), [profile, myApps]);

  if (app === undefined) return <div className="loading">{t.loading}</div>;
  if (!app) return <div className="loading">404</div>;

  return (
    <>
      <DetailView app={app} comments={comments} me={me} from={from} h={{
        onSend: async (body) => {
          if (!session) { openLogin(); return false; }
          const { data, error } = await sb().rpc('aj_comment', { p_app: app.id, p_body: body });
          if (error) { const k = errKey(error); toast(k === 'badword' ? t.fbBad : k === 'too_fast' ? t.tooFast : t.errGeneric); return false; }
          if (data?.delta) { toast(`🤝 +${data.delta}`); refreshProfile(); } else toast(t.commented);
          reload();
          return true;
        },
        onHelpful: async (c) => { const { error } = await sb().rpc('aj_mark_helpful', { p_feedback: c.id }); if (!error) reload(); },
        onReport: async (c) => { await sb().rpc('aj_report_feedback', { p_feedback: c.id }); toast('✓ ' + t.report); },
        onDelete: async (c) => { if (!confirm(t.remove + '?')) return; await sb().rpc('aj_delete_comment', { p_id: c.id }); reload(); },
        onPerson: setPerson,
        onBack: () => (history.length > 1 ? router.back() : router.push('/')),
        onShare: async () => {
          const url = `${location.origin}/app/${app.id}`;
          try { if (navigator.share) await navigator.share({ title: app.name, url }); else { await navigator.clipboard.writeText(url); toast(t.copied); } } catch {}
        },
      }} />
      <PersonSheet person={person} onClose={() => setPerson(null)} />
    </>
  );
}
