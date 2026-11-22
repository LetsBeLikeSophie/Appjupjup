'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/ctx';
import { sb } from '@/lib/supabase';
import { shrinkImage } from '@/lib/image';
import { Avatar, Icon } from './ui';
import { Sheet, SheetHeader } from './layout';

/** 앱줍줍 안에서 쓰는 이름·사진. 처음 로그인하면 자동으로 열려요 */
export function ProfileSheet() {
  const { profile, profileOpen, setProfileOpen, setUploadOpen, refreshProfile, t, toast } = useApp();
  const router = useRouter();
  const [nick, setNick] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const first = !!profile && !profile.setup_done;

  useEffect(() => {
    if (!profileOpen || !profile) return;
    setNick(first ? '' : profile.nickname);
    setFile(null);
    setPreview(profile.avatar_url);
  }, [profileOpen, profile, first]);

  if (!profile) return null;

  const pick = (f: File) => { setFile(f); setPreview(URL.createObjectURL(f)); };

  const save = async () => {
    setBusy(true);
    let avatar_url = profile.avatar_url;
    if (file) {
      const path = `${profile.id}/avatar.jpg`;
      let blob: Blob;
      try { blob = await shrinkImage(file); } catch { setBusy(false); toast(t.errGeneric); return; }
      const { error } = await sb().storage.from('aj-avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (error) { setBusy(false); toast(t.errGeneric); return; }
      avatar_url = sb().storage.from('aj-avatars').getPublicUrl(path).data.publicUrl + `?v=${Date.now()}`;
    }
    const { error } = await sb().from('aj_profiles').update({ nickname: nick.trim(), avatar_url, setup_done: true }).eq('id', profile.id);
    setBusy(false);
    if (error) { toast(t.errGeneric); return; }
    const wasFirst = first;
    await refreshProfile();
    setProfileOpen(false);
    // 처음 가입이면 내 정보로 가서 앱 올리기를 바로 열어요
    if (wasFirst) { router.push('/me'); setTimeout(() => setUploadOpen(true), 300); }
  };

  return (
    <Sheet open={profileOpen} onClose={() => setProfileOpen(false)} label={t.profileTitle}>
      <SheetHeader title={first ? t.profileTitleFirst : t.profileTitle} sub={first ? t.profileHint : undefined} onClose={() => setProfileOpen(false)} />
      <div className="stack">
        <button className="avatar-btn" aria-label={t.photoChange} onClick={() => input.current?.click()}>
          <Avatar src={preview} size={96} />
          <span className="cam">{Icon.camera}</span>
        </button>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        <label className="sr" htmlFor="nick">{t.nickname}</label>
        <input id="nick" className="field" placeholder={t.nickname} maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} />
      </div>
      <button className="btn dark" disabled={busy || !nick.trim()} onClick={save}>{t.save}</button>
    </Sheet>
  );
}
