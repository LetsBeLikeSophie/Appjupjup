'use client';
// 테스터 교환 부품: 내 정보 안 · 상세 띠. 데이터와 동작(h)은 page에서 (진짜: lib/test.ts, 시험: lib/demo.ts)
// 🎫 얻기: 남의 앱 테스트 끝(안드로이드 1·7·14일 / 애플 1·2·3일 캡처) → 보상(1 + 마지막 3자리 1 + 주인이 건 티켓 1)
// 🎫 쓰기: 2·3번째 앱 올리기 2장 · 내 앱에 걸기(테스터 보상 +1, 참여 순간 그 사람 몫으로 잠김, 안 잠긴 것만 뺄 수 있음, 탈락하면 돌아옴)
// 규칙 숫자는 DB(supabase/migrations/11_tester_exchange.sql)와 같아야 해요
import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/ctx';
import type { App, Person } from '@/lib/supabase';
import { AppIcon, Icon, WhoIcon, WhoName } from './ui';
import { PlatformChip } from './app-parts';
import { Section, Sheet, SheetHeader } from './layout';

export const MAX_JOIN = 10;
export const APP_COST = 2;
export type Recruit = { app: App; joined: number; need: number; given: number; stake?: number };
export type Joined = { id: string; app: App; day: number; caps: { day: number; src?: string | null }[]; bonus?: number };
export type Tester = { who: Person; day: number; caps: number[]; failed?: boolean };
export type MyTest = { app: App; open: boolean; need: number; testers: Tester[]; feedback: { who: Person; body: string; day: number }[]; stake: number; locked: number };
export type TestData = { points: number; recruit: Recruit[]; joined: Joined[]; mine: MyTest[] };
/** 동작: 성공하면 true(캡처는 'ok'|'done'), 실패 토스트는 h 쪽에서 */
export type TestH = {
  join: (r: Recruit) => Promise<boolean>;
  capture: (j: Joined, idx: number, file: File) => Promise<'ok' | 'done' | null>;
  note: (j: Joined, body: string) => Promise<boolean>;
  stake: (m: MyTest, delta: 1 | -1) => Promise<boolean>;
  open: (m: MyTest) => Promise<boolean>;
};

/** 캡처: 하루 1장씩 몇 장이든. 끝 = 서로 다른 날 3장 이상 + 마지막 날(안드로이드 14 = 구글 조건, 애플 3) 이후 1장. 넘기면 탈락하는 날: 16 / 5 (DB 14와 같게) */
export const finalOf = (a: Pick<App, 'platform'>) => (a.platform === 'ios' ? 3 : 14);
export const lastOf = (a: Pick<App, 'platform'>) => (a.platform === 'ios' ? 5 : 16);
export const isDoneCaps = (days: number[], fin: number) => days.length >= 3 && days.some((d) => d >= fin);
/** 참여한 날 = 1일 (24시간마다 하루) */
export const dayOf = (joinedAt: string, at = Date.now()) => Math.floor((at - new Date(joinedAt).getTime()) / 86400000) + 1;
/** 보상: 기본 1 + 마지막 3자리(10~12번째) 1 + 주인이 건 티켓 남아 있으면 1 */
export const bonusOf = (r: Pick<Recruit, 'joined' | 'need' | 'stake'>) => 1 + (r.joined >= r.need - 3 ? 1 : 0) + ((r.stake || 0) > 0 ? 1 : 0);
/** 목록 순서: 보상 큰 앱 → 12명에 가까움 + 남을 많이 테스트해 준 사람 */
export const sortRecruit = (l: Recruit[]) => [...l].sort((a, b) => bonusOf(b) - bonusOf(a) || (b.joined * 2 + b.given) - (a.joined * 2 + a.given));

