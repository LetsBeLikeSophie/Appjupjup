'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/ctx';
import type { App } from '@/lib/supabase';
import { loadApps } from '@/lib/data';
import { HomeView } from '@/components/home-view';

export default function Home() {
  const { country, gotIds } = useApp();
  const [apps, setApps] = useState<App[] | null>(null);
  const [cat, setCat] = useState('all');
  useEffect(() => { loadApps(country).then(setApps); }, [country]);
  return <HomeView apps={apps} cat={cat} setCat={setCat} gotIds={gotIds} />;
}
