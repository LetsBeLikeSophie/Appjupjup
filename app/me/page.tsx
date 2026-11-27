'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, type App } from '@/lib/supabase';
import { GuestGate, Loading } from '@/components/layout';
import { MeView, SettingsSheet } from '@/components/me-view';
import { MyAppSheet } from '@/components/myapp-sheet';
import type { TestData } from '@/components/test-view';
import { loadTest, testErrMsg, testHandlers } from '@/lib/test';

type Lite = Pick<App, 'id' | 'name' | 'icon_url'>;

export default function Me() {
  const { t, session, profile, ready, myApps, gotIds, openLogin, refreshProfile, refreshMine, refreshTestDue, setUploadOpen, toast } = useApp();
  const [test, setTest] = useState<TestData | null>(null);
  const [rev, setRev] = useState(0);
  const [gotApps, setGotApps] = useState<Lite[]>([]);
  const [editing, setEditing] = useState<App | null>(null);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    if (!session) return;
    sb().from('aj_downloads').select('app:aj_apps(id, name, icon_url)').eq('user_id', session.user.id).order('created_at', { ascending: false })
      .then(({ data }) => setGotApps(((data || []) as unknown as { app: Lite | null }[]).map((d) => d.app).filter(Boolean) as Lite[]));
  }, [session, gotIds]);

  useEffect(() => {
    if (!session) return;
    loadTest(session.user.id, myApps, profile?.tickets ?? 0).then(setTest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, myApps, rev]);
  const testH = useMemo(() => session ? testHandlers({
    uid: session.user.id, toast,
    err: (m) => toast(testErrMsg(t as unknown as Record<string, string>, m)),
    after: () => { refreshProfile(); refreshTestDue(); setRev((n) => n + 1); },
  }) : null, [session, toast, t, refreshProfile, refreshTestDue]);

  if (ready && !session) return <GuestGate title={t.me} onLogin={() => openLogin()} />;
  if (!profile || !testH) return <Loading />;

  const save = async (patch: Record<string, string>) => {
    const { error } = await sb().from('aj_profiles').update(patch).eq('id', profile.id);
    if (error) toast(t.errGeneric); else refreshProfile();
  };

  return (
    <>
      <MeView profile={profile} apps={myApps} gotApps={gotApps} findHref="/?cat=test"
        onEditApp={setEditing} onUpload={() => setUploadOpen(true)} onSettings={() => setSettings(true)} test={test} testH={testH} />
      <SettingsSheet open={settings} profile={profile} onClose={() => setSettings(false)} onSave={save}
        onLogout={async () => { await sb().auth.signOut(); location.href = '/'; }} />
      <MyAppSheet app={editing} onClose={() => setEditing(null)} onChanged={refreshMine} test={test?.mine.find((m) => m.app.id === editing?.id)} testH={testH} />
    </>
  );
}
