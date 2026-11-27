'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/ctx';
import type { App } from '@/lib/supabase';
import { loadApps } from '@/lib/data';
import { loadBoard, loadMyJoinIds, recruitOf, type Board } from '@/lib/test';
import { HomeView, guessDevice, type Device } from '@/components/home-view';
import { Failed } from '@/components/layout';
import { bonusOf } from '@/components/test-view';

export default function Home() {
  const { country, gotIds, myApps, session } = useApp();
  const [failed, setFailed] = useState(false);
  const [try_, setTry] = useState(0);
  const [apps, setApps] = useState<App[] | null>(null);
  const [board, setBoard] = useState<Board>(new Map());
  const [cat, setCat] = useState('all');
  const [device, setDevice] = useState<Device>('all');
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const uid = session?.user.id;
  useEffect(() => { if (uid) loadMyJoinIds(uid).then(setSkip); else setSkip(new Set()); }, [uid]);
  useEffect(() => { setDevice(guessDevice()); loadBoard().then(setBoard); const c = new URLSearchParams(location.search).get('cat'); if (c) setCat(c); }, []);
  useEffect(() => { setFailed(false); loadApps(country).then(setApps).catch(() => setFailed(true)); }, [country, myApps.length, try_]);
  // 테스터 모집 중(사람 덜 참)인 앱: 아이콘 아래 🎫+n. 내 앱·내가 참여했던 앱은 뺌
  const testIds = useMemo(() => new Map((apps || []).flatMap((a) => {
    if (a.owner_id === uid || skip.has(a.id)) return [];
    const r = recruitOf(board, a); return r ? [[a.id, { n: bonusOf(r), stake: (r.stake || 0) > 0 }] as const] : [];
  })), [apps, board, uid, skip]);
  if (failed && !apps) return <Failed onRetry={() => setTry((n) => n + 1)} />;
  return <HomeView apps={apps} cat={cat} setCat={setCat} gotIds={gotIds} heap testIds={testIds}
    device={device} setDevice={(d) => { setDevice(d); setCat('all'); }} />;
}
