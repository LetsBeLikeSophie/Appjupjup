'use client';
// 시험용: 내 정보 (가짜 데이터)
import { MeView } from '@/components/me-view';
import { APPS, profile, TEST, TEST_H } from '@/lib/demo';

const noop = () => {};
export default function DemoMe() {
  return <MeView profile={profile} apps={[APPS[10], APPS[5]].map((a, i) => ({ ...a, is_primary: i === 0 }))} gotApps={APPS.slice(0, 7)} commentCount={7} onEditApp={noop} onUpload={noop} onSettings={noop} test={TEST} testH={TEST_H} />;
}
