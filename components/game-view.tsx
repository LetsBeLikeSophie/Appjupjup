'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/lib/ctx';
import type { App } from '@/lib/supabase';
import { AppIcon, GetButton, Icon, IconButton } from './ui';
import { tiltOf } from './app-parts';

/** 랜덤으로 8·4·2개 뽑기. 티켓 건 앱(boost)은 판마다 1/4 자리까지 먼저 넣음 */
function draw(pool: App[], boost?: Set<string>) {
  const mix = (l: App[]) => [...l].sort(() => Math.random() - 0.5);
  const n = pool.length >= 8 ? 8 : pool.length >= 4 ? 4 : pool.length >= 2 ? 2 : 0;
  const hot = mix(pool.filter((a) => boost?.has(a.id))).slice(0, Math.max(1, n / 4));
  return mix([...hot, ...mix(pool.filter((a) => !hot.includes(a)))].slice(0, n));
}

function Pick({ app, onPick }: { app: App; onPick: () => void }) {
  return (
    <button className="vs-card" onClick={onPick} aria-label={app.name}>
      <span className="vs-info">
        <AppIcon src={app.icon_url} size={56} tilt={tiltOf(app.id)} />
        <b className="t-name clamp2">{app.name}</b>
        {app.tagline && <span className="t-body t-muted clamp2">{app.tagline}</span>}
      </span>
      <span className="vs-shots">
        {app.screenshots.slice(0, 2).map((u) => <img key={u} src={u} alt="" />)}
      </span>
    </button>
  );
}

/** 밸런스 게임: 둘 중 하나 → 우승 앱 받아볼래요? 숫자·% 없음 */
export function GameView({ pool, onClose, boost }: { pool: App[] | null; onClose: () => void; boost?: Set<string> }) {
  const { t } = useApp();
  const [round, setRound] = useState<App[]>([]);
  const [winners, setWinners] = useState<App[]>([]);
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);

  const start = useCallback(() => {
    if (!pool) return;
    const d = draw(pool, boost);
    setRound(d); setWinners([]); setPos(0); setDone(0); setTotal(Math.max(0, d.length - 1));
  }, [pool, boost]);
  useEffect(start, [start]);

  const champ = round.length === 1 ? round[0] : null;
  const pick = (a: App) => {
    const w = [...winners, a];
    setDone((x) => x + 1);
    if (pos + 2 >= round.length) { setRound(w); setWinners([]); setPos(0); }
    else { setWinners(w); setPos(pos + 2); }
  };

  return (
    <div className="game">
      <div className="game-top">
        <IconButton label={t.close} tone="white" onClick={onClose}>{Icon.close}</IconButton>
        <div className="dots" aria-hidden>{Array.from({ length: total }, (_, i) => <i key={i} className={i < done ? 'on' : ''} />)}</div>
        <span style={{ width: 'var(--icon-btn)' }} />
      </div>

      {pool && round.length === 0 && <div className="loading">{t.empty}</div>}

      {round.length >= 2 && (
        <div className="vs" key={`${round[pos].id}-${round[pos + 1].id}`}>
          <Pick app={round[pos]} onPick={() => pick(round[pos])} />
          <span className="vs-mid" aria-hidden>VS</span>
          <Pick app={round[pos + 1]} onPick={() => pick(round[pos + 1])} />
        </div>
      )}

      {champ && (
        <div className="champ">
          <AppIcon src={champ.icon_url} size={120}><span className="crown">{Icon.crown}</span></AppIcon>
          <b className="t-title">{champ.name}</b>
          {champ.tagline && <span className="t-body t-muted">{champ.tagline}</span>}
          <div className="champ-foot">
            <b className="t-section">{t.wantIt}</b>
            <GetButton app={champ} big />
            <button className="btn soft" onClick={start}>{t.gameAgain}</button>
          </div>
        </div>
      )}
    </div>
  );
}
