'use client';
// 테스터 교환: DB → 화면 데이터(TestData), 동작(TestH). 규칙은 DB 함수(11_tester_exchange.sql)가 지켜요
import { sb, APP_FIELDS, PERSON, type App, type Person } from './supabase';
import { dayOf, type Joined, type MyTest, type Recruit, type TestData, type TestH } from '@/components/test-view';
import { shrinkImage } from './image';

export type Board = Map<string, { joined: number; need: number; stake: number; given: number }>;

/** 모집 중인 앱: 사람 수·건 티켓·주인이 남을 테스트해 준 수 */
export async function loadBoard(): Promise<Board> {
  const { data } = await sb().rpc('aj_test_board');
  return new Map(((data || []) as { app_id: string; joined: number; need: number; stake: number; given: number }[]).map((r) => [r.app_id, r]));
}

/** 아직 사람이 덜 찬 모집만 */
export const recruitOf = (board: Board, app: App): Recruit | null => {
  const b = board.get(app.id);
  return b && b.joined < b.need ? { app, joined: b.joined, need: b.need, stake: b.stake, given: b.given } : null;
};

type CapRow = { idx: number; path: string | null; created_at: string };
type JoinRow = { id: string; app_id: string; status: string; reward: number; joined_at: string; platform: App['platform']; app: App; caps: CapRow[] };
type OwnJoinRow = { id: string; app_id: string; status: string; staked: boolean; joined_at: string; tester: Person; caps: CapRow[] };
type NoteRow = { app_id: string; body: string; day: number; author: Person };

const daysOf = (joinedAt: string, caps: CapRow[]) => [...caps].sort((a, b) => a.idx - b.idx).map((c) => dayOf(joinedAt, new Date(c.created_at).getTime()));

/** 내 정보: 참여 중 · 모집 목록 · 내 앱 테스터 */
export async function loadTest(uid: string, myApps: App[], tickets: number): Promise<TestData> {
  const db = sb();
  const [board, joinsQ, ownQ, notesQ, testsQ] = await Promise.all([
    loadBoard(),
    db.from('aj_test_joins').select(`id, app_id, status, reward, joined_at, platform, app:aj_apps(${APP_FIELDS}), caps:aj_test_caps(idx, path, created_at)`)
      .eq('tester_id', uid).eq('status', 'active').order('joined_at'),
    db.from('aj_test_joins').select(`id, app_id, status, staked, joined_at, tester:aj_profiles!aj_test_joins_tester_id_fkey(${PERSON}), caps:aj_test_caps(idx, path, created_at)`)
      .eq('owner_id', uid).order('joined_at'),
    db.from('aj_test_notes').select(`app_id, body, day, author:aj_profiles(${PERSON})`).eq('owner_id', uid).order('created_at', { ascending: false }).limit(100),
    db.from('aj_tests').select('app_id').eq('owner_id', uid),
  ]);
  const joins = (joinsQ.data || []) as unknown as JoinRow[];

  // 내 캡처 사진 (비공개 저장소 → 잠깐 쓰는 주소)
  const paths = joins.flatMap((j) => j.caps.map((c) => c.path).filter(Boolean) as string[]);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await db.storage.from('aj-caps').createSignedUrls(paths, 3600);
    (data || []).forEach((s) => { if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl); });
  }
  const joined: Joined[] = joins.map((j) => ({
    // 캡처 날은 참여할 때 플랫폼 기준 (DB와 같게)
    id: j.id, app: { ...j.app, platform: j.platform }, day: dayOf(j.joined_at), bonus: j.reward,
    caps: [...j.caps].sort((a, b) => a.idx - b.idx).map((c) => ({ day: dayOf(j.joined_at, new Date(c.created_at).getTime()), src: c.path ? signed.get(c.path) ?? null : null })),
  }));

  const mineIds = new Set(myApps.map((a) => a.id));
  const already = new Set(joins.map((j) => j.app_id));
  const want = [...board.keys()].filter((id) => !mineIds.has(id) && !already.has(id));
  const { data: apps } = want.length ? await db.from('aj_apps').select(APP_FIELDS).in('id', want) : { data: [] };
  // 전에 참여했던 앱(끝났거나 탈락)도 빼기
  const { data: past } = await db.from('aj_test_joins').select('app_id').eq('tester_id', uid).neq('status', 'active');
  const pastIds = new Set((past || []).map((p: { app_id: string }) => p.app_id));
  const recruit = ((apps || []) as unknown as App[]).filter((a) => !pastIds.has(a.id)).map((a) => recruitOf(board, a)).filter(Boolean) as Recruit[];

  const own = (ownQ.data || []) as unknown as OwnJoinRow[];
  const notes = (notesQ.data || []) as unknown as NoteRow[];
  const openIds = new Set((testsQ.data || []).map((x: { app_id: string }) => x.app_id));
  const mine: MyTest[] = myApps.map((a) => {
    const js = own.filter((j) => j.app_id === a.id);
    const b = board.get(a.id);
    return {
      app: a, open: openIds.has(a.id), need: b?.need ?? 12, stake: b?.stake ?? 0,
      locked: js.filter((j) => j.status === 'active' && j.staked).length,
      testers: js.map((j) => ({ who: j.tester, day: dayOf(j.joined_at), caps: daysOf(j.joined_at, j.caps), failed: j.status === 'failed' })),
      feedback: notes.filter((n) => n.app_id === a.id).map((n) => ({ who: n.author, body: n.body, day: n.day })),
    };
  });
  return { points: tickets, recruit, joined, mine };
}

