'use client';
// 시험용: 내 정보 (가짜 데이터). 내 앱을 누르면 테스트 + 고치기 시트
import { useState } from 'react';
import { MeView } from '@/components/me-view';
import { MyAppSheet } from '@/components/myapp-sheet';
import { APPS, profile, TEST, TEST_H } from '@/lib/demo';
import type { App } from '@/lib/supabase';

const noop = () => {};
const MINE = [APPS[10], APPS[5]].map((a, i) => ({ ...a, is_primary: i === 0 }));
export default function DemoMe() {
  const [editing, setEditing] = useState<App | null>(null);
  return (
    <>
      <MeView profile={profile} apps={MINE} gotApps={APPS.slice(0, 7)} findHref="/demo?cat=test" onEditApp={setEditing} onUpload={noop} onSettings={noop} test={TEST} testH={TEST_H} />
      <MyAppSheet app={editing} onClose={() => setEditing(null)} onChanged={noop} test={TEST.mine.find((m) => m.app.id === editing?.id)} testH={TEST_H} />
    </>
  );
}
