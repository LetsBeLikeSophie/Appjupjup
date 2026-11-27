'use client';
/** 스토어 이미지 주소를 화면 크기에 맞게 (원본 512px·원본 크기 대신). 모양 모르면 그대로
 *  애플: .../512x512bb.jpg → {px}x{px}bb / 스크린샷 .../392x696bb.jpg → 높이 px 기준
 *  플레이: ...=w240-h480 같은 꼬리 떼고 아이콘 =s{px}, 스크린샷 =h{px} */
export function sized(url: string | null | undefined, px: number, kind: 'icon' | 'shot' = 'icon') {
  if (!url) return url;
  px = Math.round(px);
  const apple = url.match(/^(https:\/\/[^/]*mzstatic\.com\/.*\/)(\d+)x(\d+)(bb|sr)?(\.(?:jpg|jpeg|png|webp))$/i);
  if (apple) {
    const [, base, w, h, suf = 'bb', ext] = apple;
    if (kind === 'icon') return `${base}${px}x${px}${suf}${ext}`;
    const hh = Math.min(px, +h);
    return `${base}${Math.round((+w * hh) / +h)}x${hh}${suf}${ext}`;
  }
  if (/^https:\/\/play-lh\.googleusercontent\.com\//.test(url)) {
    const base = url.replace(/=[^/]*$/, '');
    return `${base}=${kind === 'icon' ? 's' : 'h'}${px}`;
  }
  return url;
}

/** 프로필 사진을 512px JPEG로 줄여요 (아이폰 사진도 2MB 제한 안에 들어오게) */
export async function shrinkImage(file: File, max = 512): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((ok, bad) => cv.toBlob((b) => (b ? ok(b) : bad(new Error('blob'))), 'image/jpeg', 0.86));
  } finally {
    URL.revokeObjectURL(url);
  }
}
