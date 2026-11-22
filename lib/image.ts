'use client';
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
