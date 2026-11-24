'use client';
// 시험용: 가짜 앱으로 홈이 꽉 찼을 때·밸런스 게임 보기. /demo?n=120 (실제 데이터 안 건드림)
import { useEffect, useMemo, useState } from 'react';
import { fakeApps } from '@/lib/demo';
import { HomeView, filterApps } from '@/components/home-view';
import { GameView } from '@/components/game-view';

export default function Demo() {
  const [n, setN] = useState<number | null>(null);
  const [cat, setCat] = useState('all');
  const [game, setGame] = useState(false);
  useEffect(() => { setN(Math.min(300, Math.max(2, Number(new URLSearchParams(location.search).get('n')) || 120))); }, []);
  const apps = useMemo(() => (n ? fakeApps(n) : null), [n]);
  const got = useMemo(() => new Set(['demo4', 'demo9', 'demo20']), []);
  if (!apps) return null;
  if (game) {
    const inCat = filterApps(apps, cat);
    return <GameView pool={inCat.length >= 2 ? inCat : apps} onClose={() => setGame(false)} />;
  }
  return (
    <div onClickCapture={(e) => {
      const a = (e.target as HTMLElement).closest('a');
      if (!a) return;
      e.preventDefault();
      if (a.classList.contains('game-btn')) setGame(true);
    }}>
      <HomeView apps={apps} cat={cat} setCat={setCat} gotIds={got} gameHref="#" hrefOf={() => '#'} />
    </div>
  );
}
