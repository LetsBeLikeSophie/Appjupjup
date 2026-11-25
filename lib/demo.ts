// 가짜 앱 데이터 (시험용 /demo, /preview)
import type { App, Comment, Notice, Person, Profile } from './supabase';
import type { Joined, MyTest, Recruit, TestData } from '@/components/test-view';

export const fakeIcon = (bg: string, e: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bg}"/><text x="50" y="66" font-size="48" text-anchor="middle">${e}</text></svg>`)}`;
export const fakeShot = (bg: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 180"><rect width="90" height="180" fill="${bg}"/><rect x="10" y="20" width="70" height="10" rx="5" fill="#fff" opacity=".7"/><rect x="10" y="40" width="50" height="8" rx="4" fill="#fff" opacity=".5"/></svg>`)}`;

const COLORS = ['#F0A35E', '#5B7FD6', '#5DAF6A', '#D66B95', '#8B7BE0', '#E3A33A', '#3FA597', '#E07A58', '#5C6B80', '#9C7A4C', '#2F9BD6', '#C9534F', '#7FB3A8', '#B57EDC', '#F2C14E', '#4E9F8E'];
const KINDS: [string, string[], string[]][] = [
  ['game', ['🧱', '🎲', '🕹️', '🐸', '🚀', '🧩'], ['블록', '점프', '퍼즐', '탈출', '타워', '냥냥']],
  ['photo', ['📷', '☀️', '🎞️', '🖼️'], ['필름', '데일리컷', '사진첩', '빛']],
  ['life', ['🌱', '🍳', '☕', '🛒', '🏠'], ['물주기', '냉장고', '커피', '장보기', '집안일']],
  ['health', ['🌙', '📍', '💧', '🧘'], ['잠들기', '산책', '물 마시기', '스트레칭']],
  ['productivity', ['✅', '📓', '⏱️', '📌'], ['할일', '세줄', '집중', '메모']],
  ['edu', ['💬', '📚', '🔤'], ['한마디', '단어', '책갈피']],
  ['fun', ['🎵', '🎨', '😂'], ['흥얼', '낙서', '짤']],
  ['money', ['💰', '🧾'], ['가계부', '영수증']],
  ['tools', ['🔦', '📐', '🔋'], ['손전등', '줄자', '배터리']],
];
const SUFFIX = ['', '로그', '일기', '노트', '타임', '친구', '메이트', '플러스', '하루', '톡'];
const LINES = ['나 써봐요!', '광고 없어요', '오늘 업뎃함 ✨', '3초면 끝!', '심심하면 나', '물 마셨어?', '하루 1분이면 끝', '친구랑 같이', '한 손으로 쓱', '나 새로 나옴'];

/** 시드로 고정된 가짜 앱 n개 */
export function fakeApps(n: number): App[] {
  const now = Date.now();
  const iso = (d: number) => new Date(now - d * 86400000).toISOString();
  const owner: Person = { id: 'demo-owner', nickname: '줍줍이', tag: 1234, score: 112, apps: [] };
  const out: App[] = [];
  for (let i = 0; i < n; i++) {
    const [category, emojis, words] = KINDS[(i * 7) % KINDS.length];
    const bg = COLORS[(i * 5) % COLORS.length];
    const name = words[i % words.length] + SUFFIX[(i * 3) % SUFFIX.length];
    out.push({
      id: `demo${i}`, owner_id: owner.id, platform: i % 3 ? 'android' : 'ios', stage: 'live',
      url: 'https://play.google.com/store/apps/details?id=dev.itssophie.demo',
      name, icon_url: fakeIcon(bg, emojis[i % emojis.length]), screenshots: [fakeShot(bg), fakeShot(bg + 'CC'), fakeShot(bg)],
      is_primary: true, feedback_count: (i * 13) % 7 === 0 ? (i % 9) + 1 : 0, countries: ['KR'], all_countries: true,
      tagline: LINES[i % LINES.length], say: LINES[i % LINES.length], category, released_at: i % 11 === 0 ? iso(3) : iso(200), store_updated_at: iso(5),
      created_at: iso(30), owner,
    } as App);
  }
  return out;
}

// ---- 화면 미리보기용 고정 데이터 (/preview, /demo/alerts, /demo/me) ----
const icon = fakeIcon;
const shot = fakeShot;

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
export const iso = (daysAgo: number) => new Date(now - daysAgo * 86400000).toISOString();

export const people: Person[] = [
  { id: 'u1', nickname: '줍줍이', tag: 2817, score: 103, apps: [] },
  { id: 'u2', nickname: 'x', tag: 1111, score: 118, apps: [] },
  { id: 'u3', nickname: 'x', tag: 2222, score: 124, apps: [] },
];
export const APPS: App[] = SEED.map(([name, bg, e, category, tagline], i) => ({
  id: `a${i}`, owner_id: i === 10 ? 'me' : i === 1 ? 'u3' : 'u2', platform: i % 3 ? 'android' : 'ios', stage: 'live', url: 'https://play.google.com/store/apps/details?id=x',
  name, icon_url: icon(bg, e), screenshots: [shot(bg), shot(bg + 'CC'), shot(bg)], is_primary: true,
  feedback_count: [0, 5, 0, 1, 0, 2, 0, 3, 0, 0, 0, 1][i], countries: ['KR'], all_countries: i % 2 === 0, tagline,
  category, released_at: i === 0 || i === 2 ? iso(3) : iso(200), store_updated_at: iso(5), created_at: iso(30),
}));
people[1].apps = [{ id: 'a10', name: '한마디', icon_url: APPS[10].icon_url, is_primary: true }, { id: 'a7', name: '동네산책', icon_url: APPS[7].icon_url, is_primary: false }];
people[2].apps = [{ id: 'a1', name: '세줄일기', icon_url: APPS[1].icon_url, is_primary: true }];
APPS.forEach((a) => { a.owner = a.owner_id === 'u3' ? people[2] : people[1]; });

export const profile: Profile = { id: 'me', nickname: '줍줍이', avatar_url: null, score: 118, country: 'KR', locale: 'ko', setup_done: true, tag: 4821 };
export const me: Person = { id: 'me', nickname: '줍줍이', tag: 4821, score: 118, apps: [{ id: 'a10', name: '한마디', icon_url: APPS[10].icon_url, is_primary: true }, { id: 'a5', name: '냉장고털이', icon_url: APPS[5].icon_url, is_primary: false }] };

export const COMMENTS: Comment[] = [
  { id: 'c1', app_id: 'a1', author_id: 'u2', body: '사진 고르는 게 빨라요', helpful_count: 1, created_at: iso(0.01), author: people[1] },
  { id: 'c2', app_id: 'a1', author_id: 'u3', body: '감사해요! 한마디도 써 볼게요', helpful_count: 0, created_at: iso(0.005), author: people[2] },
  { id: 'c3', app_id: 'a1', author_id: 'u1', body: '아이콘 귀엽다 ㅋㅋ', helpful_count: 0, created_at: iso(1), author: people[0] },
];
export const NOTICES: Notice[] = [
  { id: 'n1', kind: 'comment', body: '번역이 자연스러워요', delta: null, read_at: null, created_at: iso(0.01), app_id: 'a10', actor: people[2], app: { id: 'a10', name: '한마디', icon_url: APPS[10].icon_url, owner_id: 'me' } },
  { id: 'n2', kind: 'helpful', body: '재료 검색이 느려요', delta: 3, read_at: null, created_at: iso(1), app_id: 'a5', actor: people[1], app: { id: 'a5', name: '냉장고털이', icon_url: APPS[5].icon_url, owner_id: 'u2' } },
  { id: 'n3', kind: 'got', body: null, delta: null, read_at: iso(1), created_at: iso(3), app_id: 'a10', actor: people[0], app: { id: 'a10', name: '한마디', icon_url: APPS[10].icon_url, owner_id: 'me' } },
  { id: 'n4', kind: 'visit', body: null, delta: null, read_at: iso(1), created_at: iso(4), app_id: 'a10', actor: people[2], app: { id: 'a10', name: '한마디', icon_url: APPS[10].icon_url, owner_id: 'me' } },
];


// ---- 테스터 교환 (/demo/me, 홈 플라스크 표시) ----
const tester = (i: number): Person => ({ id: `t${i}`, nickname: '줍줍이', tag: 3100 + i * 37, score: 100 + i, apps: [] });
const devOf = (i: number, a: App): Person => ({ ...tester(i), apps: [{ id: a.id, name: a.name, icon_url: a.icon_url, is_primary: true }] });
const filmDev = devOf(9, APPS[3]);
export const TEST_POINTS = 4;
export const RECRUIT: Recruit[] = [0, 1, 2, 3, 4, 5].map((i) => ({ app: APPS[i], joined: [3, 9, 11, 5, 1, 7][i], need: 12 }));
export const JOINED: Joined[] = [
  { app: APPS[8], day: 7, done: [true, false, false] },
  { app: APPS[6], day: 3, done: [true, false, false] },
  { app: APPS[7], day: 14, done: [true, true, false] },
];
export const MY_TEST: MyTest = {
  app: APPS[10], need: 12,
  testers: [
    { who: filmDev, day: 9, done: [true, true, false] },
    { who: people[2], day: 8, done: [true, true, false] },
    { who: tester(1), day: 9, done: [true, false, false] },
    { who: tester(2), day: 5, done: [true, false, false] },
    { who: tester(3), day: 4, done: [true, false, false] },
    { who: tester(4), day: 2, done: [true, false, false] },
    { who: tester(5), day: 1, done: [false, false, false] },
  ],
  feedback: [
    { who: filmDev, body: '문장 고르는 화면이 좀 느려요', day: 7 },
    { who: people[2], body: '알림 시간 바꾸고 싶어요', day: 7 },
    { who: tester(2), body: '첫 화면 귀여워요', day: 1 },
  ],
};

export const TEST: TestData = { points: TEST_POINTS, recruit: RECRUIT, joined: JOINED, mine: [MY_TEST] };
/** 홈 가짜 앱 중 테스터 모집 중인 것 (5개 중 1개) */
export const recruitOf = (a: App): Recruit | null => {
  const i = Number(a.id.replace(/\D/g, ''));
  return i % 5 === 2 ? { app: a, joined: (i * 7) % 11, need: 12 } : null;
};
