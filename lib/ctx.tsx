'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sb, APP_FIELDS, type Profile, type App } from './supabase';
import { dicts, pickLocale, guessCountry, type Locale } from './i18n';

type Pending = { type: 'download'; appId: string; url: string } | { type: 'upload' } | null;

type Ctx = {
  session: Session | null;
  profile: Profile | null;
  ready: boolean;
  t: (typeof dicts)['ko'];
  locale: Locale;
  country: string;
  unread: number;
  /** 오늘 찍을 테스트 캡처가 있나 (하단 내 정보 점) */
  testDue: boolean;
  refreshTestDue: () => Promise<void>;
  /** 내가 올린 앱 (대표 앱이 곧 나) */
  myApps: App[];
  /** 내가 주운 앱 id */
  gotIds: Set<string>;
  toast: (msg: string) => void;
  toastMsg: string | null;
  /** 주웠어요 순간 (아이콘 하나 크게) */
  picked: App | null;
  loginOpen: boolean;
  openLogin: (p?: Pending) => void;
  closeLogin: () => void;
  uploadOpen: boolean;
  setUploadOpen: (v: boolean) => void;
  welcomeOpen: boolean;
  closeWelcome: (dev: boolean) => void;
  refreshProfile: () => Promise<void>;
  refreshMine: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  /** 받기: 스토어 링크(a target=_blank)를 누를 때 같이 불러요 */
  download: (app: App) => void;
};

const C = createContext<Ctx | null>(null);
export const useApp = () => useContext(C)!;

const PENDING_KEY = 'aj_pending';
const WELCOME_KEY = 'aj_welcome';
const save = (p: Pending) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch {} };
const take = (): Pending => {
  try { const v = localStorage.getItem(PENDING_KEY); localStorage.removeItem(PENDING_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
};

export function errKey(e: unknown): string {
  const m = (e as { message?: string })?.message || '';
  const k = ['badword', 'too_fast', 'already', 'duplicate', 'app_limit', 'bad_link', 'own_app', 'login_required', 'need_tickets', 'max_join', 'full', 'same_photo', 'today_done', 'not_yet', 'missed', 'stake_locked'].find((x) => m.includes(x));
  return k || 'generic';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [unread, setUnread] = useState(0);
  const [testDue, setTestDue] = useState(false);
  const [myApps, setMyApps] = useState<App[]>([]);
  const [gotIds, setGotIds] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [picked, setPicked] = useState<App | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  const locale = pickLocale(profile?.locale);
  const t = dicts[locale];
  const country = profile?.country || guessCountry();

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 3600);
  }, []);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); return; }
    const db = sb();
    let { data } = await db.from('aj_profiles').select('*').eq('id', s.user.id).maybeSingle();
    if (!data) {
      // 처음 로그인: 이름·사진은 정하지 않아요. 앱이 있으면 대표 앱이 곧 이름
      await db.from('aj_profiles').insert({ id: s.user.id, nickname: dicts[pickLocale()].guest, avatar_url: null, country: guessCountry(), locale: pickLocale() });
      ({ data } = await db.from('aj_profiles').select('*').eq('id', s.user.id).maybeSingle());
    }
    setProfile(data as Profile | null);
  }, []);

  const refreshMine = useCallback(async () => {
    const s = (await sb().auth.getSession()).data.session;
    if (!s) { setMyApps([]); setGotIds(new Set()); return; }
    const [a, d] = await Promise.all([
      sb().from('aj_apps').select(APP_FIELDS).eq('owner_id', s.user.id).order('created_at'),
      sb().from('aj_downloads').select('app_id').eq('user_id', s.user.id),
    ]);
    setMyApps((a.data as unknown as App[]) || []);
    setGotIds(new Set((d.data || []).map((x: { app_id: string }) => x.app_id)));
  }, []);

  const refreshUnread = useCallback(async () => {
    const s = (await sb().auth.getSession()).data.session;
    if (!s) { setUnread(0); return; }
    const { count } = await sb().from('aj_notifications').select('id', { count: 'exact', head: true }).is('read_at', null).in('kind', ['got', 'comment', 'helpful', 'visit']);
    setUnread(count || 0);
  }, []);

  const refreshTestDue = useCallback(async () => {
    const s = (await sb().auth.getSession()).data.session;
    if (!s) { setTestDue(false); return; }
    const { data } = await sb().rpc('aj_test_due');
    setTestDue(!!data);
  }, []);

  useEffect(() => {
    const db = sb();
    db.auth.getSession().then(async ({ data }) => {
      // 카카오가 로그인 콜백을 두 번 부르면 두 번째가 bad_oauth_state로 돌아와요.
      const q = new URLSearchParams(location.search);
      if (q.get('error_code') === 'bad_oauth_state' || q.get('error') === 'invalid_request') {
        history.replaceState(null, '', location.pathname);
        if (!data.session) setLoginOpen(true);
      }
      setSession(data.session);
      await loadProfile(data.session);
      setReady(true);
      if (data.session) setPending(take());
      // 처음 온 사람에게만: 앱 만들어요 / 구경할래요
      try { if (!data.session && !localStorage.getItem(WELCOME_KEY) && location.pathname === '/') setWelcomeOpen(true); } catch {}
    });
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => { setSession(s); loadProfile(s); });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  useEffect(() => { refreshUnread(); refreshMine(); refreshTestDue(); }, [session, refreshUnread, refreshMine, refreshTestDue]);

  const showPicked = useCallback((app: App) => {
    setPicked(app);
    setTimeout(() => setPicked((p) => (p?.id === app.id ? null : p)), 1400);
  }, []);

  const download = useCallback((app: App) => {
    if (!session) return;
    if (app.owner_id === session.user.id) return;
    showPicked(app);
    setGotIds((s) => new Set(s).add(app.id));
    sb().rpc('aj_record_download', { p_app: app.id }).then(({ error }) => {
      if (error) toast(t.errGeneric); else refreshProfile();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, t, toast, showPicked]);

  // 로그인 후 하던 일 이어서 하기
  useEffect(() => {
    if (!pending || !profile) return;
    const p = pending; setPending(null);
    if (p.type === 'upload') setUploadOpen(true);
    if (p.type === 'download') {
      sb().rpc('aj_record_download', { p_app: p.appId }).then(() => { refreshMine(); toast(t.gotToast); });
    }
  }, [pending, profile, t, toast, refreshMine]);

  function openLoginInner(p?: Pending) { save(p || null); setLoginOpen(true); }
  const refreshProfile = () => loadProfile(session);

  const closeWelcome = (dev: boolean) => {
    try { localStorage.setItem(WELCOME_KEY, '1'); } catch {}
    setWelcomeOpen(false);
    if (dev) { if (session) setUploadOpen(true); else openLoginInner({ type: 'upload' }); }
  };

  const value = useMemo<Ctx>(() => ({
    session, profile, ready, t, locale, country, unread, testDue, refreshTestDue, myApps, gotIds, toast, toastMsg, picked,
    loginOpen, openLogin: openLoginInner, closeLogin: () => setLoginOpen(false),
    uploadOpen, setUploadOpen, welcomeOpen, closeWelcome,
    refreshProfile, refreshMine, refreshUnread, download,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [session, profile, ready, t, locale, country, unread, testDue, refreshTestDue, myApps, gotIds, toastMsg, picked, loginOpen, uploadOpen, welcomeOpen, download, refreshUnread, refreshMine, loadProfile, toast]);

  return <C.Provider value={value}>{children}</C.Provider>;
}
