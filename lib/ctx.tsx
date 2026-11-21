'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { sb, type Profile, type App } from './supabase';
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
  toast: (msg: string) => void;
  toastMsg: string | null;
  loginOpen: boolean;
  openLogin: (p?: Pending) => void;
  closeLogin: () => void;
  feedbackApp: App | null;
  openFeedback: (a: App | null) => void;
  uploadOpen: boolean;
  setUploadOpen: (v: boolean) => void;
  refreshProfile: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  download: (app: App) => Promise<void>;
};

const C = createContext<Ctx | null>(null);
export const useApp = () => useContext(C)!;

const PENDING_KEY = 'aj_pending';
const save = (p: Pending) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch {} };
const take = (): Pending => {
  try { const v = localStorage.getItem(PENDING_KEY); localStorage.removeItem(PENDING_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
};

export function errKey(e: unknown): string {
  const m = (e as { message?: string })?.message || '';
  const k = ['badword', 'download_required', 'already', 'duplicate', 'app_limit', 'bad_link', 'own_app', 'login_required'].find((x) => m.includes(x));
  return k || 'generic';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [unread, setUnread] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [feedbackApp, setFeedbackApp] = useState<App | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  const locale = pickLocale(profile?.locale);
  const t = dicts[locale];
  const country = profile?.country || guessCountry();

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 2600);
  }, []);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); return; }
    const db = sb();
    let { data } = await db.from('aj_profiles').select('*').eq('id', s.user.id).maybeSingle();
    if (!data) {
      // 처음 로그인: 카카오·구글 이름과 사진으로 프로필을 만들어요
      const md = s.user.user_metadata || {};
      const nick = String(md.name || md.full_name || md.nickname || s.user.email?.split('@')[0] || 'user').slice(0, 20);
      await db.from('aj_profiles').insert({
        id: s.user.id,
        nickname: nick,
        avatar_url: md.avatar_url || md.picture || null,
        country: guessCountry(),
        locale: pickLocale(),
      });
      ({ data } = await db.from('aj_profiles').select('*').eq('id', s.user.id).maybeSingle());
    }
    setProfile(data as Profile | null);
  }, []);

  const refreshUnread = useCallback(async () => {
    const s = (await sb().auth.getSession()).data.session;
    if (!s) { setUnread(0); return; }
    const { count } = await sb().from('aj_notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
    setUnread(count || 0);
  }, []);

  useEffect(() => {
    const db = sb();
    db.auth.getSession().then(async ({ data }) => {
      // 카카오가 로그인 콜백을 두 번 부르면 두 번째가 bad_oauth_state로 돌아와요.
      // 첫 번째에서 이미 로그인됐으면 에러 주소만 조용히 지워요.
      const q = new URLSearchParams(location.search);
      if (q.get('error_code') === 'bad_oauth_state' || q.get('error') === 'invalid_request') {
        history.replaceState(null, '', location.pathname);
        if (!data.session) setLoginOpen(true);
      }
      setSession(data.session);
      await loadProfile(data.session);
      setReady(true);
      if (data.session) setPending(take());
    });
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => { setSession(s); loadProfile(s); });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  useEffect(() => { refreshUnread(); }, [session, refreshUnread]);

  const download = useCallback(async (app: App) => {
    if (!session) { openLoginInner({ type: 'download', appId: app.id, url: app.url }); return; }
    const { data, error } = await sb().rpc('aj_record_download', { p_app: app.id });
    if (error) { toast(t.errGeneric); return; }
    if (data?.matched) toast(t.matchedToast);
    else if (!data?.already) toast((app.owner?.nickname || '') + t.sentNotice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, t, toast]);

  // 로그인 후 하던 일 이어서 하기
  useEffect(() => {
    if (!pending || !profile) return;
    const p = pending; setPending(null);
    if (p.type === 'upload') setUploadOpen(true);
    if (p.type === 'download') {
      sb().rpc('aj_record_download', { p_app: p.appId }).then(({ data }) => {
        toast(data?.matched ? t.matchedToast : '✓ ' + t.get);
      });
    }
  }, [pending, profile, t, toast]);

  function openLoginInner(p?: Pending) { save(p || null); setLoginOpen(true); }

  const value = useMemo<Ctx>(() => ({
    session, profile, ready, t, locale, country, unread, toast, toastMsg,
    loginOpen, openLogin: openLoginInner, closeLogin: () => setLoginOpen(false),
    feedbackApp, openFeedback: setFeedbackApp,
    uploadOpen, setUploadOpen,
    refreshProfile: () => loadProfile(session),
    refreshUnread, download,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [session, profile, ready, t, locale, country, unread, toastMsg, loginOpen, feedbackApp, uploadOpen, download, refreshUnread, loadProfile, toast]);

  return <C.Provider value={value}>{children}</C.Provider>;
}
