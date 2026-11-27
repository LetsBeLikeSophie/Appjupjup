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
export type Joined = { id: string; app: App; day: number; done: boolean[]; shots?: (string | null)[]; bonus?: number };
export type Tester = { who: Person; day: number; done: boolean[]; failed?: boolean };
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

/** 캡처 날: 안드로이드는 구글 조건 14일, 애플은 서로 다른 날 3번 */
export const checksOf = (a: Pick<App, 'platform'>) => (a.platform === 'ios' ? [1, 2, 3] : [1, 7, 14]);
/** 칸마다 마지막 날 (넘기면 탈락) */
export const deadlinesOf = (a: Pick<App, 'platform'>) => (a.platform === 'ios' ? [3, 4, 5] : [6, 13, 16]);
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

/** 캡처 칸: 했음 / 열림(누르면 사진 고르기) / 아직 */
function Slot({ state, src, label, busy, onTap, onFile }: { state: 'done' | 'open' | 'locked'; src?: string | null; label: string; busy?: boolean; onTap: () => void; onFile: (f: File) => void }) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="slot-col">
      <button className={`slot ${state} ${busy ? 'busy' : ''}`} aria-label={label} disabled={busy}
        onClick={() => (state === 'open' ? file.current?.click() : onTap())}>
        {state === 'done' && src && <img src={src} alt="" />}
        {state === 'done' && <span className="slot-ok">{Icon.check}</span>}
        {state === 'open' && Icon.camera}
        {state === 'locked' && Icon.lock}
      </button>
      <input ref={file} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} />
      <span className={`t-sub ${state === 'open' ? 'slot-now' : ''}`}>{label}</span>
    </div>
  );
}

/** 참여 중 카드: 캡처 3칸 → 끝나면 🎫 */
function JoinedCard({ j, h }: { j: Joined; h: TestH }) {
  const { t, toast } = useApp();
  const checks = checksOf(j.app);
  const [done, setDone] = useState(j.done);
  const [busy, setBusy] = useState(-1);
  const [fb, setFb] = useState('');
  const all = done.every(Boolean);
  // 열림: 그날이 됐고 앞 칸을 찍었을 때
  const stateOf = (i: number, c: number) => (done[i] ? 'done' : c <= j.day && (i === 0 || done[i - 1]) ? 'open' : 'locked');
  const tapLocked = (i: number, c: number) => { if (!done[i]) toast(c > j.day ? `${c}${t.day}${t.opensOn}` : t.prevFirst); };
  const shoot = async (i: number, c: number, f: File) => {
    setBusy(i);
    const r = await h.capture(j, i, f);
    setBusy(-1);
    if (!r) return;
    setDone((d) => d.map((x, k) => x || k === i));
    toast(r === 'done' ? `🎫+${j.bonus || 1}${t.gotT}` : `${c}${t.day}${t.captured}`);
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
        <span className="t-sub">{Math.min(j.day, checks[2])}/{checks[2]}{t.day}</span>
      </div>
      <div className="slots-row">
        <div className="slots">
          {checks.map((c, i) => (
            <Slot key={c} label={`${c}${t.day}`} src={j.shots ? j.shots[i] : j.app.screenshots[0]} busy={busy === i}
              state={stateOf(i, c)} onTap={() => tapLocked(i, c)} onFile={(f) => shoot(i, c, f)} />
          ))}
        </div>
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
  const line = (icon: ReactNode, text: string, n: string) => (
    <span className="how-line"><span className="how-os">{icon}</span><span className="t-body grow">{text}</span><span className="ticket">{Icon.ticket}{n}</span></span>
  );
  return (
    <Sheet open={open} onClose={onClose} label={t.points}>
      <SheetHeader title={<span className="row gap6">{Icon.ticket}{points}</span>} onClose={onClose} />
      <div className="how">
        <div className="how-row">
          <span className="how-label t-sub">{t.give}</span>
          {line(Icon.android, t.hAnd, '+1')}
          {line(Icon.apple, t.hIos, '+1')}
          {line(Icon.user, t.hLast, '+1')}
          {line(Icon.ticket, t.hStaked, '+1')}
        </div>
        <div className="how-row">
          <span className="how-label t-sub">{t.use}</span>
          {line(Icon.plus, t.hUpload, `−${APP_COST}`)}
          {line(Icon.user, t.hStake, '−1')}
        </div>
      </div>
    </Sheet>
  );
}

function TesterRow({ x, checks }: { x: Tester; checks: number[] }) {
  return (
    <div className={`tester ${x.failed ? 'failed' : ''}`}>
      <WhoIcon who={x.who} size={34} />
      <span className="t-body ellipsis tester-name"><WhoName who={x.who} /></span>
      <span className="mini-slots">
        {checks.map((c, i) => {
          const miss = !x.done[i] && (x.failed || c < x.day);
          return <i key={c} className={x.done[i] ? 'ok' : miss ? 'miss' : ''}>{miss && Icon.close}</i>;
        })}
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
      <button className="temp-card" onClick={() => setHow(true)} aria-label={t.points}>
        <span className="ticket big">{Icon.ticket}{points}</span>
        {sub && <span className="t-sub">{sub}</span>}
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
      {m.testers.length > 0 && <div className="testers">{m.testers.map((x, i) => <TesterRow key={i} x={x} checks={checksOf(m.app)} />)}</div>}
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
    <Section title={t.joining} aside={<span className="t-sub">{d.joined.length}/{MAX_JOIN}</span>}>
      {d.joined.map((j) => <JoinedCard key={`${j.id}:${j.done.join()}`} j={j} h={h} />)}
      <Link className="list-row find-row" href={findHref}>
        <span className="find-icon">{Icon.flask}</span>
        <span className="t-card grow">{t.testApps}</span>
        <span className="chev">{Icon.chevRight}</span>
      </Link>
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
