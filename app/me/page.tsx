'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, type App } from '@/lib/supabase';
import { GuestGate, Loading } from '@/components/layout';
import { MeView, SettingsSheet } from '@/components/me-view';
import { MyAppSheet } from '@/components/myapp-sheet';

type Lite = Pick<App, 'id' | 'name' | 'icon_url'>;

export default function Me() {
  const { t, session, profile, ready, myApps, gotIds, openLogin, refreshProfile, refreshMine, setUploadOpen, toast } = useApp();
  const [gotApps, setGotApps] = useState<Lite[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [editing, setEditing] = useState<App | null>(null);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    if (!session) return;
    sb().from('aj_downloads').select('app:aj_apps(id, name, icon_url)').eq('user_id', session.user.id).order('created_at', { ascending: false })
      .then(({ data }) => setGotApps(((data || []) as unknown as { app: Lite | null }[]).map((d) => d.app).filter(Boolean) as Lite[]));
    sb().from('aj_feedback').select('id', { count: 'exact', head: true }).eq('author_id', session.user.id)
      .then(({ count }) => setCommentCount(count || 0));
  }, [session, gotIds]);

  if (ready && !session) return <GuestGate title={t.me} onLogin={() => openLogin()} />;
  if (!profile) return <Loading />;

  const save = async (patch: Record<string, string>) => {
    const { error } = await sb().from('aj_profiles').update(patch).eq('id', profile.id);
    if (error) toast(t.errGeneric); else refreshProfile();
  };

  return (
    <>
      <MeView profile={profile} apps={myApps} gotApps={gotApps} commentCount={commentCount}
        onEditApp={setEditing} onUpload={() => setUploadOpen(true)} onSettings={() => setSettings(true)} />
      <SettingsSheet open={settings} profile={profile} onClose={() => setSettings(false)} onSave={save}
        onLogout={async () => { await sb().auth.signOut(); location.href = '/'; }} />
      <MyAppSheet app={editing} onClose={() => setEditing(null)} onChanged={refreshMine} />
    </>
  );
}
