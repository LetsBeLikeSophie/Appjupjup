'use client';
// 테스터 교환 부품: 내 정보 안에 들어가요 (지금은 화면만, 가짜 데이터 /demo/me)
// 🎫 = 노출권. 얻기: 남의 앱 테스트 끝(안드로이드 1·7·14일 / 애플 1·2·3일 캡처) → +1, 마지막 3자리 → +2
//              쓰기: 앱 하나 더 올리기 🎫2 · 하루 맨 위로 🔥 🎫1
import { useState } from 'react';
import { useApp } from '@/lib/ctx';
import type { App, Person } from '@/lib/supabase';
import { AppIcon, Icon, WhoIcon, WhoName } from './ui';
import { PlatformChip } from './app-parts';
import { Section, Sheet, SheetHeader } from './layout';

export const MAX_JOIN = 10;
export const APP_COST = 2;
export const BOOST_COST = 1;
export type Recruit = { app: App; joined: number; need: number; given: number; boost?: boolean };
export type Joined = { app: App; day: number; done: boolean[]; bonus?: number };
export type Tester = { who: Person; day: number; done: boolean[] };
export type MyTest = { app: App; need: number; testers: Tester[]; feedback: { who: Person; body: string; day: number }[]; boost?: boolean };
export type TestData = { points: number; recruit: Recruit[]; joined: Joined[]; mine: MyTest[] };

/** 캡처 날: 안드로이드는 구글 조건 14일, 애플은 서로 다른 날 3번 */
export const checksOf = (a: Pick<App, 'platform'>) => (a.platform === 'ios' ? [1, 2, 3] : [1, 7, 14]);
/** 마지막 3자리(10·11·12번째)는 🎫+2 */
export const bonusOf = (r: Pick<Recruit, 'joined' | 'need'>) => (r.joined >= r.need - 3 ? 2 : 1);
/** 목록 순서: 끌어올림 → 12명에 가까움 + 남을 많이 테스트해 준 사람 */
export const sortRecruit = (l: Recruit[]) => [...l].sort((a, b) => Number(!!b.boost) - Number(!!a.boost) || (b.joined * 2 + b.given) - (a.joined * 2 + a.given));

/** 🎫 숫자 */
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

/** 캡처 칸: 했음 / 오늘 열림 / 아직 */
function Slot({ state, src, label }: { state: 'done' | 'open' | 'locked'; src?: string; label: string }) {
  return (
    <div className="slot-col">
      <button className={`slot ${state}`} disabled={state === 'locked'} aria-label={label}>
        {state === 'done' && src && <img src={src} alt="" />}
        {state === 'done' && <span className="slot-ok">{Icon.check}</span>}
        {state === 'open' && Icon.camera}
        {state === 'locked' && Icon.lock}
      </button>
      <span className={`t-sub ${state === 'open' ? 'slot-now' : ''}`}>{label}</span>
    </div>
  );
}

/** 참여 중 카드: 캡처 3칸 → 끝나면 🎫 */
function JoinedCard({ j }: { j: Joined }) {
  const { t } = useApp();
  const checks = checksOf(j.app);
  const all = j.done.every(Boolean);
  return (
    <div className="card">
      <div className="row gap12">
        <AppIcon src={j.app.icon_url} size={40} />
        <span className="row gap6 grow"><span className="t-card ellipsis">{j.app.name}</span><PlatformChip platform={j.app.platform} stage="live" /></span>
        <span className="t-sub">{Math.min(j.day, checks[2])}/{checks[2]}{t.day}</span>
      </div>
      <div className="slots four">
        {checks.map((c, i) => (
          <Slot key={c} label={`${c}${t.day}`} src={j.app.screenshots[0]}
            state={j.done[i] ? 'done' : c <= j.day ? 'open' : 'locked'} />
        ))}
        <div className="slot-col">
          <span className={`slot reward ${all ? 'got' : ''} ${(j.bonus || 1) > 1 ? 'bonus' : ''}`}><Ticket n={j.bonus || 1} plus /></span>
          <span className="t-sub">{t.points}</span>
        </div>
      </div>
      <div className="field-wrap"><input placeholder={t.feedbackPh} maxLength={60} /><button className="icon-btn" aria-label="send">{Icon.send}</button></div>
    </div>
  );
}

