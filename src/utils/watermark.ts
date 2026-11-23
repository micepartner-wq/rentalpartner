// 상품·설치 사진을 올릴 때 우측 하단에 렌탈어때 로고를 자동으로 넣는다.
// 실패하면 원본을 그대로 올린다(업로드가 막히는 것보다 낫다). 이미 올라간 이미지는 바뀌지 않는다.
const LOGO_URL = '/logo.png';
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** 이보다 작은 이미지는 로고가 사진을 가리므로 넣지 않는다. */
export const WATERMARK_MIN_WIDTH = 400;
const LOGO_WIDTH_RATIO = 0.16;
const MARGIN_RATIO = 0.025;

export interface WatermarkLayout {
    logoWidth: number;
    logoHeight: number;
    padding: number;
    /** 로고 뒤 받침의 왼쪽 위 좌표와 크기 */
    plateX: number;
    plateY: number;
    plateWidth: number;
    plateHeight: number;
    logoX: number;
    logoY: number;
}

/** 이미지 크기와 로고 비율로 로고가 놓일 위치를 계산한다(우측 하단). */
export const getWatermarkLayout = (width: number, height: number, logoAspect: number): WatermarkLayout => {
    const logoWidth = Math.max(72, Math.round(width * LOGO_WIDTH_RATIO));
    const logoHeight = Math.round(logoWidth / logoAspect);
    const padding = Math.max(5, Math.round(logoWidth * 0.1));
    const margin = Math.round(width * MARGIN_RATIO);
    const plateWidth = logoWidth + padding * 2;
    const plateHeight = logoHeight + padding * 2;
    const plateX = width - margin - plateWidth;
    const plateY = height - margin - plateHeight;
    return { logoWidth, logoHeight, padding, plateX, plateY, plateWidth, plateHeight, logoX: plateX + padding, logoY: plateY + padding };
};

const loadLogo = () => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('로고 이미지를 불러오지 못했습니다.'));
    image.src = LOGO_URL;
});

const toBlob = (canvas: HTMLCanvasElement, type: string) => new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, type === 'image/png' ? undefined : 0.92);
});

export const watermarkImage = async (file: File): Promise<File> => {
    if (!SUPPORTED_TYPES.includes(file.type)) return file;
    try {
        const [bitmap, logo] = await Promise.all([createImageBitmap(file), loadLogo()]);
        if (bitmap.width < WATERMARK_MIN_WIDTH) { bitmap.close(); return file; }

        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (!context) { bitmap.close(); return file; }

        context.drawImage(bitmap, 0, 0);
        const layout = getWatermarkLayout(bitmap.width, bitmap.height, logo.naturalWidth / logo.naturalHeight);
        bitmap.close();

        // 짙은 남색 로고가 어두운 사진에서도 보이도록 반투명 흰 받침을 깐다.
        context.fillStyle = 'rgba(255,255,255,0.78)';
        context.beginPath();
        context.roundRect(layout.plateX, layout.plateY, layout.plateWidth, layout.plateHeight, layout.padding * 1.2);
        context.fill();
        context.globalAlpha = 0.95;
        context.drawImage(logo, layout.logoX, layout.logoY, layout.logoWidth, layout.logoHeight);
        context.globalAlpha = 1;

        const blob = await toBlob(canvas, file.type);
        if (!blob) return file;
        return new File([blob], file.name, { type: file.type, lastModified: Date.now() });
    } catch (error) {
        console.warn('워터마크를 넣지 못해 원본을 올립니다.', error);
        return file;
    }
};
