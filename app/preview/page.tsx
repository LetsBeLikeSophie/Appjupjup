'use client';
// 로그인 없이 가짜 데이터로 화면 확인 (내 컴퓨터 localhost에서만). /preview?s=home|game|detail|me|alerts|welcome|login|person
import { useEffect, useState } from 'react';
import type { App, Comment, Notice, Person, Profile } from '@/lib/supabase';
import { HomeView } from '@/components/home-view';
import { GameView } from '@/components/game-view';
import { DetailView } from '@/components/detail-view';
import { MeView } from '@/components/me-view';
import { AlertsView } from '@/components/alerts-view';
import { PersonSheet } from '@/components/person-sheet';
import { LoginSheet, WelcomeSheet } from '@/components/sheets';

const icon = (bg: string, e: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><text x="50" y="66" font-size="48" text-anchor="middle">${e}</text></svg>`)}`;
const shot = (bg: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 180"><rect width="90" height="180" fill="${bg}"/><rect x="10" y="20" width="70" height="10" rx="5" fill="#fff" opacity=".7"/><rect x="10" y="40" width="50" height="8" rx="4" fill="#fff" opacity=".5"/></svg>`)}`;

const SEED: [string, string, string, string, string][] = [
  ['데일리컷', '#F0A35E', '☀️', 'photo', '하루 한 장, 3초 보정'],
  ['세줄일기', '#5B7FD6', '📓', 'life', '하루 세 줄이면 끝'],
  ['물주기', '#5DAF6A', '🌱', 'life', '화분 물 줄 날 알려줘요'],
  ['필름로그', '#D66B95', '📷', 'photo', '찍은 사진을 필름처럼'],
  ['흥얼', '#8B7BE0', '🎵', 'fun', '흥얼거리면 노래 찾기'],
  ['냉장고털이', '#E3A33A', '🍳', 'life', '있는 재료로 오늘 메뉴'],
  ['할일3개', '#3FA597', '✅', 'productivity', '하루 딱 세 개만'],
  ['동네산책', '#E07A58', '📍', 'health', '오늘 걸은 길 지도'],
  ['잠들기', '#5C6B80', '🌙', 'health', '빗소리 틀고 바로 잠'],
  ['커피일지', '#9C7A4C', '☕', 'life', '오늘 마신 커피 기록'],
  ['한마디', '#2F9BD6', '💬', 'edu', '하루 한 문장 외국어'],
  ['블록쌓기', '#C9534F', '🧱', 'game', '한 손으로 쌓는 퍼즐'],
];
const now = Date.now();
const iso = (daysAgo: number) => new Date(now - daysAgo * 86400000).toISOString();

const people: Person[] = [
  { id: 'u1', nickname: '줍줍이', tag: 2817, score: 103, apps: [] },
  { id: 'u2', nickname: 'x', tag: 1111, score: 118, apps: [] },
  { id: 'u3', nickname: 'x', tag: 2222, score: 124, apps: [] },
];
const APPS: App[] = SEED.map(([name, bg, e, category, tagline], i) => ({
  id: `a${i}`, owner_id: i === 10 ? 'me' : i === 1 ? 'u3' : 'u2', platform: i % 3 ? 'android' : 'ios', stage: 'live', url: 'https://play.google.com/store/apps/details?id=x',
  name, icon_url: icon(bg, e), screenshots: [shot(bg), shot(bg + 'CC'), shot(bg)], is_primary: true,
  feedback_count: [0, 5, 0, 1, 0, 2, 0, 3, 0, 0, 0, 1][i], countries: ['KR'], all_countries: i % 2 === 0, tagline,
  category, released_at: i === 0 || i === 2 ? iso(3) : iso(200), store_updated_at: iso(5), created_at: iso(30),
}));
people[1].apps = [{ id: 'a10', name: '한마디', icon_url: APPS[10].icon_url, is_primary: true }, { id: 'a7', name: '동네산책', icon_url: APPS[7].icon_url, is_primary: false }];
people[2].apps = [{ id: 'a1', name: '세줄일기', icon_url: APPS[1].icon_url, is_primary: true }];
APPS.forEach((a) => { a.owner = a.owner_id === 'u3' ? people[2] : people[1]; });

const profile: Profile = { id: 'me', nickname: '줍줍이', avatar_url: null, score: 118, country: 'KR', locale: 'ko', setup_done: true, tag: 4821 };
const me: Person = { id: 'me', nickname: '줍줍이', tag: 4821, score: 118, apps: [{ id: 'a10', name: '한마디', icon_url: APPS[10].icon_url, is_primary: true }, { id: 'a5', name: '냉장고털이', icon_url: APPS[5].icon_url, is_primary: false }] };

const COMMENTS: Comment[] = [
  { id: 'c1', app_id: 'a1', author_id: 'u2', body: '사진 고르는 게 빨라요', helpful_count: 1, created_at: iso(0.01), author: people[1] },
  { id: 'c2', app_id: 'a1', author_id: 'u3', body: '감사해요! 한마디도 써 볼게요', helpful_count: 0, created_at: iso(0.005), author: people[2] },
  { id: 'c3', app_id: 'a1', author_id: 'u1', body: '아이콘 귀엽다 ㅋㅋ', helpful_count: 0, created_at: iso(1), author: people[0] },
];
const NOTICES: Notice[] = [
  { id: 'n1', kind: 'comment', body: '번역이 자연스러워요', delta: null, read_at: null, created_at: iso(0.01), app_id: 'a10', actor: people[2], app: { id: 'a10', name: '한마디', icon_url: APPS[10].icon_url, owner_id: 'me' } },
  { id: 'n2', kind: 'helpful', body: '재료 검색이 느려요', delta: 3, read_at: null, created_at: iso(1), app_id: 'a5', actor: people[1], app: { id: 'a5', name: '냉장고털이', icon_url: APPS[5].icon_url, owner_id: 'u2' } },
  { id: 'n3', kind: 'got', body: null, delta: null, read_at: iso(1), created_at: iso(3), app_id: 'a10', actor: people[0], app: { id: 'a10', name: '한마디', icon_url: APPS[10].icon_url, owner_id: 'me' } },
  { id: 'n4', kind: 'visit', body: null, delta: null, read_at: iso(1), created_at: iso(4), app_id: 'a10', actor: people[2], app: { id: 'a10', name: '한마디', icon_url: APPS[10].icon_url, owner_id: 'me' } },
];

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
    case 'home': return <HomeView apps={APPS} cat={cat} setCat={setCat} gotIds={got} />;
    case 'game': return <GameView pool={APPS.filter((a) => a.owner_id !== 'me')} onClose={noop} />;
    case 'detail': return <DetailView app={APPS[1]} comments={COMMENTS} me={me} from={APPS[10]}
      h={{ onSend: async () => true, onHelpful: noop, onReport: noop, onDelete: noop, onPerson: noop, onBack: noop, onShare: noop }} />;
    case 'me': return <MeView profile={profile} apps={[APPS[10], APPS[5]].map((a, i) => ({ ...a, is_primary: i === 0 }))} gotApps={APPS.slice(0, 7)} commentCount={7} onEditApp={noop} onUpload={noop} onSettings={noop} />;
    case 'alerts': return <AlertsView list={NOTICES} myId="me" />;
    case 'welcome': return <WelcomeSheet sample={sample} force />;
    case 'login': return <LoginSheet sample={sample} force />;
    case 'person': return <PersonSheet person={people[1]} onClose={noop} />;
    default: return null;
  }
}
