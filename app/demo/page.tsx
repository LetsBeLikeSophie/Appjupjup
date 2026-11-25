'use client';
// 시험용: 가짜 앱으로 홈이 꽉 찼을 때·밸런스 게임 보기. /demo?n=120 (실제 데이터 안 건드림)
import { useEffect, useMemo, useState } from 'react';
import { fakeApps, recruitOf } from '@/lib/demo';
import { HomeView, filterApps, byDevice, guessDevice, type Device } from '@/components/home-view';
import { GameView } from '@/components/game-view';
import { DetailView } from '@/components/detail-view';
import type { App } from '@/lib/supabase';

const noop = () => {};

export default function Demo() {
  const [n, setN] = useState<number | null>(null);
  const [cat, setCat] = useState('all');
  const [game, setGame] = useState(false);
  const [device, setDevice] = useState<Device>('all');
  const [pick, setPick] = useState<App | null>(null);
  useEffect(() => { setDevice(guessDevice()); setN(Math.min(300, Math.max(2, Number(new URLSearchParams(location.search).get('n')) || 120))); }, []);
  const apps = useMemo(() => (n ? fakeApps(n) : null), [n]);
  const got = useMemo(() => new Set(['demo4', 'demo9', 'demo20']), []);
  const testIds = useMemo(() => new Set((apps || []).filter((a) => recruitOf(a)).map((a) => a.id)), [apps]);
  if (!apps) return null;
  if (game) {
    const mine = byDevice(apps, device).length >= 2 ? byDevice(apps, device) : apps;
    const inCat = filterApps(mine, cat);
    return <GameView pool={inCat.length >= 2 ? inCat : mine} onClose={() => setGame(false)} />;
  }
  return (
    <div onClickCapture={(e) => {
      const a = (e.target as HTMLElement).closest('a');
      if (!a) return;
      e.preventDefault();
      if (a.classList.contains('game-btn')) setGame(true);
    }}>
      <HomeView apps={apps} cat={cat} setCat={setCat} gotIds={got} gameHref="#" hrefOf={() => "#"} heap testIds={testIds} onPick={setPick} device={device} setDevice={(d) => { setDevice(d); setCat('all'); }} />
      {pick && (
        <div className="demo-detail">
          <DetailView app={pick} comments={[]} me={null} from={null} recruit={recruitOf(pick)}
            h={{ onSend: async () => true, onHelpful: noop, onReport: noop, onDelete: noop, onPerson: noop, onBack: () => setPick(null), onShare: noop }} />
        </div>
      )}
    </div>
  );
}