/** 모집 한 줄: [아이콘] 이름·사람 n/12 · 🎫+n · [참여] */
export function RecruitRow({ r, joined, full, onJoin }: { r: Recruit; joined: boolean; full: boolean; onJoin: () => void }) {
  const { t } = useApp();
  const b = bonusOf(r);
  return (
    <div className="row gap12 recruit-row">
      <AppIcon src={r.app.icon_url} size={44} />
      <div className="col1">
        <div className="row gap6">
          <span className="t-card ellipsis">{r.app.name}</span>
          <PlatformChip platform={r.app.platform} stage="live" />
          {r.boost && <span className="boost">{Icon.fire}</span>}
        </div>
        <Meter n={r.joined + (joined ? 1 : 0)} need={r.need} />
      </div>
      <span className={`reward-tag ${b > 1 ? 'bonus' : ''}`}><Ticket n={b} plus /></span>
      {joined
        ? <span className="btn-sm on">{Icon.check}</span>
        : <button className="btn-sm primary" disabled={full} onClick={onJoin}>{t.join}</button>}
    </div>
  );
}

/** 티켓 규칙 그림: 얻기 / 쓰기 */
function HowSheet({ open, points, onClose }: { open: boolean; points: number; onClose: () => void }) {
  const { t } = useApp();
  const cams = (days: number[]) => days.map((c) => <span key={c} className="how-cam">{Icon.camera}<span className="t-sub">{c}{t.day}</span></span>);
  const arrow = <span className="how-arrow">{Icon.chevRight}</span>;
  return (
    <Sheet open={open} onClose={onClose} label={t.points}>
      <SheetHeader title={<span className="row gap6">{Icon.ticket}{points}</span>} onClose={onClose} />
      <div className="how">
        <div className="how-row">
          <span className="how-label t-sub">{t.give}</span>
          <span className="how-flow"><span className="how-os">{Icon.android}</span>{cams([1, 7, 14])}{arrow}<Ticket n={1} plus tone="on" /></span>
          <span className="how-flow"><span className="how-os">{Icon.apple}</span>{cams([1, 2, 3])}{arrow}<Ticket n={1} plus tone="on" /></span>
          <span className="how-flow"><span className="how-cam">{Icon.user}<span className="t-sub">10–12</span></span>{arrow}<Ticket n={2} plus tone="on" /></span>
        </div>
        <div className="how-row">
          <span className="how-label t-sub">{t.use}</span>
          <span className="how-flow"><Ticket n={APP_COST} />{arrow}<span className="how-cam">{Icon.plus}<span className="t-sub">{t.appOne}</span></span></span>
          <span className="how-flow"><Ticket n={BOOST_COST} />{arrow}<span className="how-cam boost">{Icon.fire}<span className="t-sub">1{t.day}</span></span></span>
        </div>
      </div>
    </Sheet>
  );
}

/** 모집 목록 시트 */
function RecruitSheet({ open, list, joinedCount, onClose }: { open: boolean; list: Recruit[]; joinedCount: number; onClose: () => void }) {
  const { t } = useApp();
  const [mine, setMine] = useState<Set<string>>(new Set());
  const n = joinedCount + mine.size;
  return (
    <Sheet open={open} onClose={onClose} label={t.findTest} tall>
      <SheetHeader title={t.findTest} sub={`${t.joining} ${n}/${MAX_JOIN}`} onClose={onClose} />
      <div className="testers">
        {sortRecruit(list).map((r) => (
          <RecruitRow key={r.app.id} r={r} joined={mine.has(r.app.id)} full={n >= MAX_JOIN}
            onJoin={() => setMine((s) => new Set(s).add(r.app.id))} />
        ))}
      </div>
    </Sheet>
  );
}

function TesterRow({ x, checks }: { x: Tester; checks: number[] }) {
  return (
    <div className="tester">
      <WhoIcon who={x.who} size={34} />
      <span className="t-body ellipsis tester-name"><WhoName who={x.who} /></span>
      <span className="mini-slots">
        {checks.map((c, i) => <i key={c} className={x.done[i] ? 'ok' : c < x.day ? 'miss' : ''}>{!x.done[i] && c < x.day && Icon.close}</i>)}
      </span>
    </div>
  );
}

