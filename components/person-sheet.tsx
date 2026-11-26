'use client';
import { useApp } from '@/lib/ctx';
import type { Person } from '@/lib/supabase';
import { WhoIcon, WhoName } from './ui';
import { Sheet } from './layout';
import { AppTile } from './app-parts';

/** 이름(앱)을 누르면: 그 사람 앱 3개 + 온도 */
export function PersonSheet({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const { t } = useApp();
  if (!person) return null;
  const apps = person.apps || [];
  return (
    <Sheet open onClose={onClose} label={t.me}>
      {apps.length > 0 ? (
        <div className="tiles center">
          {apps.map((a) => <AppTile key={a.id} app={a} size={72} star={a.is_primary} href={`/app/${a.id}`} />)}
        </div>
      ) : (
        <div className="person-guest"><WhoIcon who={person} size={72} /><b className="t-card"><WhoName who={person} /></b></div>
      )}
    </Sheet>
  );
}
