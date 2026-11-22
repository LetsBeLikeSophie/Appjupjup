'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/ctx';
import { sb, type App } from '@/lib/supabase';
import { AppIcon, Icon, Sheet } from './ui';

/** 내 앱을 누르면 열리는 수정 창 */
export function MyAppSheet({ app, onClose, onChanged }: { app: App | null; onClose: () => void; onChanged: () => void }) {
  const { t, toast } = useApp();
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [world, setWorld] = useState(false);
  const [cc, setCc] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!app) return;
    setName(app.name); setTagline(app.tagline || '');
    setWorld(app.all_countries); setCc((app.countries || []).join(', '));
  }, [app]);

  if (!app) return null;

  const save = async () => {
    setBusy(true);
    const countries = cc.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter((x) => /^[A-Z]{2}$/.test(x));
    const { error } = await sb().from('aj_apps').update({
      name: name.trim(), tagline: tagline.trim() || null, all_countries: world, countries: countries.length ? countries : app.countries,
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
    <Sheet open onClose={onClose} label={t.editApp}>
      <div className="sheet-head">
        <div className="row gap12">
          <AppIcon src={app.icon_url} size={48} />
          <h2 className="h-sheet">{t.editApp}</h2>
        </div>
        <button className="round" aria-label={t.close} onClick={onClose}>{Icon.close}</button>
      </div>
      <div className="form">
        <label className="form-label" htmlFor="ma-name">{t.appName2}</label>
        <input id="ma-name" className="field" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        <label className="form-label" htmlFor="ma-tag">{t.tagline}</label>
        <input id="ma-tag" className="field" maxLength={60} placeholder={t.taglinePh} value={tagline} onChange={(e) => setTagline(e.target.value)} />
        <span className="form-label">{t.countries}</span>
        <label className="row gap8 check"><input type="checkbox" checked={world} onChange={(e) => setWorld(e.target.checked)} /> {t.worldwide}</label>
        {!world && <input className="field" aria-label={t.countries} placeholder={t.countriesHint} value={cc} onChange={(e) => setCc(e.target.value)} />}
      </div>
      <button className="btn dark" disabled={busy || !name.trim()} onClick={save}>{t.save}</button>
      <div className="row between">
        {app.is_primary
          ? <span className="badge">{Icon.star}{t.primary}</span>
          : <button className="text-btn" onClick={makePrimary}>{Icon.star}{t.makePrimary}</button>}
        <button className="text-btn danger" onClick={remove}>{t.deleteApp}</button>
      </div>
    </Sheet>
  );
}
