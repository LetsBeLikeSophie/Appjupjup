'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, type App } from '@/lib/supabase';
import { AppIcon, Chip, Icon } from './ui';
import { Sheet, SheetHeader } from './layout';
import { CountryEditor, SayInput, parseCountries } from './app-parts';
import { MyTestPanel, type MyTest, type TestH } from './test-view';

/** 내 앱을 누르면 열리는 수정 창 */
export function MyAppSheet({ app, onClose, onChanged, test, testH }: { app: App | null; onClose: () => void; onChanged: () => void; test?: MyTest; testH?: TestH }) {
  const { t, toast } = useApp();
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [say, setSay] = useState('');
  const [world, setWorld] = useState(false);
  const [cc, setCc] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!app) return;
    setName(app.name); setTagline(app.tagline || ''); setSay(app.say || '');
    setWorld(app.all_countries); setCc((app.countries || []).join(', '));
  }, [app]);

  if (!app) return null;

  const save = async () => {
    setBusy(true);
    const countries = parseCountries(cc);
    const { error } = await sb().from('aj_apps').update({
      name: name.trim(), tagline: tagline.trim() || null, say: say.trim() || null, all_countries: world, countries: countries.length ? countries : app.countries,
    }).eq('id', app.id);
    setBusy(false);
    if (error) { toast(t.errGeneric); return; }
    toast(t.saved); onChanged(); onClose();
  };
  const makePrimary = async () => { await sb().rpc('aj_set_primary', { p_app: app.id }); onChanged(); onClose(); };
  const remove = async () => {
    if (!confirm(`${app.name}\n${t.deleteApp}?`)) return;
    await sb().from('aj_apps').delete().eq('id', app.id);
    onChanged(); onClose();
  };

  return (
    <Sheet open onClose={onClose} label={t.editApp} tall>
      <SheetHeader title={app.name} leading={<AppIcon src={app.icon_url} size={48} />} onClose={onClose} />
      {test && testH && <div className="myapp-test"><MyTestPanel key={`${test.open}:${test.stake}:${test.locked}`} m={test} h={testH} /></div>}
      <span className="label">{t.editApp}</span>
      <div className="form">
        <label className="label" htmlFor="ma-name">{t.appName2}</label>
        <input id="ma-name" className="field" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        <label className="label" htmlFor="ma-tag">{t.tagline}</label>
        <input id="ma-tag" className="field" maxLength={60} value={tagline} onChange={(e) => setTagline(e.target.value)} />
        <SayInput id="ma-say" value={say} onChange={setSay} />
        <span className="label">{t.countries}</span>
        <CountryEditor world={world} setWorld={setWorld} cc={cc} setCc={setCc} />
      </div>
      <button className="btn soft" disabled={busy || !name.trim()} onClick={save}>{t.save}</button>
      <div className="row between">
        {app.is_primary
          ? <Chip>{Icon.star}{t.primary}</Chip>
          : <button className="btn-sm" onClick={makePrimary}>{Icon.star}{t.makePrimary}</button>}
        <a className="btn-sm ghost" href={`/app/${app.id}`}>{t.dupSee}</a>
        <button className="btn-sm danger" onClick={remove}>{t.deleteApp}</button>
      </div>
    </Sheet>
  );
}
