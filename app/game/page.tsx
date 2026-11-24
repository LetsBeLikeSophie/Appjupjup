'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/ctx';
import type { App } from '@/lib/supabase';
import { loadApps } from '@/lib/data';
import { filterApps } from '@/components/home-view';
import { GameView } from '@/components/game-view';

export default function Game() {
  const { country, session } = useApp();
  const router = useRouter();
  const [pool, setPool] = useState<App[] | null>(null);
  useEffect(() => {
    const cat = new URLSearchParams(location.search).get('cat') || 'all';
    loadApps(country).then((list) => {
      const mine = (a: App) => a.owner_id === session?.user.id;
      const inCat = filterApps(list, cat).filter((a) => !mine(a));
      // 카테고리에 앱이 너무 적으면 전체에서
      setPool(inCat.length >= 2 ? inCat : list.filter((a) => !mine(a)));
    });
  }, [country, session]);
  return <GameView pool={pool} onClose={() => (history.length > 1 ? router.back() : router.push('/'))} />;
}