/** 보상: 기본(+마지막 자리 진하게) + 주인이 건 몫은 따로 칸 */
export function Reward({ r }: { r: Pick<Recruit, 'joined' | 'need' | 'stake'> }) {
  const base = bonusOf({ ...r, stake: 0 });
  return (
    <span className={`reward-tag ${base > 1 ? 'bonus' : ''}`}>
      <Ticket n={base} plus />
      {(r.stake || 0) > 0 && <span className="chip reward-stake"><Ticket n={1} plus /></span>}
    </span>
  );
}

export function Ticket({ n, plus, tone }: { n: number | string; plus?: boolean; tone?: 'on' }) {
  return <span className={`ticket ${tone || ''}`}>{Icon.ticket}{plus ? '+' : ''}{n}</span>;
}

/** 사람 n/need 막대 (테스터 수) */
export function Meter({ n, need }: { n: number; need: number }) {
  return (
    <div className="meter">
      <span className="meter-who">{Icon.user}</span>
      <span className="meter-bar"><i style={{ width: `${Math.min(100, (n / need) * 100)}%` }} /></span>
      <span className="t-sub">{n}/{need}</span>
    </div>
  );
}

/** 사진 칸: 찍은 사진 / 오늘 칸(점선, 누르면 사진 고르기) */
function Slot({ src, label, open, busy, onFile }: { src?: string | null; label: string; open?: boolean; busy?: boolean; onFile?: (f: File) => void }) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="slot-col">
      <button className={`slot ${open ? 'open' : 'done'} ${busy ? 'busy' : ''}`} aria-label={label} disabled={busy || !open}
        onClick={() => open && file.current?.click()}>
        {!open && (src ? <img src={src} alt="" /> : Icon.check)}
        {open && Icon.camera}
      </button>
      {open && <input ref={file} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f && onFile) onFile(f); }} />}
      <span className={`t-sub ${open ? 'slot-now' : ''}`}>{label}</span>
    </div>
  );
}

/** 필수 표시: 사진 ● ● + 마지막 날 칸 (다 차면 🎫) */
function NeedMarks({ n, fin, ok, day }: { n: number; fin: number; ok: boolean; day: string }) {
  return (
    <span className="need">
      <i className={n >= 1 ? 'on' : ''} /><i className={n >= 2 ? 'on' : ''} />
      <span className={`need-fin ${ok ? 'on' : ''}`}>{fin}{day}</span>
    </span>
  );
}

