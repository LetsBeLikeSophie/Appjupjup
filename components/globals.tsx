'use client';
import { useEffect, useState } from 'react';
import { sb, type App } from '@/lib/supabase';
import { PickedPop, Toast } from './ui';
import { TabBar } from './layout';
import { LoginSheet, UploadSheet, WelcomeSheet } from './sheets';

/** 모든 화면에 떠 있는 것들: 메뉴·시트·토스트 */
export function Globals() {
  const [sample, setSample] = useState<Pick<App, 'id' | 'icon_url'>[]>([]);
  useEffect(() => {
    sb().from('aj_apps').select('id, icon_url').not('icon_url', 'is', null).limit(12)
      .then(({ data }) => setSample(((data || []) as Pick<App, 'id' | 'icon_url'>[]).sort(() => Math.random() - 0.5).slice(0, 3)));
  }, []);
  return (
    <>
      <TabBar />
      <WelcomeSheet sample={sample} />
      <LoginSheet sample={sample} />
      <UploadSheet />
      <PickedPop />
      <Toast />
    </>
  );
}
