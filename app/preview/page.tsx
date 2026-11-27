'use client';
// 로그인 없이 가짜 데이터로 화면 확인 (내 컴퓨터 localhost에서만). /preview?s=home|game|detail|me|alerts|welcome|login|person
import { useEffect, useState } from 'react';
import { APPS, COMMENTS, NOTICES, me, people, profile, TEST, TEST_H } from '@/lib/demo';
import { HomeView } from '@/components/home-view';
import { GameView } from '@/components/game-view';
import { DetailView } from '@/components/detail-view';
import { MeView } from '@/components/me-view';
import { AlertsView } from '@/components/alerts-view';
import { PersonSheet } from '@/components/person-sheet';
import { LoginSheet, WelcomeSheet } from '@/components/sheets';

const noop = () => {};
export default function Preview() {
  const [s, setS] = useState<string | null>(null);
  const [cat, setCat] = useState('all');
  useEffect(() => { setS(new URLSearchParams(location.search).get('s') || 'home'); }, []);
  if (s === null) return null;
  if (location.hostname !== 'localhost') return <div className="loading">404</div>;
  const got = new Set(['a3', 'a7']);
  const sample = APPS.slice(0, 3);
  switch (s) {
    case 'home': return <HomeView apps={APPS} cat={cat} setCat={setCat} gotIds={got} hrefOf={() => '#'} />;
    case 'game': return <GameView pool={APPS.filter((a) => a.owner_id !== 'me')} onClose={noop} />;
    case 'detail': return <DetailView app={APPS[1]} comments={COMMENTS} me={me} from={APPS[10]}
      h={{ onSend: async () => true, onHelpful: noop, onReport: noop, onDelete: noop, onPerson: noop, onBack: noop, onShare: noop }} />;
    case 'me': return <MeView profile={profile} apps={[APPS[10], APPS[5]].map((a, i) => ({ ...a, is_primary: i === 0 }))} gotApps={APPS.slice(0, 7)} findHref="/demo?cat=test" onEditApp={noop} onUpload={noop} onSettings={noop} test={TEST} testH={TEST_H} />;
    case 'alerts': return <AlertsView list={NOTICES} myId="me" />;
    case 'welcome': return <WelcomeSheet sample={sample} force />;
    case 'login': return <LoginSheet sample={sample} force />;
    case 'person': return <PersonSheet person={people[1]} onClose={noop} />;
    default: return null;
  }
}
