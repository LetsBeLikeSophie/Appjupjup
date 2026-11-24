// 가짜 앱 데이터 (시험용 /demo, /preview)
import type { App, Person } from './supabase';

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
