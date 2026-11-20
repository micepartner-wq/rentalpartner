const SAMPLE_SIZE = 40;
const BORDER = 2;
const CUTOUT_RATIO = 0.9;

/**
 * 이미지 테두리 픽셀로 "배경 없는 제품컷"인지 "배경이 있는 사진"인지 가른다.
 * 테두리가 (거의) 투명하거나 한 가지 밝은 색(흰색·밝은 회색 배경)이면 제품컷(true), 그렇지 않으면 사진(false).
 */
export const isPlainBackgroundImage = (data: ArrayLike<number>, size: number = SAMPLE_SIZE): boolean => {
  const border: Array<[number, number, number, number]> = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (x >= BORDER && y >= BORDER && x < size - BORDER && y < size - BORDER) continue;
      const i = (y * size + x) * 4;
      border.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
    }
  }
  if (border.length === 0) return false;

  const opaque = border.filter(([, , , a]) => a >= 30);
  const transparent = border.length - opaque.length;
  if (transparent / border.length >= CUTOUT_RATIO) return true;
  if (opaque.length === 0) return true;

  const mean = [0, 1, 2].map((c) => opaque.reduce((sum, p) => sum + p[c], 0) / opaque.length);
  const brightness = (mean[0] + mean[1] + mean[2]) / 3;
  const uniform = opaque.filter((p) => Math.max(...[0, 1, 2].map((c) => Math.abs(p[c] - mean[c]))) <= 24).length;
  // 투명 + 균일한 밝은 배경을 합쳐서 판단한다. 어두운 배경은 제품컷 취급하지 않는다.
  return brightness >= 200 && (transparent + uniform) / border.length >= CUTOUT_RATIO;
};

const cache = new Map<string, Promise<boolean | null>>();

/**
 * 이미지가 "배경이 있는 사진"인지 알아낸다(true). 배경 없는 제품컷이면 false, 분석할 수 없으면 null.
 * 이미지 서버가 CORS 를 허용하지 않으면 분석이 불가능해 null 을 돌려주고, 호출한 쪽은 기존 표시를 그대로 쓴다.
 */
export const detectPhotoBackground = (url: string): Promise<boolean | null> => {
  const cached = cache.get(url);
  if (cached) return cached;
  const result = new Promise<boolean | null>((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return; }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) { resolve(null); return; }
        context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        resolve(!isPlainBackgroundImage(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
  cache.set(url, result);
  return result;
};
