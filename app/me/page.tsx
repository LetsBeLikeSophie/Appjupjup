'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, APP_FIELDS, type App } from '@/lib/supabase';
import { GuestGate, Loading } from '@/components/layout';
import { MeView } from '@/components/me-view';
import { UploadSheet } from '@/components/sheets';
import { MyAppSheet } from '@/components/myapp-sheet';

export default function Me() {
  const { t, session, profile, ready, openLogin, refreshProfile, setUploadOpen, setProfileOpen, toast } = useApp();
  const [apps, setApps] = useState<App[]>([]);
  const [editing, setEditing] = useState<App | null>(null);

  const loadApps = useCallback(() => {
    if (!session) return;
    sb().from('aj_apps').select(APP_FIELDS).eq('owner_id', session.user.id).order('created_at')
      .then(({ data }) => setApps((data as unknown as App[]) || []));
  }, [session]);
  useEffect(loadApps, [loadApps]);

  if (ready && !session) return <GuestGate title={t.me} onLogin={() => openLogin({ type: 'upload' })} />;
  if (!profile) return <Loading />;

  const save = async (patch: Record<string, string>) => {
    const { error } = await sb().from('aj_profiles').update(patch).eq('id', profile.id);
    if (error) toast(t.errGeneric); else refreshProfile();
  };

  return (
    <>
      <MeView profile={profile} apps={apps} onEditApp={setEditing} onUpload={() => setUploadOpen(true)} onEditProfile={() => setProfileOpen(true)}
        onSave={save} onLogout={async () => { await sb().auth.signOut(); location.href = '/'; }} />
      <UploadSheet onDone={loadApps} />
      <MyAppSheet app={editing} onClose={() => setEditing(null)} onChanged={loadApps} />
    </>
  );
}
