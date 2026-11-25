'use client';
// 테스터 교환 부품: 내 정보 안에 들어가요 (지금은 화면만, 가짜 데이터 /demo/me)
// 규칙이 보이게: 1·7·14일 캡처 → 🎫+1 / 🎫1 → 테스터 1명
import { useState } from 'react';
import { useApp } from '@/lib/ctx';
import type { App, Person } from '@/lib/supabase';
import { AppIcon, Icon, WhoIcon, WhoName } from './ui';
import { PlatformChip } from './app-parts';
import { Section, Sheet, SheetHeader } from './layout';

export const CHECKS = [1, 7, 14];
export const MAX_JOIN = 10;
export type Recruit = { app: App; joined: number; need: number };
export type Joined = { app: App; day: number; done: boolean[] };
export type Tester = { who: Person; day: number; done: boolean[] };
export type MyTest = { app: App; need: number; testers: Tester[]; feedback: { who: Person; body: string; day: number }[] };
export type TestData = { points: number; recruit: Recruit[]; joined: Joined[]; mine: MyTest[] };

/** 🎫 숫자 */
export function Ticket({ n, plus, tone }: { n: number | string; plus?: boolean; tone?: 'on' | 'off' }) {
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

/** 참여 중 카드: 캡처 3칸 → 끝나면 🎫+1 */
function JoinedCard({ j }: { j: Joined }) {
  const { t } = useApp();
  const all = j.done.every(Boolean);
  return (
    <div className="card">
      <div className="row gap12">
        <AppIcon src={j.app.icon_url} size={40} />
        <span className="t-card ellipsis grow">{j.app.name}</span>
        <span className="t-sub">{j.day}/14{t.day}</span>
      </div>
      <div className="slots four">
        {CHECKS.map((c, i) => (
          <Slot key={c} label={`${c}${t.day}`} src={j.app.screenshots[0]}
            state={j.done[i] ? 'done' : c <= j.day ? 'open' : 'locked'} />
        ))}
        <div className="slot-col">
          <span className={`slot reward ${all ? 'got' : ''}`}><Ticket n={1} plus /></span>
          <span className="t-sub">{t.points}</span>
        </div>
      </div>
      <div className="field-wrap"><input placeholder={t.feedbackPh} maxLength={60} /><button className="icon-btn" aria-label="send">{Icon.send}</button></div>
    </div>
  );
}

/** 모집 한 줄: [아이콘] 이름·n/12 · [참여] */
export function RecruitRow({ r, joined, full, onJoin }: { r: Recruit; joined: boolean; full: boolean; onJoin: () => void }) {
  const { t } = useApp();
  return (
    <div className="row gap12 recruit-row">
      <AppIcon src={r.app.icon_url} size={44} />
      <div className="col1">
        <div className="row gap6"><span className="t-card ellipsis">{r.app.name}</span><PlatformChip platform={r.app.platform} stage="live" /></div>
        <Meter n={r.joined + (joined ? 1 : 0)} need={r.need} />
      </div>
      {joined
        ? <span className="btn-sm on">{Icon.check}{t.joining}</span>
        : <button className="btn-sm primary" disabled={full} onClick={onJoin}>{t.join}</button>}
    </div>
  );
}

/** 포인트 규칙 그림: 해 주기 → +1 / 1 → 테스터 1명 */
function HowSheet({ open, points, onClose }: { open: boolean; points: number; onClose: () => void }) {
  const { t } = useApp();
  return (
    <Sheet open={open} onClose={onClose} label={t.points}>
      <SheetHeader title={<span className="row gap6">{Icon.ticket}{points}</span>} sub={t.points} onClose={onClose} />
      <div className="how">
        <div className="how-row">
          <span className="how-label t-sub">{t.give}</span>
          <span className="how-flow">
            {CHECKS.map((c) => <span key={c} className="how-cam">{Icon.camera}<span className="t-sub">{c}{t.day}</span></span>)}
            <span className="how-arrow">{Icon.chevRight}</span>
            <Ticket n={1} plus tone="on" />
          </span>
        </div>
        <div className="how-row">
          <span className="how-label t-sub">{t.receive}</span>
          <span className="how-flow">
            <Ticket n={1} />
            <span className="how-arrow">{Icon.chevRight}</span>
            <span className="how-cam">{Icon.user}<span className="t-sub">{t.testers} 1</span></span>
          </span>
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
      <SheetHeader title={t.findTest} sub={<span className="row gap6">{t.joining} {n}/{MAX_JOIN} · <Ticket n={1} plus /> / 14{t.day}</span>} onClose={onClose} />
      <div className="testers">
        {list.map((r) => (
          <RecruitRow key={r.app.id} r={r} joined={mine.has(r.app.id)} full={n >= MAX_JOIN}
            onJoin={() => setMine((s) => new Set(s).add(r.app.id))} />
        ))}
      </div>
    </Sheet>
  );
}

function TesterRow({ x }: { x: Tester }) {
  return (
    <div className="tester">
      <WhoIcon who={x.who} size={34} />
      <span className="t-body ellipsis tester-name"><WhoName who={x.who} /></span>
      <span className="mini-slots">
        {CHECKS.map((c, i) => <i key={c} className={x.done[i] ? 'ok' : c < x.day ? 'miss' : ''}>{!x.done[i] && c < x.day && Icon.close}</i>)}
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
      <div className="testers">{m.testers.map((x, i) => <TesterRow key={i} x={x} />)}</div>
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

/** 포인트 카드 (내 정보 온도 옆) */
export function PointsCard({ points }: { points: number }) {
  const { t } = useApp();
  const [how, setHow] = useState(false);
  return (
    <>
      <button className="temp-card stat" onClick={() => setHow(true)} aria-label={t.points}>
        <span className="temp big">{Icon.ticket}{points}</span>
        <span className="t-sub">{t.points}</span>
      </button>
      <HowSheet open={how} points={points} onClose={() => setHow(false)} />
    </>
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
          {d.mine.map((m) => (
            <button key={m.app.id} className="list-row" onClick={() => setOpen(m)}>
              <AppIcon src={m.app.icon_url} size={44} />
              <span className="col1">
                <span className="t-card ellipsis">{m.app.name}</span>
                <Meter n={m.testers.length} need={m.need} />
              </span>
              <span className="who-stack">{m.testers.slice(0, 3).map((x, i) => <WhoIcon key={i} who={x.who} size={26} />)}</span>
              <span className="chev">{Icon.chevRight}</span>
            </button>
          ))}
        </Section>
      )}

      <RecruitSheet open={find} list={d.recruit} joinedCount={d.joined.length} onClose={() => setFind(false)} />
      <TestersSheet m={open} onClose={() => setOpen(null)} />
    </>
  );
}

/** 앱 상세 안 모집 띠: 테스터 n/12 · [참여] */
export function RecruitStrip({ r }: { r: Recruit }) {
  const { t } = useApp();
  const [joined, setJoined] = useState(false);
  return (
    <div className="card recruit-strip">
      <div className="row gap12">
        <span className="find-icon">{Icon.flask}</span>
        <div className="col1">
          <span className="row gap6"><span className="t-card">{t.testers}</span><Ticket n={1} plus /></span>
          <Meter n={r.joined + (joined ? 1 : 0)} need={r.need} />
        </div>
        {joined
          ? <span className="btn-sm on">{Icon.check}{t.joining}</span>
          : <button className="btn-sm primary" onClick={() => setJoined(true)}>{t.join}</button>}
      </div>
    </div>
  );
}
