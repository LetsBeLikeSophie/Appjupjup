'use client';
// 테스터 교환 부품: 내 정보 안에 들어가요 (지금은 화면만, 가짜 데이터 /demo/me)
// 🎫 = 노출권. 얻기: 남의 앱 테스트 끝(안드로이드 1·7·14일 / 애플 1·2·3일 캡처) → +1, 마지막 3자리 → +2
//              쓰기: 앱 하나 더 올리기 🎫2 · 내 앱에 🎫 걸기(테스터 보상 +1, 참여 순간 그 사람 몫으로 잠김, 안 잠긴 것만 뺄 수 있음, 탈락하면 돌아옴)
import { useState } from 'react';
import { useApp } from '@/lib/ctx';
import type { App, Person } from '@/lib/supabase';
import { AppIcon, Icon, WhoIcon, WhoName } from './ui';
import { PlatformChip } from './app-parts';
import { Section, Sheet, SheetHeader } from './layout';

export const MAX_JOIN = 10;
export const APP_COST = 2;
export type Recruit = { app: App; joined: number; need: number; given: number; stake?: number };
export type Joined = { app: App; day: number; done: boolean[]; bonus?: number };
export type Tester = { who: Person; day: number; done: boolean[] };
export type MyTest = { app: App; need: number; testers: Tester[]; feedback: { who: Person; body: string; day: number }[]; stake: number; locked: number };
export type TestData = { points: number; recruit: Recruit[]; joined: Joined[]; mine: MyTest[] };

