'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/ctx';
import type { App } from '@/lib/supabase';
import { loadApps } from '@/lib/data';
import { loadBoard, recruitOf, type Board } from '@/lib/test';
import { HomeView, guessDevice, type Device } from '@/components/home-view';

export default function Home() {
  const { country, gotIds } = useApp();
  const [apps, setApps] = useState<App[] | null>(null);
  const [board, setBoard] = useState<Board>(new Map());
  const [cat, setCat] = useState('all');
  const [device, setDevice] = useState<Device>('all');
  useEffect(() => { setDevice(guessDevice()); loadBoard().then(setBoard); }, []);
  useEffect(() => { loadApps(country).then(setApps); }, [country]);
  // 테스터 모집 중(사람 덜 참)인 앱: 아이콘에 플라스크
  const testIds = useMemo(() => new Map((apps || []).flatMap((a) => { const r = recruitOf(board, a); return r ? [[a.id, (r.stake || 0) > 0 ? 'stake' : 'test'] as const] : []; })), [apps, board]);
  return <HomeView apps={apps} cat={cat} setCat={setCat} gotIds={gotIds} heap testIds={testIds}
    device={device} setDevice={(d) => { setDevice(d); setCat('all'); }} />;
}
