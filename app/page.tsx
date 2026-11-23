'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, APP_FIELDS, devicePlatform, type App } from '@/lib/supabase';
import { StackCard, AppDetail } from '@/components/cards';
import { PromiseChip } from '@/components/ui';
import { Loading } from '@/components/layout';

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
    // 모든 사람의 앱을 다 보여주고, 내 폰에서 받을 수 있는 앱을 위로
    q.then(({ data, count }) => {
      const list = (data as unknown as App[]) || [];
      const fit = (a: App) => (plat === 'all' || a.platform === plat ? 0 : 1);
      setApps([...list].sort((a, b) => fit(a) - fit(b)));
      setTotal(count || 0);
    });
  }, [country]);

  return (
    <div className="home">
      <header className="home-head">
        <div className="page-head">
          <h1 className="t-title">{t.appName}</h1>
          {profile && <a href="/me" aria-label={t.score}><PromiseChip value={profile.score} tone="white" /></a>}
        </div>
        <span className="t-sub">{t.totalApps} {total}</span>
      </header>
      <div className="cards">
        {apps === null && <Loading />}
        {apps?.length === 0 && <div className="loading">{t.empty}</div>}
        {apps?.map((a, i) => <StackCard key={a.id} app={a} onOpen={() => setOpen(i)} />)}
      </div>
      {open !== null && apps && (
        <div className="overlay grow-in"><AppDetail apps={apps} start={open} onClose={() => setOpen(null)} /></div>
      )}
    </div>
  );
}