/** 내 앱 테스터 시트: 테스터별 캡처 + 피드백 */
function TestersSheet({ m, onClose }: { m: MyTest | null; onClose: () => void }) {
  const { t } = useApp();
  if (!m) return null;
  return (
    <Sheet open onClose={onClose} label={t.testers} tall>
      <SheetHeader title={m.app.name} leading={<AppIcon src={m.app.icon_url} size={44} />} sub={<Meter n={m.testers.length} need={m.need} />} onClose={onClose} />
      <div className="testers">{m.testers.map((x, i) => <TesterRow key={i} x={x} checks={checksOf(m.app)} />)}</div>
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
    </Sheet>
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

/** 내 앱 테스터 한 줄: 사람 n/12 · 🔥 끌어올리기(🎫1) */
function MineRow({ m, onOpen }: { m: MyTest; onOpen: () => void }) {
  const { t } = useApp();
  const [boost, setBoost] = useState(!!m.boost);
  return (
    <div className="list-row">
      <button className="mine-open" onClick={onOpen}>
        <AppIcon src={m.app.icon_url} size={44} />
        <span className="col1">
          <span className="row gap6"><span className="t-card ellipsis">{m.app.name}</span>{boost && <span className="boost">{Icon.fire}</span>}</span>
          <Meter n={m.testers.length} need={m.need} />
        </span>
      </button>
      {boost
        ? <span className="btn-sm on">{Icon.fire}1{t.day}</span>
        : <button className="btn-sm" onClick={() => setBoost(true)} aria-label="boost">{Icon.fire}<Ticket n={BOOST_COST} /></button>}
    </div>
  );
}

/** 내 정보 안 테스트 묶음: 참여 중 + 찾기 / 내 앱 테스터 */
export function TestSections({ d }: { d: TestData }) {
  const { t } = useApp();
  const [find, setFind] = useState(false);
  const [open, setOpen] = useState<MyTest | null>(null);
  return (
    <>
      <Section title={t.joining} aside={<span className="t-sub">{d.joined.length}/{MAX_JOIN}</span>}>
        {d.joined.map((j) => <JoinedCard key={j.app.id} j={j} />)}
        <button className="list-row find-row" onClick={() => setFind(true)}>
          <span className="find-icon">{Icon.plus}</span>
          <span className="t-card grow">{t.findTest}</span>
          <span className="t-sub">{d.recruit.length}</span>
          <span className="chev">{Icon.chevRight}</span>
        </button>
      </Section>

      {d.mine.length > 0 && (
        <Section title={t.testers}>
          {d.mine.map((m) => <MineRow key={m.app.id} m={m} onOpen={() => setOpen(m)} />)}
        </Section>
      )}

      <RecruitSheet open={find} list={d.recruit} joinedCount={d.joined.length} onClose={() => setFind(false)} />
      <TestersSheet m={open} onClose={() => setOpen(null)} />
    </>
  );
}

/** 앱 상세 안 모집 띠: 사람 n/12 · 🎫+n · [참여] */
export function RecruitStrip({ r }: { r: Recruit }) {
  const { t } = useApp();
  const [joined, setJoined] = useState(false);
  const b = bonusOf(r);
  return (
    <div className="card recruit-strip">
      <div className="row gap12">
        <span className="find-icon">{Icon.flask}</span>
        <div className="col1">
          <span className="row gap6"><span className="t-card">{t.testers}</span>{r.boost && <span className="boost">{Icon.fire}</span>}</span>
          <Meter n={r.joined + (joined ? 1 : 0)} need={r.need} />
        </div>
        <span className={`reward-tag ${b > 1 ? 'bonus' : ''}`}><Ticket n={b} plus /></span>
        {joined
          ? <span className="btn-sm on">{Icon.check}</span>
          : <button className="btn-sm primary" onClick={() => setJoined(true)}>{t.join}</button>}
      </div>
    </div>
  );
}