/** 캡처 날: 안드로이드는 구글 조건 14일, 애플은 서로 다른 날 3번 */
export const checksOf = (a: Pick<App, 'platform'>) => (a.platform === 'ios' ? [1, 2, 3] : [1, 7, 14]);
/** 보상: 기본 1 + 마지막 3자리(10~12번째) 1 + 주인이 건 티켓 남아 있으면 1 */
export const bonusOf = (r: Pick<Recruit, 'joined' | 'need' | 'stake'>) => 1 + (r.joined >= r.need - 3 ? 1 : 0) + ((r.stake || 0) > 0 ? 1 : 0);
/** 목록 순서: 보상 큰 앱 → 12명에 가까움 + 남을 많이 테스트해 준 사람 */
export const sortRecruit = (l: Recruit[]) => [...l].sort((a, b) => bonusOf(b) - bonusOf(a) || (b.joined * 2 + b.given) - (a.joined * 2 + a.given));

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
function Slot({ state, src, label, onClick }: { state: 'done' | 'open' | 'locked'; src?: string; label: string; onClick?: () => void }) {
  return (
    <div className="slot-col">
      <button className={`slot ${state}`} aria-label={label} onClick={onClick}>
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
  const { t, toast } = useApp();
  const checks = checksOf(j.app);
  const [done, setDone] = useState(j.done);
  const [fb, setFb] = useState('');
  const all = done.every(Boolean);
  const tap = (i: number, c: number) => {
    if (done[i]) return;
    if (c > j.day) { toast(`${c}${t.day}${t.opensOn}`); return; }
    const next = done.map((d, k) => d || k === i);
    setDone(next);
    toast(next.every(Boolean) ? `🎫+${j.bonus || 1}${t.gotT}` : `${c}${t.day}${t.captured}`);
  };
  const send = () => { if (!fb.trim()) return; setFb(''); toast(t.sent); };
  return (
    <div className="card">
      <div className="row gap12">
        <AppIcon src={j.app.icon_url} size={40} />
        <span className="row gap6 grow"><span className="t-card ellipsis">{j.app.name}</span><PlatformChip platform={j.app.platform} stage="live" /></span>
        <span className="t-sub">{Math.min(j.day, checks[2])}/{checks[2]}{t.day}</span>
      </div>
      <div className="slots four">
        {checks.map((c, i) => (
          <Slot key={c} label={`${c}${t.day}`} src={j.app.screenshots[0]} onClick={() => tap(i, c)}
            state={done[i] ? 'done' : c <= j.day ? 'open' : 'locked'} />
        ))}
        <div className="slot-col">
          <span className={`slot reward ${all ? 'got' : ''} ${(j.bonus || 1) > 1 ? 'bonus' : ''}`}><Ticket n={j.bonus || 1} plus /></span>
          <span className="t-sub">{t.points}</span>
        </div>
      </div>
      <div className="field-wrap">
        <input placeholder={t.feedbackPh} maxLength={60} value={fb} onChange={(e) => setFb(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} enterKeyHint="send" />
        <button className="icon-btn" aria-label="send" onClick={send}>{Icon.send}</button>
      </div>
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
        </div>
        <Meter n={r.joined + (joined ? 1 : 0)} need={r.need} />
      </div>
      <span className={`reward-tag ${b > 1 ? 'bonus' : ''}`}><Ticket n={b} plus /></span>
      {joined
        ? <span className="btn-sm on">{Icon.check}</span>
        : <button className={`btn-sm primary ${full ? 'dim' : ''}`} onClick={onJoin}>{t.join}</button>}
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
          <span className="how-flow"><Ticket n={1} />{arrow}<span className="how-cam">{Icon.user}<Ticket n={1} plus /></span></span>
        </div>
      </div>
    </Sheet>
  );
}

/** 모집 목록 시트 */
function RecruitSheet({ open, list, joinedCount, onClose }: { open: boolean; list: Recruit[]; joinedCount: number; onClose: () => void }) {
  const { t, toast } = useApp();
  const [mine, setMine] = useState<Set<string>>(new Set());
  const n = joinedCount + mine.size;
  return (
    <Sheet open={open} onClose={onClose} label={t.findTest} tall>
      <SheetHeader title={t.findTest} sub={`${t.joining} ${n}/${MAX_JOIN}`} onClose={onClose} />
      <div className="testers">
        {sortRecruit(list).map((r) => (
          <RecruitRow key={r.app.id} r={r} joined={mine.has(r.app.id)} full={n >= MAX_JOIN}
            onJoin={() => {
              if (n >= MAX_JOIN) { toast(t.maxJoin); return; }
              setMine((s) => new Set(s).add(r.app.id));
              toast(`${t.joinedT} · 🎫+${bonusOf(r)}`);
            }} />
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

/** 내 앱 테스터 한 줄: 사람 n/12 · 🎫 걸기 [− n +] (잠긴 것은 못 뺌) */
function MineRow({ m, onOpen }: { m: MyTest; onOpen: () => void }) {
  const { t, toast } = useApp();
  const [stake, setStake] = useState(m.stake);
  return (
    <div className="list-row">
      <button className="mine-open" onClick={onOpen}>
        <AppIcon src={m.app.icon_url} size={44} />
        <span className="col1">
          <span className="t-card ellipsis">{m.app.name}</span>
          <Meter n={m.testers.length} need={m.need} />
        </span>
      </button>
      <span className="stake">
        <button className={`stake-btn ${stake <= m.locked ? 'dim' : ''}`} aria-label="-" onClick={() => { if (stake <= m.locked) { toast(t.stakeLocked); return; } setStake((n) => n - 1); toast(`🎫1${t.unstaked}`); }}>−</button>
        <span className="stake-n"><Ticket n={stake} />{m.locked > 0 && <span className="stake-lock">{Icon.lock}{m.locked}</span>}</span>
        <button className="stake-btn" aria-label="+" onClick={() => { setStake((n) => n + 1); toast(`🎫1${t.staked}`); }}>+</button>
      </span>
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
  const { t, toast } = useApp();
  const [joined, setJoined] = useState(false);
  const b = bonusOf(r);
  return (
    <div className="card recruit-strip">
      <div className="row gap12">
        <span className="find-icon">{Icon.flask}</span>
        <div className="col1">
          <span className="t-card">{t.testers}</span>
          <Meter n={r.joined + (joined ? 1 : 0)} need={r.need} />
        </div>
        <span className={`reward-tag ${b > 1 ? 'bonus' : ''}`}><Ticket n={b} plus /></span>
        {joined
          ? <span className="btn-sm on">{Icon.check}</span>
          : <button className="btn-sm primary" onClick={() => { setJoined(true); toast(`${t.joinedT} · 🎫+${b}`); }}>{t.join}</button>}
      </div>
    </div>
  );
}