/** 이 앱에 내가 참여 중인지 (상세 띠) */
export async function myJoinFor(uid: string, appId: string) {
  const { data } = await sb().from('aj_test_joins').select('id').eq('tester_id', uid).eq('app_id', appId).maybeSingle();
  return !!data;
}

async function sha256(file: Blob) {
  const buf = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

type Msgs = { toast: (m: string) => void; err: (key: string) => void; after: () => void; uid: string };

/** 진짜 동작: 실패하면 err(키)로 짧은 토스트, 성공하면 after()로 다시 읽기 */
export function testHandlers({ toast, err, after, uid }: Msgs): TestH {
  let failKey = '';
  const run = async <T,>(p: PromiseLike<{ data: T; error: { message: string } | null }>) => {
    const { data, error } = await p;
    failKey = error?.message || '';
    if (error) { err(error.message); return null; }
    return data ?? (true as T);
  };
  return {
    join: async (r) => !!(await run(sb().rpc('aj_test_join', { p_app: r.app.id }))) && (after(), true),
    open: async (m) => !!(await run(sb().rpc('aj_test_open', { p_app: m.app.id }))) && (after(), true),
    stake: async (m, d) => !!(await run(sb().rpc('aj_test_stake', { p_app: m.app.id, p_delta: d }))) && (after(), true),
    note: async (j, body) => !!(await run(sb().rpc('aj_test_note', { p_join: j.id, p_body: body }))),
    capture: async (j, idx, file) => {
      // 원본 해시로 같은 사진 막기, 올리는 건 줄인 사진
      const hash = await sha256(file);
      const small = await shrinkImage(file, 1280).catch(() => null);
      if (!small) { toast('🖼️ ✕'); return null; }
      const path = `${uid}/${j.id}/${idx}-${hash.slice(0, 12)}.jpg`;
      const up = await sb().storage.from('aj-caps').upload(path, small, { contentType: 'image/jpeg', upsert: false });
      if (up.error && !/exists/i.test(up.error.message)) { err(up.error.message); return null; }
      const res = await run(sb().rpc('aj_test_capture', { p_join: j.id, p_idx: idx, p_path: path, p_hash: hash })) as { done?: boolean; missed?: boolean } | null;
      // 확실히 기록 안 된 경우만 파일 지우기 (응답만 끊긴 경우엔 기록됐을 수 있음)
      if (!res) { if (failKey && /same_photo|bad_|today_done|not_active|missed/.test(failKey)) await sb().storage.from('aj-caps').remove([path]); return null; }
      after();
      if (res.missed) { err('missed'); return null; }
      return res.done ? 'done' : 'ok';
    },
  };
}


/** 테스트 실패 이유 → 짧은 토스트 */
export function testErrMsg(t: Record<string, string>, raw: string) {
  const k = ['need_tickets', 'max_join', 'full', 'same_photo', 'today_done', 'missed', 'stake_locked', 'already', 'login_required'].find((x) => raw.includes(x));
  return k === 'need_tickets' ? `🎫1${t.needT}` : k === 'max_join' ? t.maxJoin : k === 'full' ? t.eFull : k === 'same_photo' ? t.eSame
    : k === 'today_done' ? t.eToday : k === 'missed' ? t.eMissed : k === 'stake_locked' ? t.stakeLocked : k === 'already' ? t.eAlready : t.errGeneric;
}
