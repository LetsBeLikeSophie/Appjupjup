'use client';
// 시험용: 알림 (가짜 데이터)
import { AlertsView } from '@/components/alerts-view';
import { NOTICES } from '@/lib/demo';

export default function DemoAlerts() {
  return <AlertsView list={NOTICES} myId="me" />;
}
