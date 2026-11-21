'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, APP_FIELDS, devicePlatform, type App } from '@/lib/supabase';
import { StackCard, AppDetail } from '@/components/cards';
import { PromiseChip } from '@/components/ui';

export default function Home() {
  const { t, country, profile } = useApp();
  const [apps, setApps] = useState<App[] | null>(null);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const plat = devicePlatform();
    let q = sb().from('aj_apps').select(APP_FIELDS, { count: 'exact' })
      .or(`all_countries.eq.true,countries.cs.{${country}}`)
      .order('feedback_count', { ascending: true }).order('created_at', { ascending: false }).limit(60);
    if (plat !== 'all') q = q.eq('platform', plat);
    q.then(({ data, count }) => { setApps((data as unknown as App[]) || []); setTotal(count || 0); });
  }, [country]);

  return (
    <div className="home">
      <header className="home-head">
        <div className="logo">{t.appName}</div>
        <div className="row between end">
          <div>
            <div className="sub">{t.totalApps}</div>
            <div className="big">{total}<span>{t.apps}</span></div>
          </div>
          {profile && <a href="/me" aria-label={t.score}><PromiseChip value={profile.score} bg="#FFFFFF" /></a>}
        </div>
      </header>
      <div className="panel">
        {apps === null && <div className="sub center">{t.loading}</div>}
        {apps?.length === 0 && <div className="sub center">{t.empty}</div>}
        {apps?.map((a, i) => <StackCard key={a.id} app={a} onOpen={() => setOpen(i)} />)}
      </div>
      {open !== null && apps && (
        <div className="overlay grow-in"><AppDetail apps={apps} start={open} onClose={() => setOpen(null)} /></div>
      )}
    </div>
  );
}
