'use client';
import { useEffect, useState } from 'react';
import { cardColor } from './supabase';

type Tone = { bg: string; ink: string };
const cache = new Map<string, Tone>();

function mix(c: number[], w: number[], t: number) {
  return c.map((v, i) => Math.round(v * (1 - t) + w[i] * t));
}
const hex = (c: number[]) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

/** 아이콘에서 가장 많이 쓰인 색을 뽑아 연하게(배경) / 진하게(글자) 만들어요. 실패하면 고정 팔레트 */
export function useIconColor(id: string, icon?: string | null): Tone {
  const fallback = cardColor(id);
  const [tone, setTone] = useState<Tone>(() => (icon && cache.get(icon)) || fallback);

  useEffect(() => {
    if (!icon) return;
    if (cache.has(icon)) { setTone(cache.get(icon)!); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const n = 24;
        const cv = document.createElement('canvas');
        cv.width = n; cv.height = n;
        const ctx = cv.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, n, n);
        const d = ctx.getImageData(0, 0, n, n).data;
        const buckets = new Map<string, { c: number[]; k: number }>();
        for (let i = 0; i < d.length; i += 4) {
          const [r, g, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
          if (a < 200) continue;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          if (max > 235 && min > 225) continue; // 흰색 제외
          if (max < 30) continue; // 검정 제외
          const key = [r >> 5, g >> 5, b >> 5].join(',');
          const e = buckets.get(key) || { c: [0, 0, 0], k: 0 };
          e.c[0] += r; e.c[1] += g; e.c[2] += b; e.k++;
          buckets.set(key, e);
        }
        const top = [...buckets.values()].sort((a, b) => b.k - a.k)[0];
        if (!top) return;
        const base = top.c.map((v) => v / top.k);
        const t = { bg: hex(mix(base, [255, 255, 255], 0.72)), ink: hex(mix(base, [18, 18, 20], 0.72)) };
        cache.set(icon, t);
        setTone(t);
      } catch { /* CORS로 막히면 기본 팔레트 */ }
    };
    img.src = icon;
  }, [icon]);

  return tone;
}
