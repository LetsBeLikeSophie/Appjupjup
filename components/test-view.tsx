'use client';
// 테스터 교환: 모집 / 참여 중(1·7·14일 캡처) / 내 앱 현황. 지금은 화면만 (가짜 데이터, /demo/test)
import { useState } from 'react';
import { useApp } from '@/lib/ctx';
import type { App, Person } from '@/lib/supabase';
import { AppIcon, Icon, WhoIcon, WhoName } from './ui';
import { PlatformChip } from './app-parts';
import { Page, Section } from './layout';

export const CHECKS = [1, 7, 14];
export type Recruit = { app: App; joined: number; need: number };
export type Joined = { app: App; day: number; done: boolean[] };
export type Tester = { who: Person; day: number; done: boolean[] };
export type MyTest = { app: App; need: number; testers: Tester[]; feedback: { who: Person; body: string; day: number }[] };

/** 14일 막대: 지난 날 채움, 확인일(1·7·14)은 굵게 */
function Days({ day, done }: { day: number; done: boolean[] }) {
  return (
    <div className="days" aria-label={`${day}/14`}>
      {[...Array(14)].map((_, i) => {
        const ck = CHECKS.indexOf(i + 1);
        return <i key={i} className={`${i < day ? 'on' : ''} ${ck >= 0 ? (done[ck] ? 'ck ok' : 'ck') : ''}`} />;
      })}
    </div>
  );
}

function Meter({ n, need }: { n: number; need: number }) {
  return (
    <div className="meter">
      <span className="meter-bar"><i style={{ width: `${Math.min(100, (n / need) * 100)}%` }} /></span>
      <span className="t-sub">{n}/{need}</span>
    </div>
  );
}

/** 캡처 칸 하나: 했음(사진) / 오늘 열림 / 아직(잠김) */
function Slot({ state, src, label }: { state: 'done' | 'open' | 'locked'; src?: string; label: string }) {
  return (
    <div className="slot-col">
      <button className={`slot ${state}`} disabled={state === 'locked'} aria-label={label}>
        {state === 'done' && src && <img src={src} alt="" />}
        {state === 'done' && <span className="slot-ok">{Icon.check}</span>}
        {state === 'open' && Icon.camera}
        {state === 'locked' && Icon.lock}
      </button>
      <span className="t-sub">{label}</span>
    </div>
  );
}

function JoinedCard({ j }: { j: Joined }) {
  const { t } = useApp();
  return (
    <div className="card">
      <div className="row gap12">
        <AppIcon src={j.app.icon_url} size={44} />
        <div className="col1"><div className="t-card ellipsis">{j.app.name}</div><Days day={j.day} done={j.done} /></div>
        <span className="day-badge">{j.day}{t.day}</span>
      </div>
      <div className="slots">
        {CHECKS.map((c, i) => (
          <Slot key={c} label={`${c}${t.day}`} src={j.app.screenshots[0]}
            state={j.done[i] ? 'done' : c <= j.day ? 'open' : 'locked'} />
        ))}
      </div>
      <div className="field-wrap"><input placeholder={t.feedbackPh} maxLength={60} /><button className="icon-btn" aria-label="send">{Icon.send}</button></div>
    </div>
  );
}

function TesterRow({ x }: { x: Tester }) {
  const { t } = useApp();
  const miss = CHECKS.some((c, i) => c < x.day && !x.done[i]);
  return (
    <div className="tester">
      <WhoIcon who={x.who} size={34} />
      <span className="t-body ellipsis tester-name"><WhoName who={x.who} /></span>
      <span className="mini-slots">
        {CHECKS.map((c, i) => <i key={c} className={x.done[i] ? 'ok' : c < x.day ? 'miss' : ''} />)}
      </span>
      {miss && <button className="btn-sm">{t.notDone}</button>}
    </div>
  );
}

export function TestView({ points, recruit, joined, mine }: { points: number; recruit: Recruit[]; joined: Joined[]; mine: MyTest | null }) {
  const { t } = useApp();
  const [tab, setTab] = useState<'recruit' | 'joining' | 'mine'>('joining');
  const tabs = [['recruit', t.recruit], ['joining', `${t.joining} ${joined.length}`], ['mine', t.myTests]] as const;
  return (
    <Page title={t.test} action={<span className="points" aria-label={t.points}>{Icon.ticket}{points}</span>}>
      <div className="cat-row flush" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`cat ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'recruit' && recruit.map((r) => (
        <div key={r.app.id} className="card">
          <div className="row gap12">
            <AppIcon src={r.app.icon_url} size={48} />
            <div className="col1">
              <div className="row gap6"><span className="t-card ellipsis">{r.app.name}</span><PlatformChip platform={r.app.platform} stage="live" /></div>
              <Meter n={r.joined} need={r.need} />
            </div>
            <button className="btn-sm primary">{t.join}</button>
          </div>
        </div>
      ))}

      {tab === 'joining' && joined.map((j) => <JoinedCard key={j.app.id} j={j} />)}

      {tab === 'mine' && mine && (
        <>
          <div className="card">
            <div className="row gap12">
              <AppIcon src={mine.app.icon_url} size={48} />
              <div className="col1"><div className="t-card ellipsis">{mine.app.name}</div><Meter n={mine.testers.length} need={mine.need} /></div>
            </div>
            <div className="testers">{mine.testers.map((x, i) => <TesterRow key={i} x={x} />)}</div>
          </div>
          <Section title={t.feedback} aside={<span className="t-sub">{mine.feedback.length}</span>}>
            <div className="card">
              {mine.feedback.map((f, i) => (
                <div key={i} className="cm">
                  <WhoIcon who={f.who} size={34} />
                  <div className="cm-body">
                    <span className="cm-head"><span className="cm-name ellipsis"><WhoName who={f.who} /></span><span className="t-sub">{f.day}{t.day}</span></span>
                    <span className="t-body">{f.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </Page>
  );
}
