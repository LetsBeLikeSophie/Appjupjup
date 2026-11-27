'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/ctx';
import type { App } from '@/lib/supabase';
import { loadApps } from '@/lib/data';
import { byDevice, filterApps, guessDevice, type Device } from '@/components/home-view';
import { GameView } from '@/components/game-view';
import { loadBoard } from '@/lib/test';

export default function Game() {
  const { country, session } = useApp();
  const router = useRouter();
  const [pool, setPool] = useState<App[] | null>(null);
  const [boost, setBoost] = useState<Set<string>>();
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const cat = q.get('cat') || 'all';
    const d = q.get('device');
    const device: Device = d === 'all' || d === 'android' || d === 'ios' ? d : guessDevice();
    loadBoard().then((b) => setBoost(new Set([...b].filter(([, r]) => r.stake > 0 && r.joined < r.need).map(([id]) => id))));
    loadApps(country).then((list) => {
      const mine = (a: App) => a.owner_id === session?.user.id;
      // 내 폰에서 받을 수 있는 앱만 (아이폰에 안드로이드 앱 우승 막기)
      const onDevice = byDevice(list, device).filter((a) => !mine(a));
      const inCat = filterApps(onDevice, cat);
      // 카테고리에 앱이 너무 적으면 전체에서
      setPool(inCat.length >= 2 ? inCat : onDevice);
    }).catch(() => setPool([]));
  }, [country, session]);
  return <GameView pool={boost ? pool : null} boost={boost} onClose={() => (history.length > 1 ? router.back() : router.push('/'))} />;
}
