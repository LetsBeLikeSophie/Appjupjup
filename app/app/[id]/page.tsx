'use client';
import { use, useEffect, useState } from 'react';
import { sb, APP_FIELDS, type App } from '@/lib/supabase';
import { AppDetail } from '@/components/cards';
import { useApp } from '@/lib/ctx';

export default function AppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useApp();
  const [app, setApp] = useState<App | null | undefined>(undefined);
  useEffect(() => {
    sb().from('aj_apps').select(APP_FIELDS).eq('id', id).maybeSingle().then(({ data }) => setApp(data as unknown as App | null));
  }, [id]);
  if (app === undefined) return <div className="sub center pad40">{t.loading}</div>;
  if (!app) return <div className="sub center pad40">404</div>;
  return <div className="overlay static"><AppDetail apps={[app]} start={0} /></div>;
}