/** 참여 중 카드: 하루 1장씩 사진 줄 (필수 3장 + 마지막 날 1장, 더 찍어도 됨) → 끝나면 🎫 */
function JoinedCard({ j, h }: { j: Joined; h: TestH }) {
  const { t, toast } = useApp();
  const fin = finalOf(j.app);
  const [caps, setCaps] = useState(j.caps);
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState('');
  const today = caps.some((c) => c.day === j.day);
  const all = isDoneCaps(caps.map((c) => c.day), fin);
  const strip = useRef<HTMLDivElement>(null);
  const shoot = async (f: File) => {
    setBusy(true);
    const r = await h.capture(j, caps.length, f);
    setBusy(false);
    if (!r) return;
    setCaps((l) => [...l, { day: j.day, src: URL.createObjectURL(f) }]);
    toast(r === 'done' ? `🎫+${j.bonus || 1}${t.gotT}` : `${j.day}${t.day}${t.captured}`);
  };
  const send = async () => {
    const b = fb.trim();
    if (!b) return;
    if (await h.note(j, b)) { setFb(''); toast(t.sent); }
  };
  return (
    <div className="card">
      <div className="row gap12">
        <AppIcon src={j.app.icon_url} size={40} />
        <span className="row gap6 grow"><span className="t-card ellipsis">{j.app.name}</span><PlatformChip platform={j.app.platform} stage="live" /></span>
        <span className="t-sub">{Math.min(j.day, fin)}/{fin}{t.day}</span>
      </div>
      <div className="shot-strip" ref={strip}>
        {caps.map((c, i) => <Slot key={i} src={c.src} label={`${c.day}${t.day}`} />)}
        {!today && !all && caps.length < 30 && <Slot open busy={busy} label={t.today} onFile={shoot} />}
      </div>
      <div className="row between">
        <NeedMarks n={caps.length} fin={fin} ok={all} day={t.day} />
        <span className={`slots-reward ${all ? 'got' : ''}`}><span className="how-arrow">{Icon.chevRight}</span><Ticket n={j.bonus || 1} plus /></span>
      </div>
      <div className="field-wrap">
        <input placeholder={t.feedbackPh} maxLength={60} value={fb} onChange={(e) => setFb(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} enterKeyHint="send" />
        <button className="icon-btn" aria-label="send" onClick={send}>{Icon.send}</button>
      </div>
    </div>
  );
}

/** 티켓 규칙 그림: 얻기 / 쓰기 */
function HowSheet({ open, points, onClose }: { open: boolean; points: number; onClose: () => void }) {
  const { t } = useApp();
  const line = (icon: ReactNode, text: string, sub: string, n: string) => (
    <span className="how-line">
      <span className="how-os">{icon}</span>
      <span className="col grow"><span className="t-body"><b>{text}</b></span><span className="t-sub">{sub}</span></span>
      <span className="ticket">{Icon.ticket}{n}</span>
    </span>
  );
  return (
    <Sheet open={open} onClose={onClose} label={t.points}>
      <SheetHeader title={<span className="row gap6">{Icon.ticket}{points}</span>} onClose={onClose} />
      <div className="how">
        <div className="how-row">
          <span className="how-label t-sub">{t.give}</span>
          {line(Icon.android, t.hAnd, t.hAndS, '+1')}
          {line(Icon.apple, t.hIos, t.hIosS, '+1')}
          {line(Icon.user, t.hLast, t.hLastS, '+1')}
          {line(Icon.ticket, t.hStaked, t.hStakedS, '+1')}
        </div>
        <div className="how-row">
          <span className="how-label t-sub">{t.use}</span>
          {line(Icon.plus, t.hUpload, t.hUploadS, `−${APP_COST}`)}
          {line(Icon.lock, t.hStake, t.hStakeS, '−1')}
        </div>
      </div>
    </Sheet>
  );
}

/** 테스터 한 줄: 필수 3칸(사진·사진·마지막 날) + 더 찍은 장수, 탈락이면 빈 칸 빨간 ✕ */
function TesterRow({ x, fin }: { x: Tester; fin: number }) {
  const n = x.caps.length;
  const marks = [n >= 1, n >= 2, isDoneCaps(x.caps, fin)];
  return (
    <div className={`tester ${x.failed ? 'failed' : ''}`}>
      <WhoIcon who={x.who} size={34} />
      <span className="t-body ellipsis tester-name"><WhoName who={x.who} /></span>
      {n > 3 && <span className="t-sub">+{n - 3}</span>}
      <span className="mini-slots">
        {marks.map((ok, i) => <i key={i} className={ok ? 'ok' : x.failed ? 'miss' : ''}>{!ok && x.failed && Icon.close}</i>)}
      </span>
    </div>
  );
}

/** 티켓 카드 (내 정보 맨 위, 누르면 규칙 그림) */
export function PointsCard({ points, sub }: { points: number; sub?: string }) {
  const { t } = useApp();
  const [how, setHow] = useState(false);
  return (
    <>
      <button className="btn-sm white ticket-pill" onClick={() => setHow(true)} aria-label={t.points}>
        {Icon.ticket}{points}{sub}
      </button>
      <HowSheet open={how} points={points} onClose={() => setHow(false)} />
    </>
  );
}

/** 내 앱 시트 안 테스트: 모집 전이면 [테스터 모으기], 모집 중이면 사람 n/12 · 🎫 걸기 [− n +] (잠긴 것은 못 뺌) · 테스터 · 피드백 */
export function MyTestPanel({ m, h }: { m: MyTest; h: TestH }) {
  const { t, toast } = useApp();
  const [stake, setStake] = useState(m.stake);
  const [open, setOpen] = useState(m.open);
  const [busy, setBusy] = useState(false);
  const change = async (d: 1 | -1) => {
    if (busy) return;
    if (d === -1 && stake < 1) { toast(t.stakeLocked); return; }
    setBusy(true);
    const ok = await h.stake(m, d);
    setBusy(false);
    if (!ok) return;
    setStake((n) => n + d);
    toast(`🎫1${d === 1 ? t.staked : t.unstaked}`);
  };
  if (!open) {
    return (
      <button className="btn primary" disabled={busy} onClick={async () => { setBusy(true); const ok = await h.open(m); setBusy(false); if (ok) setOpen(true); }}>{Icon.user}{t.openTest}</button>
    );
  }
  return (
    <>
      <div className="list-row">
        <span className="col1"><span className="t-card">{t.testers}</span><Meter n={m.testers.filter((x) => !x.failed).length} need={m.need} /></span>
        <span className="stake">
          <button className={`stake-btn ${stake < 1 ? 'dim' : ''}`} aria-label="-" onClick={() => change(-1)}>−</button>
          <span className="stake-n"><Ticket n={stake + m.locked} />{m.locked > 0 && <span className="stake-lock">{Icon.lock}{m.locked}</span>}</span>
          <button className="stake-btn" aria-label="+" onClick={() => change(1)}>+</button>
        </span>
      </div>
      {m.testers.length > 0 && <div className="testers">{m.testers.map((x, i) => <TesterRow key={i} x={x} fin={finalOf(m.app)} />)}</div>}
      {m.feedback.length > 0 && (
        <Section title={t.feedback} aside={<span className="t-sub">{m.feedback.length}</span>}>
          {m.feedback.map((f, i) => (
            <div key={i} className="cm">
              <WhoIcon who={f.who} size={34} />
              <div className="cm-body">
                <span className="cm-head"><span className="cm-name ellipsis"><WhoName who={f.who} /></span><span className="t-sub">{f.day}{t.day}</span></span>
                <span className="t-body">{f.body}</span>
              </div>
            </div>
          ))}
        </Section>
      )}
    </>
  );
}

/** 내 정보 안 참여 중: 카드들 + 홈 🧪로 가는 줄 */
export function TestSections({ d, h, findHref }: { d: TestData; h: TestH; findHref: string }) {
  const { t } = useApp();
  return (
    <Section title={`${t.joining} ${d.joined.length}/${MAX_JOIN}`} aside={<Link className="btn-sm white" href={findHref}>{Icon.flask}{t.testApps}</Link>}>
      {d.joined.map((j) => <JoinedCard key={`${j.id}:${j.caps.length}`} j={j} h={h} />)}
    </Section>
  );
}

/** 앱 상세 안 모집 띠: 사람 n/12 · 🎫+n · [참여] */
export function RecruitStrip({ r, joined: joined0, onJoin }: { r: Recruit; joined?: boolean; onJoin: (r: Recruit) => Promise<boolean> }) {
  const { t, toast } = useApp();
  const [joined, setJoined] = useState(!!joined0);
  const b = bonusOf(r);
  return (
    <div className="card recruit-strip">
      <div className="row gap12">
        <span className="find-icon">{Icon.flask}</span>
        <div className="col1">
          <span className="t-card">{t.testers}</span>
          <Meter n={r.joined + (joined && !joined0 ? 1 : 0)} need={r.need} />
        </div>
        <Reward r={r} />
        {joined
          ? <span className="btn-sm on">{Icon.check}</span>
          : <button className="btn-sm primary" onClick={async () => { if (await onJoin(r)) { setJoined(true); toast(`${t.joinedT} · 🎫+${b}`); } }}>{t.join}</button>}
      </div>
    </div>
  );
}
